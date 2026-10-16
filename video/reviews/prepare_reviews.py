#!/usr/bin/env python3
"""Test-DB preparation for tutorial #13 "Reply to your reviews" (series part 10). pundo_test only.

Run with the BACKEND venv (DB settings from its .env):
    cd ~/dev/github/pundo_main_backend && .venv/bin/python \
        ~/dev/github/pundo_frontend/video/reviews/prepare_reviews.py [--dry-run] [en|el]

What it does (only on its own demo objects, never on other data):
1. Demo shops: the two Niko shops of tutorial #12 (owners from ../catalog-import/.recording-accounts.json, created by
   ../catalog-import/prepare_catalog_import.py). Refuses if they do not exist.
2. Articles: prepare_catalog_import.py resets BOTH Niko shops on every run, so usually only the shop of the last
   catalog recording has the 24 articles. If the target shop has none, the listings + offers of the other Niko shop are
   copied (same items, so the photos come along). Refuses if neither shop has articles.
3. Demo customers: 4 per language (Maria K., Andreas P., BestDeals24, Elena S.; Greek names in EL), credentials in
   .recording-accounts.json next to this file (gitignored, generated, never printed).
4. Reset: deletes ALL reviews written by these demo customers (both languages; replies, reports, photos and audit rows go
   with them via ON DELETE CASCADE, plus their photo folders on disk) and the "last seen" state of both Niko shops
   (shop_review_seen). Refuses if any other customer's review is in the target shop's scope (would appear in the video).
5. Creates the four reviews of the script for the target language: A/B/C on the shop (5/3/1 stars, A with the photo
   assets/review-tent.jpg, approved like the app stores it), D on the article "Water Filter Straw" (SKU NSS-WF-01).
   D is older than the shop's "last seen" mark, A-C are newer -> dashboard "3 new", list order A, B, C.
Prints {"shop": ..., "reviews": {...}} on the last line.
"""
from __future__ import annotations

import json
import os
import secrets
import shutil
import sys
from datetime import datetime, timedelta, timezone
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
OWNERS = HERE.parent / "catalog-import" / ".recording-accounts.json"
ACCOUNTS = HERE / ".recording-accounts.json"
PHOTO = HERE / "assets" / "review-tent.jpg"
PRODUCT_SKU = "NSS-WF-01"   # Water Filter Straw

CUSTOMERS = {   # key -> display name per language
    "a": {"en": "Maria K.", "el": "Μαρία Κ."},
    "b": {"en": "Andreas P.", "el": "Ανδρέας Π."},
    "c": {"en": "BestDeals24", "el": "BestDeals24"},
    "d": {"en": "Elena S.", "el": "Έλενα Σ."},
}
REVIEWS = {     # key -> (target, stars, age, text per language)
    "a": ("shop", 5, timedelta(hours=3), {
        "en": "Great advice on the tent! Niko took his time and showed us three models. "
              "Our first night on the beach was perfect.",
        "el": "Εξαιρετική εξυπηρέτηση για τη σκηνή! Ο Νίκος αφιέρωσε χρόνο και μας έδειξε τρία μοντέλα. "
              "Η πρώτη μας νύχτα στην παραλία ήταν τέλεια.",
    }),
    "b": ("shop", 3, timedelta(days=1, hours=4), {
        "en": "Good selection, but the camping stove I wanted was out of stock. I came by twice for nothing.",
        "el": "Καλή ποικιλία, αλλά το γκαζάκι κάμπινγκ που ήθελα δεν ήταν διαθέσιμο. Πήγα δύο φορές άδικα.",
    }),
    "c": ("shop", 1, timedelta(days=2, hours=6), {
        "en": "BEST PRICES ONLY AT www.bestdeals24.example !!! Click now and save 90% on everything 🔥🔥🔥",
        "el": "ΟΙ ΚΑΛΥΤΕΡΕΣ ΤΙΜΕΣ ΜΟΝΟ ΣΤΟ www.bestdeals24.example !!! Πάτα τώρα για -90% σε όλα 🔥🔥🔥",
    }),
    "d": ("product", 4, timedelta(days=6), {
        "en": "Works well, the water tastes clean. The caps are a bit fiddly though.",
        "el": "Δουλεύει καλά, το νερό έχει καθαρή γεύση. Τα καπάκια όμως είναι λίγο δύσχρηστα.",
    }),
}
SEEN_AGE = timedelta(days=5)   # between D (6 days) and C (2 days)

