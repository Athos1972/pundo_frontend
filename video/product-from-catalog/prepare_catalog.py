#!/usr/bin/env python3
"""Seed the fictional demo catalog product for video #3 (product-from-catalog) into pundo_test.

Run with the BACKEND venv (needs its image pipeline + DB settings):
    cd ~/dev/github/pundo_main_backend && .venv/bin/python \
        ~/dev/github/pundo_frontend/video/product-from-catalog/prepare_catalog.py [--dry-run] [owner-email ...]

Idempotent: upserts one item by slug (source 'admin', EAN, category "Syrup") and its catalog photo
(contributed_by_shop_id NULL -> shown as catalog photo to every shop). Refuses anything but pundo_test.
Prints {item_id, slug, ean, shops: {owner_email: shop_slug}} as JSON on the last line (record.mjs reads it).
"""
import json
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
BACKEND = Path.cwd()
sys.path.insert(0, str(BACKEND))
load_dotenv(BACKEND / ".env")

from ingestor.ingestion.product_image_ingestor import ingest_image_with_variants  # noqa: E402

DRY = "--dry-run" in sys.argv
EMAILS = [a for a in sys.argv[1:] if "@" in a]
SLUG = "troodos-valley-carob-syrup-500ml"
EAN = "2001234567893"            # fictional, GS1 range 200-299 (internal numbers), valid check digit
CATEGORY_ID = 4647               # "Syrup"
NAMES = {
    "en": "Troodos Valley Carob Syrup 500 ml",
    "el": "Χαρουπόμελο Troodos Valley 500 ml",
    "de": "Troodos Valley Johannisbrotsirup 500 ml",
    "ru": "Сироп из рожкового дерева Troodos Valley 500 мл",
    "ar": "دبس الخروب Troodos Valley ‏500 مل",
    "he": "סירופ חרובים Troodos Valley ‏500 מ\"ל",
}
DESCRIPTIONS = {
    "en": "Traditional Cypriot carob syrup (charoupomelo) from the Troodos mountains. Great on bread, pancakes and in baking.",
    "el": "Παραδοσιακό κυπριακό χαρουπόμελο από το Τρόοδος. Ιδανικό σε ψωμί, τηγανίτες και στη ζαχαροπλαστική.",
    "de": "Traditioneller zyprischer Johannisbrotsirup (Charoupomelo) aus dem Troodos. Lecker auf Brot, Pfannkuchen und zum Backen.",
}
PHOTO = HERE / "assets" / "catalog-photo.jpg"

url = os.environ.get("DATABASE_URL_TEST") or os.environ["DATABASE_URL"]
url = url.replace("postgresql+psycopg://", "postgresql://")
if not url.rstrip("/").endswith("/pundo_test"):
    sys.exit(f"refusing: not pundo_test ({url.rsplit('/', 1)[-1]})")

with psycopg.connect(url) as conn:
    cur = conn.cursor()
    cur.execute("select id from items where slug=%s", (SLUG,))
    row = cur.fetchone()
    if row:
        item_id = row[0]
        cur.execute("""update items set status='active', item_type='product', names=%s, descriptions=%s,
                       category_id=%s, ean=%s, source='admin', updated_at=now() where id=%s""",
                    (json.dumps(NAMES), json.dumps(DESCRIPTIONS), CATEGORY_ID, EAN, item_id))
        action = "updated"
    else:
        cur.execute("""insert into items (slug, item_type, status, names, descriptions, category_id, ean, source)
                       values (%s,'product','active',%s,%s,%s,%s,'admin') returning id""",
                    (SLUG, json.dumps(NAMES), json.dumps(DESCRIPTIONS), CATEGORY_ID, EAN))
        item_id = cur.fetchone()[0]
        action = "inserted"
    cur.execute("select count(*) from item_photos where item_id=%s", (item_id,))
    has_photo = cur.fetchone()[0] > 0
    if not has_photo:
        v = {} if DRY else ingest_image_with_variants(PHOTO.read_bytes(), PHOTO.name)
        cur.execute("""insert into item_photos (item_id, contributed_by_shop_id, url, url_thumb, url_card, url_carousel,
                       url_detail, url_orig, thumbnail_url, sort_order) values (%s,NULL,%s,%s,%s,%s,%s,%s,%s,0)""",
                    (item_id, v.get("orig", "dry-run"), v.get("thumb"), v.get("card"), v.get("carousel"),
                     v.get("detail"), v.get("orig"), v.get("thumb")))
    cur.execute("""select o.email, s.slug from shop_owners o join shops s on s.id=o.shop_id where o.email = any(%s)""", (EMAILS,))
    shops = dict(cur.fetchall())
    # Part 2's prepare.sh deactivates the demo shops' own items (both languages) -> re-activate everything the
    # demo shops still offer (e.g. Anna's sourdough bread), so it shows next to the syrup on the shop page.
    cur.execute("""update items set status='active', updated_at=now() where status<>'active' and id in (
                     select sl.item_id from shop_listings sl join offers ofr on ofr.shop_listing_id=sl.id and not ofr.archived
                     join shop_owners o on o.shop_id=sl.shop_id where o.email = any(%s))""", (EMAILS,))
    reactivated = cur.rowcount
    print(f"item {action}: {item_id} ({SLUG}), photo {'kept' if has_photo else 'added'}, {reactivated} demo-shop item(s) re-activated" + (" [dry-run, rolled back]" if DRY else ""))
    if DRY:
        conn.rollback()
    else:
        conn.commit()
print(json.dumps({"item_id": item_id, "slug": SLUG, "ean": EAN, "shops": shops}))
