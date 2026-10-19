#!/usr/bin/env python3
"""Shared synthetic test data for the F8960 team videos (admin tour, claims, shops, products, CRM). pundo_test ONLY.

Run with the BACKEND venv (DB settings from its .env):
    cd ~/dev/github/pundo_main_backend && .venv/bin/python \
        ~/dev/github/pundo_frontend/video/team-common/prepare_team.py [--dry-run]

Everything is keyed on fixed demo keys (slug / e-mail / name) and upserted, so a second run changes nothing but
`updated_at`-free rows (idempotent). Nothing else in the DB is touched. Domain of all demo mails: @pundo-e2e.io.
What it creates / updates:
 1. Admin account e2e-admin@pundo-e2e.io (via scripts/seed_admin.py when missing, like e2e/global-setup.ts) and
    team-common/.recording-accounts.json {"admin": {email, password}} (gitignored, never printed).
 2. Shops "Team Demo Bakery" (owner@pundo-e2e.io, approved) and "Team Demo Pet Corner" (fictional Limassol addresses).
 3. An open claim on Pet Corner by claimant@pundo-e2e.io (pending shop owner without shop) + created-event.
 4. Brand "Team Demo Brand", demo category "Team Demo Category" (EN/EL names, below px-cooking) and the product
    "Team Demo Sourdough Loaf" with brand + category.
 5. CRM: org + contact "Team Demo Contact" (NEEDS_REVIEW) with channels contact@pundo-e2e.io / WhatsApp +35790000000.
Prints one JSON line (ids/slugs) on stdout.
"""
from __future__ import annotations

import json
import os
import secrets
import subprocess
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
ACCOUNTS = HERE / ".recording-accounts.json"
ADMIN_EMAIL = "e2e-admin@pundo-e2e.io"
ADMIN_PASSWORD_DEFAULT = "E2eAdminPassword!99"   # same constant as e2e/global-setup.ts (test seed)
DEMO_DOMAIN = "@pundo-e2e.io"
LOCATION = "SRID=4326;POINT(33.0226 34.6841)"   # Limassol centre (fictional addresses)

SHOPS = {
    "bakery": {"slug": "team-demo-bakery", "names": {"en": "Team Demo Bakery", "el": "Team Demo Αρτοποιείο"},
               "descriptions": {"en": "Fictional demo shop for the team videos."}, "address": "1 Demo Street", "type": "Bakery"},
    "pet": {"slug": "team-demo-pet-corner", "names": {"en": "Team Demo Pet Corner", "el": "Team Demo Pet Corner"},
            "descriptions": {"en": "Fictional demo shop for the team videos."}, "address": "2 Demo Street", "type": "Pet Shop"},
}
OWNER_EMAIL = "owner" + DEMO_DOMAIN
CLAIMANT_EMAIL = "claimant" + DEMO_DOMAIN
BRAND_SLUG = "team-demo-brand"
CATEGORY_EXTERNAL_ID = "px-team-demo"
CATEGORY_PARENT = "px-cooking"
CATEGORY_NAMES = {"en": "Team Demo Category", "el": "Team Demo Κατηγορία"}
ITEM_SLUG = "team-demo-sourdough-loaf"
ITEM_NAMES = {"en": "Team Demo Sourdough Loaf", "el": "Team Demo Προζυμένιο ψωμί"}
CRM_ORG = "Team Demo Bakery"
CRM_CONTACT = "Team Demo Contact"
CRM_EMAIL = "contact" + DEMO_DOMAIN
CRM_PHONE = "+35790000000"


def db_url() -> str:
    url = (os.environ.get("DATABASE_URL_TEST") or os.environ.get("DATABASE_URL") or "").replace("postgresql+psycopg://", "postgresql://")
    if not url.rstrip("/").endswith("/pundo_test"):
        sys.exit(f"refusing: not pundo_test ({url.rsplit('/', 1)[-1] or 'no DATABASE_URL'})")
    return url


def ensure_accounts() -> dict:
    acc = json.loads(ACCOUNTS.read_text()) if ACCOUNTS.exists() else {}
    admin = acc.get("admin") or {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD_DEFAULT}
    if not admin.get("email", "").endswith(DEMO_DOMAIN):
        sys.exit("refusing: admin recording account must be @pundo-e2e.io")
    acc["admin"] = admin
    if not DRY:
        ACCOUNTS.write_text(json.dumps(acc, indent=2) + "\n")
        ACCOUNTS.chmod(0o600)
    return admin


