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
 4. Brand "Team Demo Brand" (id 1) and demo category (id -1; ids chosen so that they fall into the first-1000 window the admin
    product form / list loads, see _move_brand_to_reachable_id), demo category "Team Demo Category" (EN/EL names, below px-cooking) and the product
    "Team Demo Sourdough Loaf" with brand + category.
 5. CRM: org + contact "Team Demo Contact" (NEEDS_REVIEW) with channels contact@pundo-e2e.io / WhatsApp +35790000000.
    Claims video (team-claims-owners): a third shop "Team Demo Flower Corner" and a second applicant
    (claimant2@pundo-e2e.io) with a second claim; BOTH demo claims are RESET to "open" on every run (the video
    accepts the first and rejects the second), together with their applicants (pending, no shop).
Shops video (team-shops): the video CREATES the shop "Team Demo Taverna" through the admin form. prepare_team.py therefore
    DELETES it again at the start of every run (only the row with slug team-demo-taverna AND name "Team Demo Taverna";
    cascades only touch rows that hang on this one demo shop), so the next recording starts without a duplicate. The
    video also edits "Team Demo Bakery" (address); the upsert above puts the address back.
Products video (team-products): the video CREATES the product "Team Demo Rye Bread" through the admin form (brand + category of the
    demo set above). prepare_team.py DELETES it again at the start of every run (only slug team-demo-rye-bread AND English
    name "Team Demo Rye Bread" AND source admin). The video also edits "Team Demo Sourdough Loaf" (name gets a size; the admin
    form PATCH replaces `names` with the English text only) - the upsert above puts both languages back.
Translations video (team-translations): the video types a German name into the translation table of "Team Demo Category" and saves it
    (PUT /admin/categories/{id}/translations). prepare_team.py therefore deletes every translation of the demo category except
    en + el at the start of every run (only that one demo category) and re-sets the en/el names.
CRM video (team-crm): the video edits the demo contact "Team Demo Contact" (adds a phone channel, moves it NEEDS_REVIEW -> SOURCED via
    "Set state") and CREATES the contact "Team Demo Maria" (organisation "Team Demo Cafe") through the admin form. prepare_team.py
    therefore (a) puts the demo contact back at the start of every run: state NEEDS_REVIEW, needs_human, version 1, only the two
    seeded channels, no interactions/messages, updated_at = now() (so it heads the list); and (b) DELETES the created contact again
    (exact display name + exact organisation name + source `manual`, with its channels/sources/interactions/messages and its
    organisation when nothing else hangs on it). The video never suppresses a contact (suppression cannot be undone) and never
    sends a message.
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
    "flower": {"slug": "team-demo-flower-corner", "names": {"en": "Team Demo Flower Corner", "el": "Team Demo Flower Corner"},
               "descriptions": {"en": "Fictional demo shop for the team videos."}, "address": "3 Demo Street", "type": "Florist"},
    "pet": {"slug": "team-demo-pet-corner", "names": {"en": "Team Demo Pet Corner", "el": "Team Demo Pet Corner"},
            "descriptions": {"en": "Fictional demo shop for the team videos."}, "address": "2 Demo Street", "type": "Pet Shop"},
}
NEW_SHOP = {"slug": "team-demo-taverna", "name": "Team Demo Taverna"}   # created by the shops video, removed again here
NEW_ITEM = {"slug": "team-demo-rye-bread", "name": "Team Demo Rye Bread"}   # created by the products video, removed again here
OWNER_EMAIL = "owner" + DEMO_DOMAIN
CLAIMANT_EMAIL = "claimant" + DEMO_DOMAIN
CLAIMANT2_EMAIL = "claimant2" + DEMO_DOMAIN
CLAIM_MESSAGES = {
    "pet": "Hello, I run this shop and would like to manage its page. (demo)",
    "flower": "Hi, I would like to manage this shop page. (demo)",
}
BRAND_SLUG = "team-demo-brand"
DEMO_BRAND_ID = 1        # inside the first-1000 window of the admin forms (see _move_brand_to_reachable_id)
DEMO_CATEGORY_ID = -1
CATEGORY_EXTERNAL_ID = "px-team-demo"
CATEGORY_PARENT = "px-cooking"
CATEGORY_NAMES = {"en": "Team Demo Category", "el": "Team Demo Κατηγορία"}
ITEM_SLUG = "team-demo-sourdough-loaf"
ITEM_NAMES = {"en": "Team Demo Sourdough Loaf", "el": "Team Demo Προζυμένιο ψωμί"}
CRM_ORG = "Team Demo Bakery"
CRM_CONTACT = "Team Demo Contact"
CRM_EMAIL = "contact" + DEMO_DOMAIN
CRM_PHONE = "+35790000000"
NEW_CONTACT = {"display_name": "Team Demo Maria", "org": "Team Demo Cafe"}   # created by the CRM video, removed again here


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


def remove_created_demo_shop(cur) -> int:
    """Delete the shop the shops video created (exact slug + exact English name, so no real shop can match). Returns the count."""
    cur.execute("delete from shops where slug=%s and names->>'en'=%s", (NEW_SHOP["slug"], NEW_SHOP["name"]))
    return cur.rowcount


