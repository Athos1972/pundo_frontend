#!/usr/bin/env python3
"""Test-DB preparation for video #7 (shop-profile). pundo_test only.

Run with the BACKEND venv (DB settings from its .env):
    cd ~/dev/github/pundo_main_backend && .venv/bin/python \
        ~/dev/github/pundo_frontend/video/shop-profile/prepare_profile.py [--dry-run] owner-email

* empties the profile fields the video fills in, so it starts from scratch: description, spoken languages,
  payment methods, service radius / island-wide delivery, opening hours, social links;
* name, address, phone, WhatsApp and logo from video #1 stay untouched;
* only touches the shop of the given owner email (= the recorded language).
Prints {"shops": {owner_email: shop_slug}} as JSON on the last line.
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

url = (os.environ.get("DATABASE_URL_TEST") or os.environ["DATABASE_URL"]).replace("postgresql+psycopg://", "postgresql://")
if not url.rstrip("/").endswith("/pundo_test"):
    sys.exit(f"refusing: not pundo_test ({url.rsplit('/', 1)[-1]})")

with psycopg.connect(url) as conn:
    cur = conn.cursor()
    cur.execute("select o.email, s.id, s.slug from shop_owners o join shops s on s.id=o.shop_id where o.email = any(%s)", (EMAILS,))
    rows = cur.fetchall()
    if not rows:
        sys.exit(f"no shop for {EMAILS}")
    shops = {e: slug for e, _, slug in rows}
    cur.execute("""update shops set descriptions=null, spoken_languages='[]'::jsonb, payment_methods='{}'::text[],
                          service_radius_km=null, delivers_island_wide=false, opening_hours=null, social_links=null,
                          updated_at=now()
                    where id = any(%s)""", ([sid for _, sid, _ in rows],))
    print(f"reset profile of {list(shops.values())}" + (" [dry-run, rolled back]" if DRY else ""))
    conn.rollback() if DRY else conn.commit()
print(json.dumps({"shops": shops}))
