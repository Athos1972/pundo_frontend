#!/usr/bin/env python3
"""Test-DB preparation for video #5 (service-from-catalog). pundo_test only.

Run with the BACKEND venv (DB settings from its .env):
    cd ~/dev/github/pundo_main_backend && .venv/bin/python \
        ~/dev/github/pundo_frontend/video/service-from-catalog/prepare_catalog_service.py [--dry-run] owner-email

* removes the demo shop's offer + listing for the catalog service "Catering / events" from earlier runs
  (the catalog item itself is a platform entry and stays untouched);
* re-activates everything else the demo shop still offers (bread, syrup, baking class);
* checks that the catalog item exists and is active.
Prints {"shops": {owner_email: shop_slug}, "item_id": id, "item_slug": slug, "removed": n} as JSON on the last line.
"""
import json
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv(Path.cwd() / ".env")
DRY = "--dry-run" in sys.argv
EMAILS = [a for a in sys.argv[1:] if "@" in a]
ITEM_SLUG = "restaurant-allgemein-catering-veranstaltung"   # "Catering / events" (source admin)

url = (os.environ.get("DATABASE_URL_TEST") or os.environ["DATABASE_URL"]).replace("postgresql+psycopg://", "postgresql://")
if not url.rstrip("/").endswith("/pundo_test"):
    sys.exit(f"refusing: not pundo_test ({url.rsplit('/', 1)[-1]})")

with psycopg.connect(url) as conn:
    cur = conn.cursor()
    cur.execute("select id, status from items where slug=%s", (ITEM_SLUG,))
    row = cur.fetchone()
    if not row or row[1] != "active":
        sys.exit(f"catalog item {ITEM_SLUG} missing or not active: {row}")
    item_id = row[0]
    cur.execute("select o.email, s.id, s.slug from shop_owners o join shops s on s.id=o.shop_id where o.email = any(%s)", (EMAILS,))
    rows = cur.fetchall()
    shops = {e: slug for e, _, slug in rows}
    shop_ids = [sid for _, sid, _ in rows]
    cur.execute("""delete from offers where shop_listing_id in (
                     select id from shop_listings where item_id=%s and shop_id = any(%s))""", (item_id, shop_ids))
    cur.execute("delete from shop_listings where item_id=%s and shop_id = any(%s)", (item_id, shop_ids))
    removed = cur.rowcount
    cur.execute("""update items set status='active', updated_at=now() where status<>'active' and id in (
                     select sl.item_id from shop_listings sl join offers ofr on ofr.shop_listing_id=sl.id and not ofr.archived
                     where sl.shop_id = any(%s))""", (shop_ids,))
    reactivated = cur.rowcount
    print(f"catering listings removed {removed}, re-activated {reactivated}" + (" [dry-run, rolled back]" if DRY else ""))
    conn.rollback() if DRY else conn.commit()
print(json.dumps({"shops": shops, "item_id": item_id, "item_slug": ITEM_SLUG, "removed": removed}))