def remove_created_demo_item(cur) -> int:
    """Delete the product the products video created (exact slug + exact English name + source admin). Returns the count."""
    cur.execute("delete from items where slug=%s and names->>'en'=%s and source='admin'", (NEW_ITEM["slug"], NEW_ITEM["name"]))
    return cur.rowcount


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


def upsert_claim(cur, shop_id: int, applicant_id: int, domain_match: bool, message: str) -> int:
    """One demo claim per (shop, applicant), always RESET to the initial "open" state (idempotent re-record):
    the video accepts / rejects it, the next run puts it back (events except `created` are removed)."""
    cur.execute("select id from claim_requests where shop_id=%s and applicant_owner_id=%s order by id", (shop_id, applicant_id))
    ids = [r[0] for r in cur.fetchall()]
    if ids:
        claim_id = ids[0]
        if len(ids) > 1:
            cur.execute("delete from claim_requests where id = any(%s)", (ids[1:],))
        cur.execute("""update claim_requests set status='open', kind='claim', source='shop_page', rejection_reason=null,
                       proof_method='email_domain', email_domain_match=%s, proof_verified_at=null, proof_verified_by=null,
                       code_purpose=null, code_hash=null, code_expires_at=null, code_failed_attempts=0,
                       callback_outcome=null, callback_at=null, decided_by_admin_id=null, decided_at=null, decision_reason=null,
                       previous_owner_id=null, notify_previous_owner=null, offers_flagged_count=null, withdrawn_consent_id=null,
                       cancelled_case_ids=null, deactivated_shop_id=null, applicant_message=%s, applicant_prior_status=null
                       where id=%s""", (domain_match, message, claim_id))
        cur.execute("delete from claim_request_events where claim_request_id=%s and event_type<>'created'", (claim_id,))
        cur.execute("select 1 from claim_request_events where claim_request_id=%s and event_type='created'", (claim_id,))
        if cur.fetchone():
            return claim_id
    else:
        cur.execute("""insert into claim_requests (shop_id, applicant_owner_id, kind, source, status, applicant_message, applicant_lang,
                       proof_method, email_domain_match)
                       values (%s,%s,'claim','shop_page','open',%s,'en','email_domain',%s) returning id""",
                    (shop_id, applicant_id, message, domain_match))
        claim_id = cur.fetchone()[0]
    cur.execute("insert into claim_request_events (claim_request_id, event_type, to_status, actor_type, actor_id, payload) "
                "values (%s,'created','open','applicant',%s,'{}'::jsonb)", (claim_id, applicant_id))
    return claim_id


def _move_brand_to_reachable_id(cur) -> int:
    """Admin lists/forms only load the first 1000 brands / categories ordered by id (getAllBrands / getAllCategories in
    system-admin-api.ts; pundo_test has 2074 brands, 8508 categories). A demo row with a high id is therefore neither selectable in
    the product form nor named in the product list (raw id shown). The demo rows live at ids inside that window (brand id 1,
    category id -1; both unused in pundo_test) so the videos can show the real flow. Rows are moved once (copy, repoint, delete)."""
    cur.execute("select id, source from brands where slug=%s", (BRAND_SLUG,))
    row = cur.fetchone()
    if row and row[0] == DEMO_BRAND_ID:
        return DEMO_BRAND_ID
    if row and row[1] != "manual":
        sys.exit(f"refusing: brand {BRAND_SLUG} exists and is not ours")
    cur.execute("select 1 from brands where id=%s", (DEMO_BRAND_ID,))
    if cur.fetchone():
        sys.exit(f"refusing: brand id {DEMO_BRAND_ID} is taken by another row")
    if row:
        cur.execute("update brands set slug=%s where id=%s", (BRAND_SLUG + "-moving", row[0]))
    cur.execute("insert into brands (id, slug, names, country_code, source) values (%s,%s,%s,'CY','manual')",
                (DEMO_BRAND_ID, BRAND_SLUG, Jsonb({"en": "Team Demo Brand"})))
    if row:
        cur.execute("update items set brand_id=%s where brand_id=%s", (DEMO_BRAND_ID, row[0]))
        cur.execute("delete from brands where id=%s", (row[0],))
    return DEMO_BRAND_ID


def _move_category_to_reachable_id(cur, parent) -> int:
    cur.execute("select id from categories where taxonomy_type='unspsc' and external_id=%s", (CATEGORY_EXTERNAL_ID,))
    row = cur.fetchone()
    if row and row[0] == DEMO_CATEGORY_ID:
        return DEMO_CATEGORY_ID
    cur.execute("select 1 from categories where id=%s", (DEMO_CATEGORY_ID,))
    if cur.fetchone():
        sys.exit(f"refusing: category id {DEMO_CATEGORY_ID} is taken by another row")
    if row:
        cur.execute("update categories set external_id=%s where id=%s", (CATEGORY_EXTERNAL_ID + "-moving", row[0]))
    cur.execute("insert into categories (id, parent_id, taxonomy_type, external_id, level, path) values (%s,%s,'unspsc',%s,'class',%s)",
                (DEMO_CATEGORY_ID, parent[0], CATEGORY_EXTERNAL_ID, f"{parent[1]} > {CATEGORY_EXTERNAL_ID}"))
    if row:
        cur.execute("update items set category_id=%s where category_id=%s", (DEMO_CATEGORY_ID, row[0]))
        cur.execute("delete from category_translations where category_id=%s", (row[0],))
        cur.execute("delete from categories where id=%s", (row[0],))
    return DEMO_CATEGORY_ID


