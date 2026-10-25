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
    "Team Demo Sourdough Loaf" with brand + category, names + descriptions in all six languages and a fictional barcode.
    Earlier versions parked brand and category at the ids 1 / -1 (the admin forms loaded only the first 1000 rows, B8200-004);
    since the forms page through everything they live at NORMAL ids again: an existing row at the old id is moved once
    (copy to a new id, repoint items, delete; refuses when anything else references it) - see _ensure_normal_ids. The ids are
    printed in the JSON line (brand_id / category_id) and the recorders compare them with the address bars of scenes.yml.
 5. CRM (model after the F7600 org cut: lead status at the organisation, channels with exactly one owner, relations person x
    organisation; see upsert_crm): head office "Team Demo Bakery" (org of the demo shop, lead status NEEDS_REVIEW), its branch
    "Team Demo Bakery Larnaca" (QUEUED), the employer "Team Demo Accounting Office" (no lead status), the people "Petros Team Demo"
    (first/last name, salutation, birthday without year, two "Manager" relations with note "Region West", a red relation e-mail),
    "Team Demo Nikos" (free name, relation without role) and "Team Demo Eleni" (opted out). Everything is RESET on every run.
    Claims video (team-claims-owners): a third shop "Team Demo Flower Corner" and a second applicant
    (claimant2@pundo-e2e.io) with a second claim; BOTH demo claims are RESET to "open" on every run (the video
    accepts the first and rejects the second), together with their applicants (pending, no shop).
Shops video (team-shops): the video CREATES the shop "Team Demo Taverna" through the admin form. prepare_team.py therefore
    DELETES it again at the start of every run (only the row with slug team-demo-taverna AND name "Team Demo Taverna";
    cascades only touch rows that hang on this one demo shop), so the next recording starts without a duplicate. The
    video also edits "Team Demo Bakery" (address); the upsert above puts the address back.
Products video (team-products): the video CREATES the product "Team Demo Rye Bread" through the admin form (brand + category of the
    demo set above). prepare_team.py DELETES it again at the start of every run (only slug team-demo-rye-bread AND English
    name "Team Demo Rye Bread" AND source admin). The video also edits "Team Demo Sourdough Loaf" (English name gets a size; since B8000-003/004
    the PATCH merges per language, so the other five stay) - the upsert above puts all six names back.
Translations video (team-translations) and products video: both type a name into the translation table of "Team Demo Category" and
    save it (PUT /admin/categories/{id}/translations; products: Russian, translations: German). prepare_team.py therefore deletes every
    translation of the demo category except en + el at the start of every run (only that one demo category) and re-sets the en/el names.
Catalog basics video (team-catalog-basics): the video CREATES the brand "Team Demo Brand Two" through the admin form (slug team-demo-brand-two,
    prefilled from the name) and renames nothing else but the German name of "Team Demo Category" (the language reset above puts it back).
    prepare_team.py DELETES the created brand again at the start of every run (only slug team-demo-brand-two AND English name
    "Team Demo Brand Two" AND source NULL, as the admin form writes it, AND no item points to it).
CRM video (team-crm): the video CREATES the organisation "Team Demo Cafe" (acquisition target, cafe@pundo-e2e.io) through the admin
    form, clicks "Confirm business" on "Team Demo Bakery" (NEEDS_REVIEW -> QUEUED), loads an outreach preview and APPROVES one send to
    the red relation e-mail of Petros (crm_send_approval + an interaction note). prepare_team.py therefore (a) puts the three demo
    organisations back at the start of every run (lead status, needs_human, lead_version 1, business status, legal tier green, head office
    link, only the seeded channels, no interactions/messages/approvals/review rows, updated_at = now() so they head the list) and (b)
    DELETES the created organisation again (exact name + no shop + primary source `manual`, with its channels/sources/interactions/
    messages/relations). The video never sends (the recorder blocks outreach/send), never suppresses, never changes the settings.
CRM people video (team-crm-persons): the people are found by their seeded personal e-mail (stable ids for the address bar) and reset on
    every run (names, salutation, birthday, opt-out, personal channels; ALL their relations are deleted and the seeded four recreated,
    relation channels and roles cascade). The video adds a relation of Petros to the employer (no role, then a role, then ends it),
    replaces the free name of Nikos by first/last name, makes info.bakery@ the preferred channel of a relation and CREATES the person
    "Anna Team Demo" (personal e-mail anna@pundo-e2e.io). prepare_team.py DELETES Anna again (display name "Anna Team Demo" or the
    former "Team Demo Anna" AND her personal e-mail; channels/relations cascade). No suppression, no mail.
    All CRM demo values are @pundo-e2e.io addresses or the fictional numbers +357900000xx. The objection of "Team Demo Eleni" is set
    through the backend's PersonService.opt_out (object_via_service, after the commit), so her two values (eleni@, eleni.bakery@) are on
    crm_suppression like after a real objection; nothing else is ever written to crm_suppression.