url = (os.environ.get("DATABASE_URL_TEST") or os.environ["DATABASE_URL"]).replace("postgresql+psycopg://", "postgresql://")
if not url.rstrip("/").endswith("/pundo_test"):
    sys.exit(f"refusing: not pundo_test ({url.rsplit('/', 1)[-1]})")
if not OWNERS.exists():
    sys.exit(f"refusing: {OWNERS} missing - run ../catalog-import/prepare_catalog_import.py first")
if not PHOTO.exists():
    sys.exit(f"missing photo {PHOTO}")

from core.auth.password import hash_password, verify_password  # noqa: E402
from ingestor.lib.image_variants import generate_variants  # noqa: E402

owners = json.loads(OWNERS.read_text())
photo_root = Path(os.environ.get("REVIEW_PHOTO_DIR", str(BACKEND / "review_photos")))

# ---- demo customer credentials (gitignored) --------------------------------------------------------------
accounts = json.loads(ACCOUNTS.read_text()) if ACCOUNTS.exists() else {}
changed = False
for lang in ("en", "el"):
    for key in CUSTOMERS:
        if key not in accounts.setdefault(lang, {}):
            accounts[lang][key] = {"email": f"video-reviews-{lang}-{key}@pundo-e2e.io", "password": secrets.token_urlsafe(18)}
            changed = True
if changed and not DRY:
    ACCOUNTS.write_text(json.dumps(accounts, indent=2) + "\n")
    os.chmod(ACCOUNTS, 0o600)

now = datetime.now(timezone.utc)