def upsert_brand_category_item(cur) -> dict:
    brand_id = _move_brand_to_reachable_id(cur)

    cur.execute("select id, path from categories where taxonomy_type='unspsc' and external_id=%s", (CATEGORY_PARENT,))
    parent = cur.fetchone()
    if not parent:
        sys.exit(f"refusing: parent category {CATEGORY_PARENT} missing in pundo_test")
    cat_id = _move_category_to_reachable_id(cur, parent)
    for lang, name in CATEGORY_NAMES.items():
        cur.execute("insert into category_translations (category_id, lang, name, rtl) values (%s,%s,%s,false) "
                    "on conflict (category_id, lang) do update set name=excluded.name", (cat_id, lang, name))
    # the translations video adds further languages by hand: back to the demo state (en + el) so every recording starts equal
    cur.execute("delete from category_translations where category_id=%s and lang <> all(%s)", (cat_id, list(CATEGORY_NAMES)))

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
    _reset_crm_demo_contact(cur, contact_id)
    return {"contact_id": contact_id, "org_id": org_id}


def _reset_crm_demo_contact(cur, contact_id: int) -> None:
    """Back to the seeded state after the CRM video (state NEEDS_REVIEW, two channels, no interactions/messages)."""
    cur.execute("delete from crm_message where contact_id=%s", (contact_id,))
    cur.execute("delete from crm_interaction where contact_id=%s", (contact_id,))
    cur.execute("delete from crm_contact_channel where contact_id=%s and value_normalized <> all(%s)", (contact_id, [CRM_EMAIL, CRM_PHONE]))
    cur.execute("update crm_contact set lifecycle_state='NEEDS_REVIEW', needs_human=true, version=1, updated_at=now() where id=%s", (contact_id,))


def remove_created_demo_contact(cur) -> int:
    """Delete the contact the CRM video created (exact display name + exact organisation name + source manual). Returns the count."""
    cur.execute("select c.id, c.org_id from crm_contact c join crm_org o on o.id=c.org_id "
                "where c.display_name=%s and o.name=%s and c.primary_source='manual'", (NEW_CONTACT["display_name"], NEW_CONTACT["org"]))
    rows = cur.fetchall()
    for cid, org_id in rows:
        for table in ("crm_message", "crm_interaction", "crm_contact_source", "crm_contact_channel"):
            cur.execute(f"delete from {table} where contact_id=%s", (cid,))
        cur.execute("update crm_card_vision_job set contact_id=null where contact_id=%s", (cid,))
        cur.execute("delete from crm_contact where id=%s", (cid,))
        cur.execute("delete from crm_org where id=%s and shop_id is null and not exists (select 1 from crm_contact where org_id=%s)", (org_id, org_id))
    return len(rows)


def main() -> None:
    url = db_url()
    admin = ensure_accounts()
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        ensure_admin(cur, admin)
        removed = remove_created_demo_shop(cur)
        removed_item = remove_created_demo_item(cur)
        removed_contact = remove_created_demo_contact(cur)
        shops = {k: upsert_shop(cur, s) for k, s in SHOPS.items()}
        owner = upsert_owner(cur, OWNER_EMAIL, "Team Demo Owner", "approved", shops["bakery"])
        claimant = upsert_owner(cur, CLAIMANT_EMAIL, "Team Demo Claimant", "pending", None)
        claimant2 = upsert_owner(cur, CLAIMANT2_EMAIL, "Team Demo Applicant Two", "pending", None)
        claim = upsert_claim(cur, shops["pet"], claimant, True, CLAIM_MESSAGES["pet"])
        claim2 = upsert_claim(cur, shops["flower"], claimant2, False, CLAIM_MESSAGES["flower"])
        catalog = upsert_brand_category_item(cur)
        crm = upsert_crm(cur, shops["bakery"])
        out = {"shops": {k: {"id": shops[k], "slug": SHOPS[k]["slug"]} for k in shops}, "owner_id": owner, "claimant_id": claimant, "claimant2_id": claimant2,
               "claim_id": claim, "claim2_id": claim2, **catalog, "item_slug": ITEM_SLUG, "crm": crm, "marker": "Team Demo",
               "new_shop": {**NEW_SHOP, "removed_from_last_run": removed},
               "new_item": {**NEW_ITEM, "removed_from_last_run": removed_item},
               "new_contact": {**NEW_CONTACT, "removed_from_last_run": removed_contact}, "dry_run": DRY}
        if DRY:
            conn.rollback()
        else:
            conn.commit()
    print(json.dumps(out))


if __name__ == "__main__":
    main()