Moderation video (team-moderation): synthetic review + social-link rule (marker "Team Demo", authors only @pundo-e2e.io):
    review by "Team Demo Reviewer" on the demo shop "Team Demo Bakery" (spam-like demo text), reported by a second demo customer
    (reporter@pundo-e2e.io) AND by the demo shop (shop-owner report), plus the audit entries "created" / "reported" / "reported".
    It is RESET on every run (visible again, newest review, audit log = the three seeded entries, no reply); the video hides and
    restores it. The video also CREATES the social-link rule team-demo-blocked.com (source admin, note "Team Demo ..."):
    prepare_team.py DELETES it again at the start of every run (exact host + source admin + note starting with "Team Demo").
    Hiding / restoring a review sends no e-mail (ingestor/api/admin/customer_reviews.py), the demo users have no real mailbox anyway.
Catalog quality video (team-catalog-quality): the video CREATES one attribute definition on the demo category (key team_demo_size, English
    label "Team Demo Size") through the admin form and ONE item-domain mapping of the demo service "Team Demo Service" (item type service, slug
    team-demo-service, source admin; upserted here) with auto_assign OFF, so no onboarding of a real shop in pundo_test can pick the demo service up.
    prepare_team.py DELETES both again at the start of every run: the definition (exact demo category id + exact key + English label starting
    "Team Demo"; nothing references category_attribute_definitions, no FK, and creating/deleting a definition never touches item_attributes, see
    ingestor/api/admin/category_attribute_defs.py:77-117) and every mapping of the demo service item (item_id = the demo service; the table has no
    other dependants, auto_assign_skips are keyed per shop and item and the demo service is never in a shop).
