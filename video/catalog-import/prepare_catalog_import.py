#!/usr/bin/env python3
"""Test-DB preparation for tutorial #12 "Import your whole catalogue at once". pundo_test only.

Run with the BACKEND venv (DB settings from its .env):
    cd ~/dev/github/pundo_main_backend && .venv/bin/python \
        ~/dev/github/pundo_frontend/video/catalog-import/prepare_catalog_import.py [--dry-run] [en|el]

What it does (only on its own demo objects, never on other data):
1. Demo accounts: reads video/catalog-import/.recording-accounts.json (gitignored); missing languages get a
   generated e-mail/password that is written back to that file. Credentials are never printed.
2. Creates or resets BOTH demo shops "Niko's Survival Shop" (EN) and "Το κατάστημα επιβίωσης του Νίκου" (EL),
   Larnaca, owner approved + verified: removes their listings/offers from earlier runs, the items those runs
   created (source 'shop_upload', no listing in any other shop), import previews/runs/status (incl. the Google
   Sheet link) and auto-assign skips. Both shops are reset on every run because the two recordings import the
   same file: items left over from the other language would turn every row into a "possible duplicate"
   (same name) or a catalogue link (same EAN).
3. Second demo shop "Outdoor Supplier (demo)" (inactive, never visible to customers) with the catalogue
   article "Victorinox Huntsman Pocket Knife", so the file row "Victorinox Huntsman Swiss Army Knife" shows up
   as a possible duplicate (similarity >= 85).
4. Check: runs the import's own similarity search and category suggester on the file rows and fails if the
   duplicate row has no candidate, any other row has one, or the suggestion row gets no category.
Prints {"shops": {lang: slug}, "check": {...}} on the last line.
"""
from __future__ import annotations

import json
import os
import secrets
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg.types.json import Jsonb

HERE = Path(__file__).resolve().parent
BACKEND = Path.cwd()
sys.path.insert(0, str(BACKEND))
load_dotenv(BACKEND / ".env")

DRY = "--dry-run" in sys.argv
LANG = next((a for a in sys.argv[1:] if a in ("en", "el")), "en")
ACCOUNTS = HERE / ".recording-accounts.json"
DATA = json.loads((HERE / "catalog-data.json").read_text())

SHOPS = {
    "en": {
        "slug": "niko-s-survival-shop",
        "names": {"en": "Niko's Survival Shop"},
        "descriptions": {"en": "Outdoor and survival gear in Larnaca: knives and multitools, lamps, tents, sleeping bags, first aid and more."},
    },
    "el": {
        "slug": "to-katastema-epiviosis-tou-nikou",
        "names": {"en": "Το κατάστημα επιβίωσης του Νίκου", "el": "Το κατάστημα επιβίωσης του Νίκου"},
        "descriptions": {"el": "Είδη outdoor και επιβίωσης στη Λάρνακα: μαχαίρια, πολυεργαλεία, φακοί, σκηνές, υπνόσακοι, πρώτες βοήθειες και άλλα."},
    },
}
ADDRESS = "Ermou 50, 6022 Larnaca, Cyprus"
LOCATION = "SRID=4326;POINT(33.6292 34.9165)"
HOURS = {str(d): {"open": "09:00", "close": "19:00", "closed": False} for d in range(5)}
HOURS["5"] = {"open": "09:00", "close": "14:00", "closed": False}
HOURS["6"] = None

SUPPLIER_SLUG = "video-demo-outdoor-supplier"
CATALOG_SLUG = "victorinox-huntsman-pocket-knife"
CATALOG_NAMES = {
    "en": "Victorinox Huntsman Pocket Knife",
    "de": "Victorinox Huntsman Taschenmesser",
    "el": "Σουγιάς τσέπης Victorinox Huntsman",
}
CATALOG_CATEGORY = 7695  # Google "Multifunction Tools & Knives"

url = (os.environ.get("DATABASE_URL_TEST") or os.environ["DATABASE_URL"]).replace("postgresql+psycopg://", "postgresql://")
if not url.rstrip("/").endswith("/pundo_test"):
    sys.exit(f"refusing: not pundo_test ({url.rsplit('/', 1)[-1]})")

from core.auth.password import hash_password, verify_password  # noqa: E402

