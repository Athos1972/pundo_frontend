#!/usr/bin/env python3
"""Test-DB preparation for video #4 (service-create-new). pundo_test only.

Run with the BACKEND venv (DB settings from its .env):
    cd ~/dev/github/pundo_main_backend && .venv/bin/python \
        ~/dev/github/pundo_frontend/video/service-create-new/prepare_service.py [--dry-run] owner-email ...

* removes the baking-workshop service from earlier runs: offers + listings of the demo shops, item -> inactive
  (only shop_manual services whose name contains the demo marker, so the duplicate check doesn't block re-creating it);
* re-activates everything else the demo shops still offer (Anna's bread from part 2, syrup from part 3);
* checks that the "Cooking & Baking Classes" category (px-cooking) exists.
Prints {"shops": {owner_email: shop_slug}, "removed": n, "category_id": id} as JSON on the last line.
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
MARKERS = ["%baking workshop%", "%Εργαστήρι ψωμιού%"]

url = (os.environ.get("DATABASE_URL_TEST") or os.environ["DATABASE_URL"]).replace("postgresql+psycopg://", "postgresql://")
if not url.rstrip("/").endswith("/pundo_test"):
    sys.exit(f"refusing: not pundo_test ({url.rsplit('/', 1)[-1]})")

with psycopg.connect(url) as conn:
    cur = conn.cursor()
    cur.execute("select o.email, s.id, s.slug from shop_owners o join shops s on s.id=o.shop_id where o.email = any(%s)", (EMAILS,))
    rows = cur.fetchall()
    shops = {e: slug for e, _, slug in rows}
    shop_ids = [sid for _, sid, _ in rows]
    cur.execute("""select id from items where item_type='service' and source='shop_manual'
                   and exists (select 1 from jsonb_each_text(names) n where n.value ilike any(%s))""", (MARKERS,))
    item_ids = [r[0] for r in cur.fetchall()]
    removed = 0
    if item_ids:
        cur.execute("""delete from offers where shop_listing_id in (
                         select id from shop_listings where item_id = any(%s) and shop_id = any(%s))""", (item_ids, shop_ids))
        cur.execute("delete from shop_listings where item_id = any(%s) and shop_id = any(%s)", (item_ids, shop_ids))
        removed = cur.rowcount
        cur.execute("update items set status='inactive', updated_at=now() where id = any(%s) and status<>'inactive'", (item_ids,))
    cur.execute("""update items set status='active', updated_at=now() where status<>'active' and id in (
                     select sl.item_id from shop_listings sl join offers ofr on ofr.shop_listing_id=sl.id and not ofr.archived
                     where sl.shop_id = any(%s))""", (shop_ids,))
    reactivated = cur.rowcount
    cur.execute("select id from categories where external_id='px-cooking'")
    cat = cur.fetchone()
    print(f"workshop items {len(item_ids)} (listings removed {removed}), re-activated {reactivated}, "
          f"category px-cooking {'ok' if cat else 'MISSING'}" + (" [dry-run, rolled back]" if DRY else ""))
    conn.rollback() if DRY else conn.commit()
if not cat:
    sys.exit("category px-cooking missing: run scripts/seed_consumer_services.py --file scripts/data/consumer_services_w2_cooking.json --apply")
print(json.dumps({"shops": shops, "removed": removed, "category_id": cat[0]}))
