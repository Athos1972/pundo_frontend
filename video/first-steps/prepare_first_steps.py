#!/usr/bin/env python3
"""Test-DB preparation for tutorial #10 "Your first 10 minutes on pundo". pundo_test only.

Run with the BACKEND venv (DB settings from its .env):
    cd ~/dev/github/pundo_main_backend && .venv/bin/python \
        ~/dev/github/pundo_frontend/video/first-steps/prepare_first_steps.py [--dry-run] owner-email

Puts the three bakery suggestions of the given owner's demo shop back into the state right after the admin
approval (`assign_services_after_onboarding`): listing `auto_seeded`, available, one active offer
`auto_seeded` / "on request", no skip entry. The video then keeps one (wedding cake), prices one
(fresh bread 2.50) and archives one (cakes & pastries). Older offers on these listings are archived
(price history stays). Only touches the shop of the given owner email.
Prints {"shops": {email: slug}, "items": {...}} on the last line.
"""
import json
import os
import sys
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb
from dotenv import load_dotenv

load_dotenv(Path.cwd() / ".env")
DRY = "--dry-run" in sys.argv
EMAILS = [a for a in sys.argv[1:] if "@" in a]
SUGGESTIONS = ["baeckerei-konditorei-hochzeitstorte", "baeckerei-konditorei-frisches-brot",
               "baeckerei-konditorei-torten-kuchen"]

url = (os.environ.get("DATABASE_URL_TEST") or os.environ["DATABASE_URL"]).replace("postgresql+psycopg://", "postgresql://")
if not url.rstrip("/").endswith("/pundo_test"):
    sys.exit(f"refusing: not pundo_test ({url.rsplit('/', 1)[-1]})")

with psycopg.connect(url) as conn:
    cur = conn.cursor()
    cur.execute("select o.email, s.id, s.slug from shop_owners o join shops s on s.id=o.shop_id where o.email = any(%s)", (EMAILS,))
    rows = cur.fetchall()
    if not rows:
        sys.exit(f"no shop for {EMAILS}")
    shops, items = {e: slug for e, _, slug in rows}, {}
    for _, shop_id, slug in rows:
        items[slug] = {}
        for item_slug in SUGGESTIONS:
            cur.execute("select id from items where slug=%s", (item_slug,))
            item_id = cur.fetchone()[0]
            cur.execute("select id from shop_listings where shop_id=%s and item_id=%s", (shop_id, item_id))
            r = cur.fetchone()
            if r:
                listing_id = r[0]
                cur.execute("""update shop_listings set source='auto_seeded', available=true, is_published=true
                               where id=%s""", (listing_id,))
            else:
                cur.execute("""insert into shop_listings (item_id, shop_id, available, source, is_published)
                               values (%s, %s, true, 'auto_seeded', true) returning id""", (item_id, shop_id))
                listing_id = cur.fetchone()[0]
            cur.execute("update offers set archived=true where shop_listing_id=%s and not archived", (listing_id,))
            cur.execute("""insert into offers (shop_listing_id, price_type, price_tiers, currency, source, archived)
                           values (%s, 'on_request', %s, 'EUR', 'auto_seeded', false) returning id""",
                        (listing_id, Jsonb([])))
            offer_id = cur.fetchone()[0]
            cur.execute("delete from auto_assign_skips where shop_id=%s and item_id=%s", (shop_id, item_id))
            items[slug][item_slug] = {"listing": listing_id, "offer": offer_id}
    print(f"first-steps state {items}" + (" [dry-run, rolled back]" if DRY else ""))
    conn.rollback() if DRY else conn.commit()
print(json.dumps({"shops": shops, "items": items}))