# ---- 1. accounts -----------------------------------------------------------------------------------------
accounts = json.loads(ACCOUNTS.read_text()) if ACCOUNTS.exists() else {}
changed = False
for lang in SHOPS:
    if lang not in accounts:
        accounts[lang] = {
            "email": f"video-catalog-import-{lang}@pundo-e2e.io",
            "password": secrets.token_urlsafe(18),
        }
        changed = True
if changed and not DRY:
    ACCOUNTS.write_text(json.dumps(accounts, indent=2) + "\n")
    os.chmod(ACCOUNTS, 0o600)

with psycopg.connect(url) as conn:
    cur = conn.cursor()

    # ---- 2. demo shops + owners ----------------------------------------------------------------------------
    shop_ids: dict[str, int] = {}
    for lang, spec in SHOPS.items():
        acc = accounts[lang]
        cur.execute("select id, shop_id, password_hash from shop_owners where email=%s", (acc["email"],))
        owner = cur.fetchone()
        shop_id = owner[1] if owner else None
        if shop_id is None:
            cur.execute("select id from shops where slug=%s", (spec["slug"],))
            r = cur.fetchone()
            if r:  # slug taken by a shop that is not ours -> never touch it
                cur.execute("select count(*) from shop_owners where shop_id=%s", (r[0],))
                if cur.fetchone()[0]:
                    sys.exit(f"refusing: slug {spec['slug']} belongs to another owner")
                shop_id = r[0]
        fields = dict(
            status="active", names=Jsonb(spec["names"]), descriptions=Jsonb(spec["descriptions"]),
            address_line1=ADDRESS, city="Larnaca", postal_code="6022", country_code="CY", phone="+357 24 000 000",
            opening_hours=Jsonb(HOURS), is_online_only=False, spoken_languages=Jsonb(["EN", "EL"]),
            provider_type="haendler", is_b2c_storefront=True, payment_methods=["cash", "card"],
        )
        if shop_id is None:
            cols = ", ".join(["slug", "location", *fields])
            vals = ", ".join(["%s", "%s::geometry", *["%s"] * len(fields)])
            cur.execute(f"insert into shops ({cols}) values ({vals}) returning id",
                        (spec["slug"], LOCATION, *fields.values()))
            shop_id = cur.fetchone()[0]
        else:
            sets = ", ".join([f"{k}=%s" for k in fields] + ["location=%s::geometry", "updated_at=now()"])
            cur.execute(f"update shops set {sets} where id=%s", (*fields.values(), LOCATION, shop_id))
        pw_hash = owner[2] if owner and owner[2] and verify_password(acc["password"], owner[2]) else hash_password(acc["password"])
        owner_name = spec["names"].get(lang) or spec["names"]["en"]
        if owner:
            cur.execute("""update shop_owners set shop_id=%s, password_hash=%s, name=%s, status='approved',
                           email_verified_at=coalesce(email_verified_at, now()), onboarding_lang=%s, updated_at=now()
                           where id=%s""", (shop_id, pw_hash, owner_name, lang, owner[0]))
        else:
            cur.execute("""insert into shop_owners (email, password_hash, name, status, email_verified_at, shop_id,
                           onboarding_lang, welcome_email_sent_at) values (%s,%s,%s,'approved',now(),%s,%s,now())""",
                        (acc["email"], pw_hash, owner_name, shop_id, lang))
        shop_ids[lang] = shop_id

    # reset: listings/offers, items created by earlier runs, import state
    ids = list(shop_ids.values())
    cur.execute("select distinct item_id from shop_listings where shop_id = any(%s)", (ids,))
    touched_items = [r[0] for r in cur.fetchall()]
    cur.execute("delete from offers where shop_listing_id in (select id from shop_listings where shop_id = any(%s))", (ids,))
    n_offers = cur.rowcount
    cur.execute("delete from shop_listings where shop_id = any(%s)", (ids,))
    n_listings = cur.rowcount
    cur.execute("""delete from items i where i.id = any(%s) and i.source='shop_upload'
                   and not exists (select 1 from shop_listings sl where sl.item_id=i.id)""", (touched_items,))
    n_items = cur.rowcount
    cur.execute("delete from import_previews where shop_id = any(%s)", (ids,))
    cur.execute("delete from import_runs where shop_id = any(%s)", (ids,))
    cur.execute("delete from import_status where shop_id = any(%s)", (ids,))
    cur.execute("delete from auto_assign_skips where shop_id = any(%s)", (ids,))

    # ---- 3. second demo shop + catalogue article for the duplicate ---------------------------------------
    cur.execute("select id from shops where slug=%s", (SUPPLIER_SLUG,))
    r = cur.fetchone()
    if r:
        supplier_id = r[0]
        cur.execute("update shops set status='inactive', updated_at=now() where id=%s", (supplier_id,))
    else:
        cur.execute("""insert into shops (slug, status, names, country_code, city, is_online_only, location, provider_type)
                       values (%s, 'inactive', %s, 'CY', 'Larnaca', false, %s::geometry, 'haendler') returning id""",
                    (SUPPLIER_SLUG, Jsonb({"en": "Outdoor Supplier (demo)"}), LOCATION))
        supplier_id = cur.fetchone()[0]
    cur.execute("select id, source from items where slug=%s", (CATALOG_SLUG,))
    r = cur.fetchone()
    if r and r[1] != "admin":
        sys.exit(f"refusing: item slug {CATALOG_SLUG} exists and is not ours")
    if r:
        catalog_item = r[0]
        cur.execute("""update items set status='active', item_type='product', names=%s, category_id=%s, ean=null,
                       updated_at=now() where id=%s""", (Jsonb(CATALOG_NAMES), CATALOG_CATEGORY, catalog_item))
    else:
        cur.execute("""insert into items (slug, item_type, status, names, category_id, source)
                       values (%s, 'product', 'active', %s, %s, 'admin') returning id""",
                    (CATALOG_SLUG, Jsonb(CATALOG_NAMES), CATALOG_CATEGORY))
        catalog_item = cur.fetchone()[0]
    # photos of the catalogue article come only from earlier imports (Niko's row adds one) -> start without
    cur.execute("delete from item_photos where item_id=%s", (catalog_item,))
    cur.execute("select 1 from shop_listings where shop_id=%s and item_id=%s", (supplier_id, catalog_item))
    if not cur.fetchone():
        cur.execute("""insert into shop_listings (item_id, shop_id, available, source, sku, is_published)
                       values (%s, %s, true, 'shop_manual', 'VX-HUNTSMAN', true)""", (catalog_item, supplier_id))

    # ---- 4. check with the import's own matching (same transaction, sees the reset state) ----------------
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    conn.commit() if not DRY else None
    check: dict = {}
    if not DRY:
        from ingestor.ingestion.category_picker import CategorySuggester
        from ingestor.ingestion.item_search import find_similar_items_batch

        engine = create_engine(url.replace("postgresql://", "postgresql+psycopg://"))
        with Session(engine) as s:
            rows = DATA["rows"]
            hits = find_similar_items_batch([(r["name"], "en") for r in rows], s, max_per_query=3)
            dup = {r["sku"]: h for r, h in zip(rows, hits) if h}
            sug = CategorySuggester.for_shop(s, shop_ids[LANG], LANG)
            no_cat = {r["sku"]: (sug.suggest(r["name"]) is not None) for r in rows if not r["category"]}
            unresolved = [r["sku"] for r in rows if r["category"] and sug.resolve_hint(r["category"]) is None]
        engine.dispose()
        check = {"duplicates": {k: [[i, sc] for i, sc in v] for k, v in dup.items()}, "suggested": no_cat,
                 "unknown_categories": unresolved}
        problems = []
        if list(dup) != [DATA["duplicate_sku"]] or dup[DATA["duplicate_sku"]][0][0] != catalog_item:
            problems.append(f"duplicates {check['duplicates']} (expected only {DATA['duplicate_sku']} -> item {catalog_item})")
        if not no_cat.get(DATA["suggest_sku"]):
            problems.append(f"no category suggestion for {DATA['suggest_sku']}")
        if unresolved:
            problems.append(f"categories not known: {unresolved}")
        if problems:
            sys.exit("check failed: " + "; ".join(problems))
    else:
        conn.rollback()

print(f"catalog-import reset: shops {shop_ids}, removed {n_listings} listings / {n_offers} offers / {n_items} items, "
      f"catalogue article {catalog_item} in shop {supplier_id}" + (" [dry-run, rolled back]" if DRY else ""))
print(json.dumps({"shops": {k: v["slug"] for k, v in SHOPS.items()}, "check": check}))
