#!/usr/bin/env python3
"""Test-DB preparation for video #6 (pricing). pundo_test only.

Run with the BACKEND venv (DB settings from its .env):
    cd ~/dev/github/pundo_main_backend && .venv/bin/python \
        ~/dev/github/pundo_frontend/video/pricing/prepare_pricing.py [--dry-run] owner-email

* resets the demo shop's sourdough-bread offer (from video #2) to its starting state:
  fixed price, one step 1–∞ at 4.50 EUR per piece, no promotion, no title/description, not archived;
* every price change in the shop-admin archives the offer and creates a new one (one active manual offer per
  listing), so the ACTIVE offer of the bread listing is reset (fallback: newest archived one, re-activated);
* only touches the shop of the given owner email (= the recorded language).
Prints {"shops": {owner_email: shop_slug}, "offers": {shop_slug: {"id": offer_id, "item_slug": slug}}} as JSON on the last line.
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
# Item slugs of the bread created in video #2 (EN / EL), with the numeric dedup suffix.
SLUG_PATTERNS = ["sourdough-bread-750-g%", "psomi-prozumiou-750-gr%"]
START_TIERS = [{"unit": "per_piece", "unit_label_custom": None,
                "steps": [{"min_quantity": 1, "max_quantity": None, "price": "4.50", "currency": "EUR"}]}]

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
    offers = {}
    for _, shop_id, shop_slug in rows:
        cur.execute("""select o.id, i.slug from offers o
                         join shop_listings sl on sl.id=o.shop_listing_id join items i on i.id=sl.item_id
                        where sl.shop_id=%s and i.slug like any(%s)
                        order by o.archived, o.id desc limit 1""", (shop_id, SLUG_PATTERNS))
        row = cur.fetchone()
        if not row:
            sys.exit(f"bread offer missing in {shop_slug} — record video #2 (product-create-new) first")
        offer_id, item_slug = row
        cur.execute("""update offers set price_type='fixed', price_tiers=%s, currency='EUR',
                              promo_price_type=null, promo_price_tiers='[]'::jsonb,
                              promo_valid_from=null, promo_valid_until=null,
                              title=null, description=null, archived=false
                        where id=%s""", (Jsonb(START_TIERS), offer_id))
        cur.execute("update shop_listings set available=true where id=(select shop_listing_id from offers where id=%s)", (offer_id,))
        offers[shop_slug] = {"id": offer_id, "item_slug": item_slug}
    print(f"reset bread offers {offers}" + (" [dry-run, rolled back]" if DRY else ""))
    conn.rollback() if DRY else conn.commit()
print(json.dumps({"shops": shops, "offers": offers}))