with psycopg.connect(url) as conn:
    cur = conn.cursor()

    # ---- 1. demo shops ---------------------------------------------------------------------------------------
    shops: dict[str, tuple[int, str, dict]] = {}
    for lang in ("en", "el"):
        cur.execute("""select s.id, s.slug, s.names from shop_owners o join shops s on s.id=o.shop_id
                       where o.email=%s""", (owners[lang]["email"],))
        r = cur.fetchone()
        if not r:
            sys.exit(f"refusing: demo shop for {lang} missing - run ../catalog-import/prepare_catalog_import.py {lang}")
        shops[lang] = r
    shop_id, shop_slug, shop_names = shops[LANG]
    other_id = shops["el" if LANG == "en" else "en"][0]

    # ---- 2. articles: copy from the other Niko shop if the target has none -------------------------------------
    cur.execute("select count(*) from shop_listings where shop_id=%s", (shop_id,))
    copied = 0
    if cur.fetchone()[0] == 0:
        cur.execute("select id, item_id, available, source, sku, is_published from shop_listings where shop_id=%s", (other_id,))
        src = cur.fetchall()
        if not src:
            sys.exit("refusing: neither Niko shop has articles - run ../catalog-import/prepare_catalog_import.py + import")
        for lid, item_id, available, source, sku, published in src:
            cur.execute("""insert into shop_listings (item_id, shop_id, available, source, sku, is_published)
                           values (%s,%s,%s,%s,%s,%s) returning id""", (item_id, shop_id, available, source, sku, published))
            new_lid = cur.fetchone()[0]
            cur.execute("""insert into offers (shop_listing_id, title, description, price_type, price_tiers, currency,
                               promo_valid_from, promo_valid_until, source, offer_url, archived, promo_price_type, promo_price_tiers)
                           select %s, title, description, price_type, price_tiers, currency, promo_valid_from, promo_valid_until,
                               source, offer_url, archived, promo_price_type, promo_price_tiers
                           from offers where shop_listing_id=%s""", (new_lid, lid))
            copied += 1
    cur.execute("""select sl.item_id, i.slug, i.names from shop_listings sl join items i on i.id=sl.item_id
                   where sl.shop_id=%s and sl.sku=%s""", (shop_id, PRODUCT_SKU))
    r = cur.fetchone()
    if not r:
        sys.exit(f"refusing: article {PRODUCT_SKU} not listed by {shop_slug}")
    product_id, product_slug, product_names = r
    cur.execute("""select count(*) from shop_listings sl where sl.shop_id=%s
                   and exists (select 1 from item_photos p where p.item_id=sl.item_id)""", (shop_id,))
    with_photos = cur.fetchone()[0]

    # ---- 3. demo customers (both languages) ----------------------------------------------------------------
    user_ids: dict[str, dict[str, int]] = {"en": {}, "el": {}}
    for lang in ("en", "el"):
        for key, names in CUSTOMERS.items():
            acc = accounts[lang][key]
            cur.execute("select id, password_hash from customer_users where email=%s", (acc["email"],))
            row = cur.fetchone()
            pw = row[1] if row and row[1] and verify_password(acc["password"], row[1]) else hash_password(acc["password"])
            if row:
                cur.execute("""update customer_users set display_name=%s, password_hash=%s, is_verified=true,
                               status='active', updated_at=now() where id=%s""", (names[lang], pw, row[0]))
                user_ids[lang][key] = row[0]
            else:
                cur.execute("""insert into customer_users (email, password_hash, display_name, provider, is_verified, status)
                               values (%s,%s,%s,'email',true,'active') returning id""", (acc["email"], pw, names[lang]))
                user_ids[lang][key] = cur.fetchone()[0]
    demo_users = [u for d in user_ids.values() for u in d.values()]

    # ---- 4. reset: reviews of the demo customers (cascade: photos, replies, reports, audit) + seen state -------
    cur.execute("select id from reviews where user_id = any(%s)", (demo_users,))
    old_reviews = [r[0] for r in cur.fetchall()]
    cur.execute("delete from reviews where user_id = any(%s)", (demo_users,))
    n_deleted = cur.rowcount
    cur.execute("delete from shop_review_seen where shop_id = any(%s)", ([shops["en"][0], shops["el"][0]],))

    cur.execute("""select r.id, r.entity_type, r.entity_id from reviews r
                   where r.user_id <> all(%s) and ((r.entity_type='shop' and r.entity_id=%s)
                     or (r.entity_type='product' and r.entity_id in (select item_id from shop_listings where shop_id=%s)))""",
                (demo_users, shop_id, shop_id))
    foreign = cur.fetchall()
    if foreign:
        conn.rollback()
        sys.exit(f"refusing: reviews of other customers in the scope of {shop_slug}: {foreign[:10]} (not touched)")

    # ---- 5. the four reviews -------------------------------------------------------------------------------
    created: dict[str, int] = {}
    for key, (target, stars, age, texts) in REVIEWS.items():
        entity_id = shop_id if target == "shop" else product_id
        ts = now - age
        cur.execute("""insert into reviews (user_id, entity_type, entity_id, stars, comment, is_visible, created_at, updated_at)
                       values (%s,%s,%s,%s,%s,true,%s,%s) returning id""",
                    (user_ids[LANG][key], target, entity_id, stars, texts[LANG], ts, ts))
        created[key] = cur.fetchone()[0]
        cur.execute("""insert into review_audit_log (review_id, action, actor_type, actor_id, reason, timestamp)
                       values (%s,'created','system',null,'video demo (prepare_reviews.py)',%s)""", (created[key], ts))
    cur.execute("insert into shop_review_seen (shop_id, last_seen_at) values (%s,%s)", (shop_id, now - SEEN_AGE))

    # photo of A: same variants and URLs as customer_photos.upload_photo, but directly approved
    rid = created["a"]
    cur.execute("""insert into review_photos (review_id, url, status, created_at) values (%s,'pending','approved',%s)
                   returning id""", (rid, now - REVIEWS["a"][2]))
    pid = cur.fetchone()[0]
    if DRY:
        conn.rollback()
    else:
        dest = photo_root / str(rid)
        v = generate_variants(src_bytes=PHOTO.read_bytes(), dest_dir=dest, stem=f"{pid}_{int(now.timestamp())}",
                              orig_ext=".jpg", url_prefix=f"/review_photos/{rid}")
        cur.execute("""update review_photos set url=%s, thumbnail_url=%s, orig_url=%s, thumb_url=%s, card_url=%s,
                       detail_url=%s, moderation_model='manual (video demo)', moderation_confidence=1.0,
                       moderated_at=%s where id=%s""",
                    (v["orig"], v.get("thumb"), v["orig"], v.get("thumb"), v.get("card"), v.get("detail"), now, pid))
        conn.commit()
        for old in old_reviews:   # photo folders of the deleted demo reviews (only those ids)
            d = photo_root / str(old)
            if d.is_dir():
                shutil.rmtree(d)

name = shop_names.get(LANG) or shop_names.get("en")
print(f"reviews reset [{LANG}]: shop {shop_slug} ({shop_id}), {with_photos} articles with photos"
      + (f" (copied {copied} listings from shop {other_id})" if copied else "")
      + f", removed {n_deleted} old demo reviews, created {created}" + (" [dry-run, rolled back]" if DRY else ""))
print(json.dumps({"shop": {"id": shop_id, "slug": shop_slug, "name": name},
                  "product": {"id": product_id, "slug": product_slug, "name": product_names.get("en")},
                  "reviews": created, "names": {k: v[LANG] for k, v in CUSTOMERS.items()}}, ensure_ascii=False))