def ensure_admin(cur, admin: dict) -> int:
    cur.execute("select id from admin_users where email=%s", (admin["email"],))
    row = cur.fetchone()
    if row:
        return row[0]
    if DRY:
        return -1
    subprocess.run([sys.executable, str(BACKEND / "scripts/seed_admin.py"), "--email", admin["email"], "--password", admin["password"]],
                   cwd=BACKEND, check=True, stdout=subprocess.DEVNULL)
    cur.execute("select id from admin_users where email=%s", (admin["email"],))
    return cur.fetchone()[0]


def upsert_shop(cur, spec) -> int:
    cur.execute("select id, source from shops where slug=%s", (spec["slug"],))
    row = cur.fetchone()
    cur.execute("select id from shop_types where canonical=%s", (spec["type"],))
    st = cur.fetchone()
    fields = dict(status="active", names=Jsonb(spec["names"]), descriptions=Jsonb(spec["descriptions"]), address_line1=spec["address"],
                  city="Limassol", postal_code="3000", country_code="CY", is_online_only=False, source="manual",
                  shop_type_id=st[0] if st else None, provider_type="haendler")
    if row:
        sets = ", ".join(f"{k}=%s" for k in fields)
        cur.execute(f"update shops set {sets}, location=%s::geometry where id=%s and (source='manual')", (*fields.values(), LOCATION, row[0]))
        if cur.rowcount == 0:
            sys.exit(f"refusing: shop slug {spec['slug']} exists and is not ours")
        return row[0]
    cols = ", ".join(["slug", "location", *fields])
    cur.execute(f"insert into shops ({cols}) values (%s, %s::geometry, {', '.join(['%s'] * len(fields))}) returning id",
                (spec["slug"], LOCATION, *fields.values()))
    return cur.fetchone()[0]


def upsert_owner(cur, email: str, name: str, status: str, shop_id: int | None) -> int:
    assert email.endswith(DEMO_DOMAIN)
    cur.execute("select id from shop_owners where email=%s", (email,))
    row = cur.fetchone()
    if row:
        cur.execute("update shop_owners set name=%s, status=%s, shop_id=%s, email_verified_at=coalesce(email_verified_at, now()) "
                    "where id=%s and (name<>%s or status<>%s or shop_id is distinct from %s)",
                    (name, status, shop_id, row[0], name, status, shop_id))
        return row[0]
    # no password: the demo owners are never logged in as (the impersonation scenes only show the button)
    cur.execute("insert into shop_owners (email, name, status, email_verified_at, shop_id, onboarding_lang) "
                "values (%s,%s,%s,now(),%s,'en') returning id", (email, name, status, shop_id))
    return cur.fetchone()[0]


def upsert_claim(cur, shop_id: int, applicant_id: int) -> int:
    cur.execute("select id from claim_requests where shop_id=%s and applicant_owner_id=%s and status in ('open','verified')",
                (shop_id, applicant_id))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("""insert into claim_requests (shop_id, applicant_owner_id, kind, source, status, applicant_message, applicant_lang)
                   values (%s,%s,'claim','shop_page','open','Hello, I run this shop and would like to manage its page. (demo)','en') returning id""",
                (shop_id, applicant_id))
    claim_id = cur.fetchone()[0]
    cur.execute("insert into claim_request_events (claim_request_id, event_type, to_status, actor_type, actor_id, payload) "
                "values (%s,'created','open','applicant',%s,'{}'::jsonb)", (claim_id, applicant_id))
    return claim_id