Prints one JSON line (ids/slugs) on stdout.
"""
from __future__ import annotations

import json
import os
import secrets
import subprocess
import sys
from datetime import date
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
NEW_BRAND = {"slug": "team-demo-brand-two", "name": "Team Demo Brand Two"}   # created by the catalog-basics video, removed again here
NEW_ITEM = {"slug": "team-demo-rye-bread", "name": "Team Demo Rye Bread"}   # created by the products video, removed again here
NEW_RULE = {"host": "team-demo-blocked.com"}   # created by the moderation video, removed again here (.example would be refused: no public suffix)
DEMO_SERVICE = {"slug": "team-demo-service", "names": {"en": "Team Demo Service", "el": "Team Demo Υπηρεσία"}}   # mapped by the catalog-quality video
NEW_ATTR_DEF = {"key": "team_demo_size"}   # created by the catalog-quality video on the demo category, removed again here
REVIEWER = {"email": "reviewer" + DEMO_DOMAIN, "name": "Team Demo Reviewer"}
REVIEW_REPORTER = {"email": "reporter" + DEMO_DOMAIN, "name": "Team Demo Reporter"}
REVIEW_COMMENT = "Team Demo review: great prices! Visit my page for free vouchers (demo text, no real person)."
OWNER_EMAIL = "owner" + DEMO_DOMAIN
CLAIMANT_EMAIL = "claimant" + DEMO_DOMAIN
CLAIMANT2_EMAIL = "claimant2" + DEMO_DOMAIN
CLAIM_MESSAGES = {
    "pet": "Hello, I run this shop and would like to manage its page. (demo)",
    "flower": "Hi, I would like to manage this shop page. (demo)",
}
BRAND_SLUG = "team-demo-brand"
LEGACY_BRAND_ID = 1       # earlier parking ids (first-1000 window of the old admin forms); moved to normal ids by _ensure_normal_ids
LEGACY_CATEGORY_ID = -1
CATEGORY_EXTERNAL_ID = "px-team-demo"
CATEGORY_PARENT = "px-cooking"
CATEGORY_NAMES = {"en": "Team Demo Category", "el": "Team Demo Κατηγορία"}
ITEM_SLUG = "team-demo-sourdough-loaf"
ITEM_NAMES = {"en": "Team Demo Sourdough Loaf", "de": "Team Demo Sauerteigbrot", "el": "Team Demo Προζυμένιο ψωμί",
              "ru": "Team Demo Хлеб на закваске", "ar": "Team Demo خبز العجين المخمر", "he": "Team Demo לחם מחמצת"}
ITEM_DESCRIPTIONS = {"en": "Fictional demo product for the team videos.", "de": "Fiktives Demo-Produkt für die Team-Videos."}
ITEM_EAN = "2099900000015"   # fictional (restricted-circulation prefix 2), no real product
# ---- CRM (F7600 org cut): organisations with a lead status, channels with exactly one owner, relations person x organisation ----
# Organisations: "head" is the org of the demo shop (found by shop_id), the others are found by exact name, no shop, source manual.
CRM_ORGS = {
    "head": {"name": "Team Demo Bakery", "city": "Limassol", "category": "Bakery", "lead_state": "NEEDS_REVIEW",
             "needs_human": True, "business_status": "unknown", "parent": None},
    "branch": {"name": "Team Demo Bakery Larnaca", "city": "Larnaca", "category": "Bakery", "lead_state": "QUEUED",
               "needs_human": False, "business_status": "confirmed", "parent": "head"},
    "employer": {"name": "Team Demo Accounting Office", "city": "Limassol", "category": "Accounting", "lead_state": None,
                 "needs_human": False, "business_status": "unknown", "parent": None},
}
# org channels: (kind, value, is_preferred); kinds as stored (phone = phone_call)
CRM_ORG_CHANNELS = {
    "head": [("email", "info.bakery" + DEMO_DOMAIN, True), ("phone_call", "+35790000010", False)],
    "branch": [("email", "larnaca.bakery" + DEMO_DOMAIN, True)],
    "employer": [],
}
# people: found by their first personal channel ("key", stable id); legacy = former display names of the same seed
CRM_PERSONS = {
    "petros": {"display_name": "Petros Team Demo", "first_name": "Petros", "last_name": "Team Demo", "salutation": "mr",
               "birth_date": date(2000, 3, 14), "birth_year_unknown": True, "optout": False,
               "personal": [("email", "petros" + DEMO_DOMAIN), ("phone_call", "+35790000003")]},
    "nikos": {"display_name": "Team Demo Nikos", "first_name": None, "last_name": None, "salutation": None,
              "birth_date": None, "birth_year_unknown": False, "optout": False,
              "personal": [("email", "nikos" + DEMO_DOMAIN)]},
    "eleni": {"display_name": "Team Demo Eleni", "first_name": None, "last_name": None, "salutation": None,
              "birth_date": None, "birth_year_unknown": False, "optout": True,
              "personal": [("email", "eleni" + DEMO_DOMAIN)]},
}
# relations: (person, org, roles, note, valid_from, relation channels [(kind, value, legal_tier)])
CRM_RELATIONS = [
    ("petros", "head", ["manager"], "Region West", date(2025, 3, 1), [("email", "petros.bakery" + DEMO_DOMAIN, "red")]),
    ("petros", "branch", ["manager"], "Region West", date(2025, 3, 1), []),
    ("eleni", "head", ["employee"], None, None, [("email", "eleni.bakery" + DEMO_DOMAIN, "green")]),
    ("nikos", "branch", [], None, None, []),
]
NEW_ORG = {"name": "Team Demo Cafe"}                                                     # created by the CRM video, removed again here
NEW_PERSON = {"names": ["Anna Team Demo", "Team Demo Anna"], "email": "anna" + DEMO_DOMAIN}   # created by the people video, removed again here


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


def remove_created_demo_brand(cur) -> int:
    """Delete the brand the catalog-basics video created (exact slug + exact English name + source NULL, only when no item uses it)."""
    cur.execute("delete from brands b where b.slug=%s and b.names->>'en'=%s and b.source is null "
                "and not exists (select 1 from items i where i.brand_id=b.id)", (NEW_BRAND["slug"], NEW_BRAND["name"]))
    return cur.rowcount


def remove_created_demo_rule(cur) -> int:
    """Delete the social-link rule the moderation video created (exact host + source admin + note "Team Demo..."). Returns the count."""
    cur.execute("delete from social_link_blocklist where host=%s and source='admin' and note like 'Team Demo%%'", (NEW_RULE["host"],))
    return cur.rowcount


def remove_created_demo_attr_def(cur, category_id: int) -> int:
    """Delete the attribute definition the catalog-quality video created (demo category id + exact key + English label "Team Demo..."). Returns the count."""
    cur.execute("delete from category_attribute_definitions where category_id=%s and attribute_key=%s and labels->>'en' like 'Team Demo%%'",
                (category_id, NEW_ATTR_DEF["key"]))
    return cur.rowcount


def upsert_demo_service(cur) -> int:
    """The demo service item (type service) the catalog-quality video maps to a profession. Fixed slug, refuses a foreign row. Returns the item id."""
    cur.execute("select id, source, item_type from items where slug=%s", (DEMO_SERVICE["slug"],))
    row = cur.fetchone()
    if row:
        if row[1] != "admin" or row[2] != "service":
            sys.exit(f"refusing: item slug {DEMO_SERVICE['slug']} exists and is not ours")
        cur.execute("update items set status='active', names=%s where id=%s and (names<>%s or status<>'active')",
                    (Jsonb(DEMO_SERVICE["names"]), row[0], Jsonb(DEMO_SERVICE["names"])))
        return row[0]
    cur.execute("insert into items (slug, item_type, status, names, source) values (%s,'service','active',%s,'admin') returning id",
                (DEMO_SERVICE["slug"], Jsonb(DEMO_SERVICE["names"])))
    return cur.fetchone()[0]


def remove_created_demo_mappings(cur, service_item_id: int) -> int:
    """Delete the item-domain mappings the catalog-quality video created (every mapping of the demo service item). Returns the count."""
    cur.execute("delete from item_domain_mappings where item_id=%s", (service_item_id,))
    return cur.rowcount


def _upsert_customer(cur, who: dict) -> int:
    assert who["email"].endswith(DEMO_DOMAIN)
    cur.execute("select id from customer_users where email=%s", (who["email"],))
    row = cur.fetchone()
    if row:
        cur.execute("update customer_users set display_name=%s where id=%s and display_name<>%s", (who["name"], row[0], who["name"]))
        return row[0]
    # no password, never logged in as; verified so the account looks normal
    cur.execute("insert into customer_users (email, display_name, provider, is_verified, status) values (%s,%s,'email',true,'active') returning id",
                (who["email"], who["name"]))
    return cur.fetchone()[0]


def upsert_demo_review(cur, shop_id: int, owner_id: int) -> dict:
    """One demo review on the demo shop, RESET to the initial state on every run (visible, newest, reported twice, audit = created + 2 x reported)."""
    author = _upsert_customer(cur, REVIEWER)
    reporter = _upsert_customer(cur, REVIEW_REPORTER)
    cur.execute("select id, comment from reviews where user_id=%s and entity_type='shop' and entity_id=%s", (author, shop_id))
    row = cur.fetchone()
    if row:
        if not (row[1] or "").startswith("Team Demo"):
            sys.exit("refusing: the demo reviewer's review on the demo shop is not ours")
        review_id = row[0]
        cur.execute("update reviews set stars=1, comment=%s, is_visible=true, invalidated_at=null, invalidated_by=null, created_at=now(), updated_at=now() where id=%s",
                    (REVIEW_COMMENT, review_id))
    else:
        cur.execute("insert into reviews (user_id, entity_type, entity_id, stars, comment, is_visible) values (%s,'shop',%s,1,%s,true) returning id",
                    (author, shop_id, REVIEW_COMMENT))
        review_id = cur.fetchone()[0]
    cur.execute("delete from review_replies where review_id=%s", (review_id,))
    cur.execute("delete from review_reports where review_id=%s", (review_id,))
    cur.execute("delete from review_audit_log where review_id=%s", (review_id,))
    cur.execute("insert into review_reports (review_id, reporter_id, reason, reporter_type) values (%s,%s,%s,'customer')",
                (review_id, reporter, "Looks like spam (demo)"))
    cur.execute("insert into review_reports (review_id, reporter_type, reporter_shop_id, reporter_owner_id, reason, comment) "
                "values (%s,'shop_owner',%s,%s,'spam','Team Demo: advertising, not a real experience.')", (review_id, shop_id, owner_id))
    for action, actor_type, actor_id, reason, ago in (("created", "customer", author, None, 30), ("reported", "customer", reporter, "Looks like spam (demo)", 20),
                                                      ("reported", "shop_owner", owner_id, "spam", 10)):
        cur.execute("insert into review_audit_log (review_id, action, actor_type, actor_id, reason, timestamp) "
                    "values (%s,%s,%s,%s,%s, now() - make_interval(mins => %s))", (review_id, action, actor_type, actor_id, reason, ago))
    return {"id": review_id, "author_id": author, "reporter_id": reporter, "shop_id": shop_id}


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


def _ensure_normal_ids(cur) -> tuple[int, int]:
    """Brand + demo category at NORMAL ids (sequence). A row left at the legacy parking id (brand 1 / category -1) is moved once:
    copy to a fresh id, repoint items, delete the old row. Refuses when another table references the old row (nothing but items and
    the category's own translations do in pundo_test). Returns (brand_id, category_id)."""
    cur.execute("select id, source from brands where slug=%s", (BRAND_SLUG,))
    row = cur.fetchone()
    if row and row[1] != "manual":
        sys.exit(f"refusing: brand {BRAND_SLUG} exists and is not ours")
    if row and row[0] == LEGACY_BRAND_ID:
        cur.execute("select count(*) from products_deprecated where brand_id=%s", (LEGACY_BRAND_ID,))
        if cur.fetchone()[0]:
            sys.exit("refusing: legacy products reference the demo brand")
        cur.execute("update brands set slug=%s where id=%s", (BRAND_SLUG + "-moving", LEGACY_BRAND_ID))
        cur.execute("insert into brands (slug, names, country_code, source) values (%s,%s,'CY','manual') returning id",
                    (BRAND_SLUG, Jsonb({"en": "Team Demo Brand"})))
        brand_id = cur.fetchone()[0]
        cur.execute("update items set brand_id=%s where brand_id=%s", (brand_id, LEGACY_BRAND_ID))
        cur.execute("delete from brands where id=%s", (LEGACY_BRAND_ID,))
    elif row:
        brand_id = row[0]
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
    if row and row[0] != LEGACY_CATEGORY_ID:
        return brand_id, row[0]
    path = f"{parent[1]} > {CATEGORY_EXTERNAL_ID}"
    if row:   # legacy id -1: nothing else may hang on it
        for table, col in (("products_deprecated", "category_id"), ("category_attribute_definitions", "category_id"),
                           ("service_place_type_mappings", "category_id"), ("category_synonyms", "category_id"),
                           ("category_embeddings", "category_id"), ("category_path_aliases", "category_id"),
                           ("onboarding_domain_category_mapping", "category_id"), ("categories", "parent_id")):
            cur.execute(f"select count(*) from {table} where {col}=%s", (LEGACY_CATEGORY_ID,))
            if cur.fetchone()[0]:
                sys.exit(f"refusing: {table}.{col} references the legacy demo category")
        cur.execute("update categories set external_id=%s where id=%s", (CATEGORY_EXTERNAL_ID + "-moving", LEGACY_CATEGORY_ID))
    cur.execute("insert into categories (parent_id, taxonomy_type, external_id, level, path) values (%s,'unspsc',%s,'class',%s) returning id",
                (parent[0], CATEGORY_EXTERNAL_ID, path))
    cat_id = cur.fetchone()[0]
    if row:
        cur.execute("update items set category_id=%s where category_id=%s", (cat_id, LEGACY_CATEGORY_ID))
        cur.execute("delete from category_translations where category_id=%s", (LEGACY_CATEGORY_ID,))
        cur.execute("delete from categories where id=%s", (LEGACY_CATEGORY_ID,))
    return brand_id, cat_id


def upsert_brand_category_item(cur) -> dict:
    brand_id, cat_id = _ensure_normal_ids(cur)
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
        cur.execute("update items set status='active', item_type='product', names=%s, descriptions=%s, ean=%s, category_id=%s, brand_id=%s "
                    "where id=%s and (names<>%s or descriptions is distinct from %s or ean is distinct from %s or category_id is distinct from %s "
                    "or brand_id is distinct from %s or status<>'active')",
                    (Jsonb(ITEM_NAMES), Jsonb(ITEM_DESCRIPTIONS), ITEM_EAN, cat_id, brand_id, item_id, Jsonb(ITEM_NAMES),
                     Jsonb(ITEM_DESCRIPTIONS), ITEM_EAN, cat_id, brand_id))
    else:
        cur.execute("insert into items (slug, item_type, status, names, descriptions, ean, category_id, brand_id, source) "
                    "values (%s,'product','active',%s,%s,%s,%s,%s,'admin') returning id",
                    (ITEM_SLUG, Jsonb(ITEM_NAMES), Jsonb(ITEM_DESCRIPTIONS), ITEM_EAN, cat_id, brand_id))
        item_id = cur.fetchone()[0]
    return {"brand_id": brand_id, "category_id": cat_id, "item_id": item_id}


def _hmac(value: str) -> str:
    from ingestor.lib.crm.suppression import compute_suppression_key   # needs CRM_SUPPRESSION_PEPPER (backend .env)
    return compute_suppression_key(value)


def _delete_crm_org(cur, org_id: int) -> None:
    """Delete one organisation with everything that hangs on it (only called for the org the CRM video created)."""
    cur.execute("delete from crm_person_org_relation where org_id=%s", (org_id,))   # relation channels/roles cascade
    for table in ("crm_send_approval", "crm_message", "crm_interaction", "crm_org_source", "crm_review_item", "crm_channel"):
        cur.execute(f"delete from {table} where org_id=%s", (org_id,))
    cur.execute("update crm_card_vision_job set org_id=null where org_id=%s", (org_id,))
    cur.execute("update crm_org set parent_org_id=null where parent_org_id=%s", (org_id,))
    cur.execute("delete from crm_org where id=%s", (org_id,))


def remove_created_demo_org(cur) -> int:
    """Delete the organisation the CRM video created (exact name + no shop + primary source manual). Returns the count."""
    cur.execute("select id from crm_org where name=%s and shop_id is null and primary_source='manual'", (NEW_ORG["name"],))
    ids = [r[0] for r in cur.fetchall()]
    for org_id in ids:
        _delete_crm_org(cur, org_id)
    return len(ids)


def remove_created_demo_person(cur) -> int:
    """Delete the person the people video created (display name "Anna Team Demo"/former "Team Demo Anna" AND her personal e-mail).
    Personal channels and relations cascade (relation channels and roles with them)."""
    cur.execute("select p.id from crm_person p join crm_channel c on c.person_id=p.id where p.display_name = any(%s) and c.value_hmac=%s",
                (NEW_PERSON["names"], _hmac(NEW_PERSON["email"])))
    ids = sorted({r[0] for r in cur.fetchall()})
    for pid in ids:
        cur.execute("delete from crm_person where id=%s", (pid,))
    return len(ids)


def _find_crm_org(cur, key: str, shop_id: int) -> int:
    """Demo organisation id (created when missing). The head office is the org of the demo shop; the others: exact name, no shop."""
    spec = CRM_ORGS[key]
    if key == "head":
        cur.execute("select id from crm_org where shop_id=%s", (shop_id,))
    else:
        cur.execute("select id from crm_org where name=%s and shop_id is null and primary_source='manual' order by id limit 1", (spec["name"],))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("insert into crm_org (name, city, category, business_status, shop_id, primary_source) values (%s,%s,%s,%s,%s,'manual') returning id",
                (spec["name"], spec["city"], spec["category"], spec["business_status"], shop_id if key == "head" else None))
    org_id = cur.fetchone()[0]
    cur.execute("insert into crm_org_source (org_id, source, source_ref, raw, ingest_via) values (%s,'manual','team-demo','{}'::jsonb,'prepare_team.py')",
                (org_id,))
    return org_id


def _find_crm_person(cur, key: str) -> int:
    """Demo person id, found by the first personal channel (stable id for the address bar); created when missing."""
    spec = CRM_PERSONS[key]
    cur.execute("select person_id, org_id, relation_id from crm_channel where value_hmac=%s", (_hmac(spec["personal"][0][1]),))
    row = cur.fetchone()
    if row and row[0] is not None:
        return row[0]
    if row:
        sys.exit(f"refusing: {spec['personal'][0][1]} is a channel of an organisation or relation, not of the demo person {key}")
    cur.execute("insert into crm_person (display_name) values (%s) returning id", (spec["display_name"],))
    return cur.fetchone()[0]


def _put_channel(cur, owner: str, owner_id: int, kind: str, value: str, *, preferred: bool = False, tier: str = "green",
                 consent: str = "none") -> int:
    """Seed one channel at exactly this owner (org_id / relation_id / person_id), reset its flags. Refuses a value that belongs to a
    foreign owner (demo relations are deleted before, so a remaining owner other than this one is not ours)."""
    assert value.endswith(DEMO_DOMAIN) or value.startswith("+357900000"), value
    h = _hmac(value)
    cur.execute("select id, org_id, relation_id, person_id from crm_channel where value_hmac=%s", (h,))
    row = cur.fetchone()
    owners = {"org_id": None, "relation_id": None, "person_id": None, owner: owner_id}
    if row:
        current = {"org_id": row[1], "relation_id": row[2], "person_id": row[3]}
        if current != owners:
            sys.exit(f"refusing: demo channel {value} belongs to another owner {current}")
        cur.execute("""update crm_channel set kind=%s, value_normalized=%s, reachable='unknown', consent_state=%s, is_preferred=%s,
                       legal_tier=%s, origin='manual', owner_review_pending=false, updated_at=now() where id=%s""",
                    (kind, value, consent, preferred, tier, row[0]))
        return row[0]
    cur.execute(f"""insert into crm_channel ({owner}, kind, value_normalized, value_hmac, consent_state, is_preferred, legal_tier, origin)
                    values (%s,%s,%s,%s,%s,%s,%s,'manual') returning id""", (owner_id, kind, value, h, consent, preferred, tier))
    return cur.fetchone()[0]


def upsert_crm(cur, shop_id: int) -> dict:
    """CRM demo data on the model after the F7600 org cut, RESET to the same state on every run (see the module docstring)."""
    orgs = {key: _find_crm_org(cur, key, shop_id) for key in CRM_ORGS}
    persons = {key: _find_crm_person(cur, key) for key in CRM_PERSONS}
    org_ids, person_ids = list(orgs.values()), list(persons.values())

    # 1. history and video traces on the demo organisations and people
    for table in ("crm_send_approval", "crm_message", "crm_interaction", "crm_review_item"):
        cur.execute(f"delete from {table} where org_id = any(%s)", (org_ids,))
    cur.execute("delete from crm_review_item where person_id = any(%s)", (person_ids,))
    # 2. all relations of the demo people (relation channels, roles and review rows cascade); recreated below
    cur.execute("delete from crm_person_org_relation where person_id = any(%s)", (person_ids,))
    cur.execute("select count(*) from crm_person_org_relation where org_id = any(%s)", (org_ids,))
    foreign_relations = cur.fetchone()[0]   # relations of non-demo people to a demo org: left alone, reported
    # 3. organisations: master data and lead block back to the seed (head office first, the branch points to it)
    for key in CRM_ORGS:
        spec = CRM_ORGS[key]
        cur.execute("""update crm_org set name=%s, city=%s, category=%s, region=null, legal_name=null, business_status=%s,
                       lead_state=%s, owner_id=null, effective_legal_tier='green', effective_legal_basis='legitimate_interest',
                       primary_source='manual', needs_human=%s, agent_paused=false, lead_version=1, lead_updated_at=now(),
                       parent_org_id=%s, updated_at=now() where id=%s""",
                    (spec["name"], spec["city"], spec["category"], spec["business_status"], spec["lead_state"], spec["needs_human"],
                     orgs[spec["parent"]] if spec["parent"] else None, orgs[key]))
        seeded = [_hmac(value) for _, value, _ in CRM_ORG_CHANNELS[key]]
        cur.execute("delete from crm_channel where org_id=%s and value_hmac <> all(%s)", (orgs[key], seeded))
        for kind, value, preferred in CRM_ORG_CHANNELS[key]:
            _put_channel(cur, "org_id", orgs[key], kind, value, preferred=preferred)
    # 4. people: names, salutation, birthday, opt-out, personal channels
    for key, spec in CRM_PERSONS.items():
        cur.execute("""update crm_person set display_name=%s, first_name=%s, last_name=%s, salutation=%s, birth_date=%s,
                       birth_year_unknown=%s, address_id=null, optout_at=case when %s then optout_at end,
                       updated_at=now() where id=%s""",
                    (spec["display_name"], spec["first_name"], spec["last_name"], spec["salutation"], spec["birth_date"],
                     spec["birth_year_unknown"], spec["optout"], persons[key]))
        seeded = [_hmac(value) for _, value in spec["personal"]]
        cur.execute("delete from crm_channel where person_id=%s and value_hmac <> all(%s)", (persons[key], seeded))
        for kind, value in spec["personal"]:
            _put_channel(cur, "person_id", persons[key], kind, value)   # an objection is set by PersonService.opt_out after the commit
    # 5. relations with roles and relation channels
    relations = {}
    for person, org, roles, note, valid_from, channels in CRM_RELATIONS:
        cur.execute("insert into crm_person_org_relation (person_id, org_id, valid_from, note, source) values (%s,%s,%s,%s,'manual') returning id",
                    (persons[person], orgs[org], valid_from, note))
        rid = cur.fetchone()[0]
        relations[f"{person}@{org}"] = rid
        for role in roles:
            cur.execute("insert into crm_relation_role (relation_id, role) values (%s,%s)", (rid, role))
        for kind, value, tier in channels:
            _put_channel(cur, "relation_id", rid, kind, value, tier=tier)
    # 6. every demo org needs a source (the org page lists "Sources and proofs")
    for org_id in org_ids:
        cur.execute("select 1 from crm_org_source where org_id=%s", (org_id,))
        if not cur.fetchone():
            cur.execute("insert into crm_org_source (org_id, source, source_ref, raw, ingest_via) values (%s,'manual','team-demo','{}'::jsonb,'prepare_team.py')",
                        (org_id,))
    # 7. the values the videos need must be reachable (crm_suppression is only read here; Eleni's objection: object_via_service)
    for value in ("info.bakery" + DEMO_DOMAIN, "petros.bakery" + DEMO_DOMAIN, "larnaca.bakery" + DEMO_DOMAIN):
        cur.execute("select 1 from crm_suppression where suppression_key=%s", (_hmac(value),))
        if cur.fetchone():
            sys.exit(f"refusing: demo value {value} is on the suppression list - the outreach scenes cannot work")
    return {"orgs": orgs, "persons": persons, "relations": relations, "foreign_relations_on_demo_orgs": foreign_relations}


def object_via_service(url: str, person_ids: list[int]) -> dict:
    """Objection of the demo people with "optout" through the backend's PersonService.opt_out (the same path as the admin API
    POST /persons/{id}/opt-out): optout_at once, every personal and relation channel suppressed (crm_suppression + consent
    "optout"), audit, interaction "person_optout" per relation. Idempotent, so the person is consistent on every run (the indicator
    objection_leaks of crm_effect_watch finds no leak). The demo values are @pundo-e2e.io addresses, their suppression keys stay.
    Runs after the commit of the SQL seed; refuses when the owner rule would block an organisation (no demo person is "Owner")."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from ingestor.lib.crm.person_service import PersonService
    engine = create_engine(url.replace("postgresql://", "postgresql+psycopg://", 1))
    result = {}
    try:
        with Session(engine) as session:
            for pid in person_ids:
                blocked = PersonService(session, "prepare_team.py").opt_out(pid)
                if blocked:
                    session.rollback()
                    sys.exit(f"refusing: the objection of demo person {pid} would block organisations {blocked} (owner rule)")
                result[pid] = "opted_out"
            session.commit()
    finally:
        engine.dispose()
    return result


def main() -> None:
    url = db_url()
    admin = ensure_accounts()
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        ensure_admin(cur, admin)
        removed = remove_created_demo_shop(cur)
        removed_item = remove_created_demo_item(cur)
        removed_brand = remove_created_demo_brand(cur)
        removed_org = remove_created_demo_org(cur)
        removed_person = remove_created_demo_person(cur)
        removed_rule = remove_created_demo_rule(cur)
        shops = {k: upsert_shop(cur, s) for k, s in SHOPS.items()}
        owner = upsert_owner(cur, OWNER_EMAIL, "Team Demo Owner", "approved", shops["bakery"])
        claimant = upsert_owner(cur, CLAIMANT_EMAIL, "Team Demo Claimant", "pending", None)
        claimant2 = upsert_owner(cur, CLAIMANT2_EMAIL, "Team Demo Applicant Two", "pending", None)
        claim = upsert_claim(cur, shops["pet"], claimant, True, CLAIM_MESSAGES["pet"])
        claim2 = upsert_claim(cur, shops["flower"], claimant2, False, CLAIM_MESSAGES["flower"])
        catalog = upsert_brand_category_item(cur)
        removed_attr_def = remove_created_demo_attr_def(cur, catalog["category_id"])
        service_item_id = upsert_demo_service(cur)
        removed_mappings = remove_created_demo_mappings(cur, service_item_id)
        crm = upsert_crm(cur, shops["bakery"])
        review = upsert_demo_review(cur, shops["bakery"], owner)
        out = {"shops": {k: {"id": shops[k], "slug": SHOPS[k]["slug"]} for k in shops}, "owner_id": owner, "claimant_id": claimant, "claimant2_id": claimant2,
               "claim_id": claim, "claim2_id": claim2, **catalog, "item_slug": ITEM_SLUG, "item_ean": ITEM_EAN, "crm": crm, "marker": "Team Demo",
               "new_shop": {**NEW_SHOP, "removed_from_last_run": removed},
               "new_item": {**NEW_ITEM, "removed_from_last_run": removed_item},
               "new_brand": {**NEW_BRAND, "removed_from_last_run": removed_brand},
               "new_org": {**NEW_ORG, "removed_from_last_run": removed_org},
               "new_person": {**NEW_PERSON, "removed_from_last_run": removed_person},
               "service_item_id": service_item_id,
               "new_attr_def": {**NEW_ATTR_DEF, "removed_from_last_run": removed_attr_def},
               "new_mapping": {"service_item_id": service_item_id, "removed_from_last_run": removed_mappings},
               "review": review, "new_rule": {**NEW_RULE, "removed_from_last_run": removed_rule}, "dry_run": DRY}
        if DRY:
            conn.rollback()
        else:
            conn.commit()
    optout_ids = [crm["persons"][k] for k, spec in CRM_PERSONS.items() if spec["optout"]]
    out["crm"]["objections"] = "skipped (dry run)" if DRY else object_via_service(url, optout_ids)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
