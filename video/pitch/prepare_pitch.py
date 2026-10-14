#!/usr/bin/env python3
"""Test-DB preparation for the pitch video ("Why pundo?"). pundo_test only.

Run with the BACKEND venv (DB settings from its .env):
    cd ~/dev/github/pundo_main_backend && .venv/bin/python \
        ~/dev/github/pundo_frontend/video/pitch/prepare_pitch.py [--dry-run] owner-email

Puts the demo shop of the given owner into a "fully maintained" state (it is shown, not edited, in the video):
* catalog item "Fresh bread (daily)" (`baeckerei-konditorei-frisches-brot`, translated into all languages, found by
  the Russian search "хлеб"): listing available + one active fixed offer 2.50 EUR per piece;
* sourdough bread (from video #2): active offer 4.50 EUR per piece with a running promotion 3.90 EUR (today .. +7 days);
* profile: description, languages EN/EL/RU, payment methods cash/card/revolut, opening hours with lunch break.
* throwaway "Anna" shops of the short-shop-signup recordings (owners video-short-*@pundo-e2e.io): listings
  unpublished, so their onboarding draft offers ("price on request") don't win the search over the demo shop.
Only touches the shop of the given owner email. Prints {"shops": {email: slug}, "items": {...}} on the last line.
"""
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb
from dotenv import load_dotenv

load_dotenv(Path.cwd() / ".env")
DRY = "--dry-run" in sys.argv
EMAILS = [a for a in sys.argv[1:] if "@" in a]
FRESH = "baeckerei-konditorei-frisches-brot"
SOURDOUGH = ["sourdough-bread-750-g%", "psomi-prozumiou-750-gr%"]
tiers = lambda p: [{"unit": "per_piece", "unit_label_custom": None,
                    "steps": [{"min_quantity": 1, "max_quantity": None, "price": p, "currency": "EUR"}]}]
DAY = {"open": "07:00", "close": "14:00", "closed": False, "second_open": "16:30", "second_close": "19:00"}
HOURS = {**{str(d): DAY for d in range(5)}, "5": {"open": "07:00", "close": "14:00", "closed": False}, "6": None}
DESC = {"en": "Fresh sourdough bread and pastries, baked every morning in Limassol.",
        "el": "Φρέσκο ψωμί προζυμιού και αρτοσκευάσματα, ψημένα κάθε πρωί στη Λεμεσό."}

url = (os.environ.get("DATABASE_URL_TEST") or os.environ["DATABASE_URL"]).replace("postgresql+psycopg://", "postgresql://")
if not url.rstrip("/").endswith("/pundo_test"):
    sys.exit(f"refusing: not pundo_test ({url.rsplit('/', 1)[-1]})")


def active_offer(cur, listing_id, price, promo=None):
    """Exactly one active shop_manual offer on the listing with the given price (and optional promo)."""
    cur.execute("select id from offers where shop_listing_id=%s and not archived order by id desc", (listing_id,))
    ids = [r[0] for r in cur.fetchall()]
    vals = dict(price_type="fixed", price_tiers=Jsonb(tiers(price)),
                promo_price_type="fixed" if promo else None, promo_price_tiers=Jsonb(tiers(promo) if promo else []),
                promo_valid_from=date.today() if promo else None,
                promo_valid_until=date.today() + timedelta(days=7) if promo else None)
    if ids:
        cur.execute("""update offers set price_type=%(price_type)s, price_tiers=%(price_tiers)s, currency='EUR',
                              promo_price_type=%(promo_price_type)s, promo_price_tiers=%(promo_price_tiers)s,
                              promo_valid_from=%(promo_valid_from)s, promo_valid_until=%(promo_valid_until)s,
                              title=null, description=null where id=%(id)s""", {**vals, "id": ids[0]})
        return ids[0]
    cur.execute("""insert into offers (shop_listing_id, price_type, price_tiers, currency, source,
                                       promo_price_type, promo_price_tiers, promo_valid_from, promo_valid_until)
                   values (%(l)s, %(price_type)s, %(price_tiers)s, 'EUR', 'shop_manual',
                           %(promo_price_type)s, %(promo_price_tiers)s, %(promo_valid_from)s, %(promo_valid_until)s)
                   returning id""", {**vals, "l": listing_id})
    return cur.fetchone()[0]


with psycopg.connect(url) as conn:
    cur = conn.cursor()
    cur.execute("select o.email, s.id, s.slug from shop_owners o join shops s on s.id=o.shop_id where o.email = any(%s)", (EMAILS,))
    rows = cur.fetchall()
    if not rows:
        sys.exit(f"no shop for {EMAILS}")
    shops, items = {e: slug for e, _, slug in rows}, {}
    for _, shop_id, slug in rows:
        cur.execute("""select sl.id, i.id from shop_listings sl join items i on i.id=sl.item_id
                        where sl.shop_id=%s and i.slug=%s""", (shop_id, FRESH))
        r = cur.fetchone()
        if not r:
            cur.execute("select id from items where slug=%s", (FRESH,))
            item_id = cur.fetchone()[0]
            cur.execute("""insert into shop_listings (item_id, shop_id, available, source, is_published)
                           values (%s, %s, true, 'shop_manual', true) returning id""", (item_id, shop_id))
            r = (cur.fetchone()[0], item_id)
        cur.execute("update shop_listings set available=true where id=%s", (r[0],))
        fresh_offer = active_offer(cur, r[0], "2.50")
        cur.execute("""select sl.id, i.id, i.slug from shop_listings sl join items i on i.id=sl.item_id
                        where sl.shop_id=%s and i.slug like any(%s) order by sl.id desc limit 1""", (shop_id, SOURDOUGH))
        b = cur.fetchone()
        if not b:
            sys.exit(f"sourdough bread missing in {slug} — record video #2 (product-create-new) first")
        cur.execute("update shop_listings set available=true where id=%s", (b[0],))
        cur.execute("update items set status='active' where id=%s and status<>'active'", (b[1],))
        bread_offer = active_offer(cur, b[0], "4.50", promo="3.90")
        lang = "el" if slug.startswith("o-") else "en"
        cur.execute("""update shops set descriptions=%s, spoken_languages=%s, payment_methods=%s,
                              opening_hours=%s, updated_at=now() where id=%s""",
                    (Jsonb({lang: DESC[lang]}), Jsonb(["EN", "EL", "RU"]), ["cash", "card", "revolut"], Jsonb(HOURS), shop_id))
        items[slug] = {"fresh_offer": fresh_offer, "bread_offer": bread_offer, "bread_slug": b[2]}
    cur.execute("""update shop_listings set available=false, is_published=false
                    where (available or is_published) and shop_id in (select shop_id from shop_owners
                          where email like 'video-short-%%@pundo-e2e.io')""")
    items["hidden_throwaway_listings"] = cur.rowcount
    print(f"pitch state {items}" + (" [dry-run, rolled back]" if DRY else ""))
    conn.rollback() if DRY else conn.commit()
print(json.dumps({"shops": shops, "items": items}))