def upsert_brand_category_item(cur) -> dict:
    cur.execute("select id, source from brands where slug=%s", (BRAND_SLUG,))
    row = cur.fetchone()
    if row:
        brand_id = row[0]
        if row[1] != "manual":
            sys.exit(f"refusing: brand {BRAND_SLUG} exists and is not ours")
    else:
        cur.execute("insert into brands (slug, names, country_code, source) values (%s,%s,'CY','manual') returning id",
                    (BRAND_SLUG, Jsonb({"en": "Team Demo Brand"})))
        brand_id = cur.fetchone()[0]

    cur.execute("select id, path from categories where taxonomy_type='unspsc' and external_id=%s", (CATEGORY_PARENT,))
    parent = cur.fetchone()
    if not parent:
        sys.exit(f"refusing: parent category {CATEGORY_PARENT} missing in pundo_test")
    cur.execute("select id from categories where taxonomy_type='unspsc' and external_id=%s", (CATEGORY_EXTERNAL_ID,))
    row = cur.fetchone()
    if row:
        cat_id = row[0]
    else:
        cur.execute("insert into categories (parent_id, taxonomy_type, external_id, level, path) values (%s,'unspsc',%s,'class',%s) returning id",
                    (parent[0], CATEGORY_EXTERNAL_ID, f"{parent[1]} > {CATEGORY_EXTERNAL_ID}"))
        cat_id = cur.fetchone()[0]
    for lang, name in CATEGORY_NAMES.items():
        cur.execute("insert into category_translations (category_id, lang, name, rtl) values (%s,%s,%s,false) "
                    "on conflict (category_id, lang) do update set name=excluded.name", (cat_id, lang, name))

    cur.execute("select id, source from items where slug=%s", (ITEM_SLUG,))
    row = cur.fetchone()
    if row:
        if row[1] != "admin":
            sys.exit(f"refusing: item slug {ITEM_SLUG} exists and is not ours")
        item_id = row[0]
        cur.execute("update items set status='active', item_type='product', names=%s, category_id=%s, brand_id=%s "
                    "where id=%s and (names<>%s or category_id is distinct from %s or brand_id is distinct from %s or status<>'active')",
                    (Jsonb(ITEM_NAMES), cat_id, brand_id, item_id, Jsonb(ITEM_NAMES), cat_id, brand_id))
    else:
        cur.execute("insert into items (slug, item_type, status, names, category_id, brand_id, source) values (%s,'product','active',%s,%s,%s,'admin') returning id",
                    (ITEM_SLUG, Jsonb(ITEM_NAMES), cat_id, brand_id))
        item_id = cur.fetchone()[0]
    return {"brand_id": brand_id, "category_id": cat_id, "item_id": item_id}


def upsert_crm(cur, shop_id: int) -> dict:
    from ingestor.lib.crm.suppression import compute_suppression_key   # needs CRM_SUPPRESSION_PEPPER (backend .env)
    cur.execute("select c.id, c.org_id from crm_contact c join crm_org o on o.id=c.org_id where o.name=%s and c.display_name=%s",
                (CRM_ORG, CRM_CONTACT))
    row = cur.fetchone()
    if row:
        contact_id, org_id = row
    else:
        cur.execute("select id from crm_org where shop_id=%s", (shop_id,))
        o = cur.fetchone()
        if o:
            org_id = o[0]
            cur.execute("update crm_org set name=%s, city='Limassol', category='Bakery' where id=%s", (CRM_ORG, org_id))
        else:
            cur.execute("insert into crm_org (name, city, category, business_status, shop_id) values (%s,'Limassol','Bakery','confirmed',%s) returning id",
                        (CRM_ORG, shop_id))
            org_id = cur.fetchone()[0]
        cur.execute("""insert into crm_contact (org_id, display_name, role_title, primary_source, lifecycle_state, needs_human)
                       values (%s,%s,'Owner (demo)','manual','NEEDS_REVIEW',true) returning id""", (org_id, CRM_CONTACT))
        contact_id = cur.fetchone()[0]
        cur.execute("insert into crm_contact_source (contact_id, source, source_ref, raw, ingest_via) values (%s,'manual','team-demo','{}'::jsonb,'prepare_team.py')",
                    (contact_id,))
    for kind, value, preferred in (("email", CRM_EMAIL, True), ("whatsapp", CRM_PHONE, False)):
        cur.execute("select 1 from crm_contact_channel where contact_id=%s and kind=%s", (contact_id, kind))
        if not cur.fetchone():
            cur.execute("insert into crm_contact_channel (contact_id, kind, value_normalized, value_hmac, is_preferred) values (%s,%s,%s,%s,%s)",
                        (contact_id, kind, value, compute_suppression_key(value), preferred))
    return {"contact_id": contact_id, "org_id": org_id}


def main() -> None:
    url = db_url()
    admin = ensure_accounts()
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        ensure_admin(cur, admin)
        shops = {k: upsert_shop(cur, s) for k, s in SHOPS.items()}
        owner = upsert_owner(cur, OWNER_EMAIL, "Team Demo Owner", "approved", shops["bakery"])
        claimant = upsert_owner(cur, CLAIMANT_EMAIL, "Team Demo Claimant", "pending", None)
        claim = upsert_claim(cur, shops["pet"], claimant)
        catalog = upsert_brand_category_item(cur)
        crm = upsert_crm(cur, shops["bakery"])
        out = {"shops": {k: {"id": shops[k], "slug": SHOPS[k]["slug"]} for k in shops}, "owner_id": owner, "claimant_id": claimant,
               "claim_id": claim, **catalog, "item_slug": ITEM_SLUG, "crm": crm, "marker": "Team Demo", "dry_run": DRY}
        if DRY:
            conn.rollback()
        else:
            conn.commit()
    print(json.dumps(out))


if __name__ == "__main__":
    main()
