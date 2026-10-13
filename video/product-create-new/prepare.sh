#!/usr/bin/env bash
# Test-DB preparation for the product-create-new recording.  Usage: prepare.sh <lang> [--dry-run]
# Called by record.mjs before every recording (idempotent). ONLY pundo_test - aborts on any other DB.
#
#  1. Demo account (shop-signup/.recording-accounts.json -> <lang>): the signup video leaves it "pending"
#     and unverified (login answers 403). Approve + mark verified directly in the DB. Deliberately NOT via
#     PATCH /admin/shop-owners/{id}: that path runs auto-assign (extra listings on the demo shop) and sends
#     a welcome email to the fictional address. welcome_email_sent_at is set so no later path sends it.
#  2. Items that would show up in the item search of the video (search is a global fuzzy scan over all
#     active items, owners cannot delete items) are set to status 'inactive' (search filters on 'active'):
#       a) shop_manual items listed by any video demo shop (owner email video-*@pundo-e2e.io)
#          -> bread from earlier runs, also if the name has been auto-translated meanwhile
#       b) orphaned items with exactly the demo name (no listing at all, e.g. after an aborted run)
#       c) E2E leftovers with marker "E2E-" containing sourdough/προζυμ (B5900-011 creates
#          "Sourdough bread E2E-B5900-011-<id>" on every run; 4 of them on 2026-10-13)
#  Listings/offers of the demo shop are removed afterwards by record.mjs via the shop-owner API.
#  Output (last line): JSON {owner_id, shop_id, shop_slug, deactivated}
set -euo pipefail
LANG_ARG="${1:?usage: prepare.sh <lang> [--dry-run]}"
DRY=0; [ "${2:-}" = "--dry-run" ] && DRY=1
HERE="$(cd "$(dirname "$0")" && pwd)"
BACKEND="${PUNDO_BACKEND_DIR:-$HOME/dev/github/pundo_main_backend}"
ACC="$HERE/../shop-signup/.recording-accounts.json"
[ -f "$ACC" ] || { echo "missing $ACC (record the shop-signup video first)" >&2; exit 1; }
EMAIL="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]]["email"])' "$ACC" "$LANG_ARG")"
case "$EMAIL" in video-*@pundo-e2e.io) ;; *) echo "refusing: $EMAIL is not a video demo account" >&2; exit 1;; esac

URL="$(grep -E '^DATABASE_URL_TEST=' "$BACKEND/.env" | head -1 | cut -d= -f2- | tr -d "\"'" | sed -E 's#\+(psycopg2|psycopg|asyncpg)##')"
case "$URL" in */pundo_test|*/pundo_test\?*) ;; *) echo "refusing: DATABASE_URL_TEST does not point to pundo_test" >&2; exit 1;; esac

NAME_EN='Sourdough bread 750 g'
NAME_EL='Ψωμί προζυμιού 750 γρ.'
END="COMMIT"; [ $DRY -eq 1 ] && END="ROLLBACK"

psql "$URL" -X -q -At -v ON_ERROR_STOP=1 -v email="$EMAIL" -v n_en="$NAME_EN" -v n_el="$NAME_EL" <<SQL
BEGIN;
DO \$\$ BEGIN IF current_database() <> 'pundo_test' THEN RAISE EXCEPTION 'not pundo_test'; END IF; END \$\$;

UPDATE shop_owners
   SET status = 'approved',
       email_verified_at = coalesce(email_verified_at, now()),
       email_verification_token = NULL,
       email_verification_expires_at = NULL,
       welcome_email_sent_at = coalesce(welcome_email_sent_at, now()),
       updated_at = now()
 WHERE email = :'email' AND email LIKE 'video-%@pundo-e2e.io' AND status IN ('pending', 'approved');

CREATE TEMP TABLE vid_deact ON COMMIT DROP AS
SELECT i.id FROM items i
 WHERE i.status = 'active' AND (
       (i.source = 'shop_manual' AND EXISTS (
          SELECT 1 FROM shop_listings sl JOIN shop_owners o ON o.shop_id = sl.shop_id
           WHERE sl.item_id = i.id AND o.email LIKE 'video-%@pundo-e2e.io'))
    OR (i.source = 'shop_manual' AND (i.names->>'en' = :'n_en' OR i.names->>'el' = :'n_el')
        AND NOT EXISTS (SELECT 1 FROM shop_listings sl WHERE sl.item_id = i.id))
    OR (i.names::text LIKE '%E2E-%' AND (i.names::text ILIKE '%sourdough%' OR i.names::text ILIKE '%προζυμ%')));

UPDATE items SET status = 'inactive', updated_at = now() WHERE id IN (SELECT id FROM vid_deact);

SELECT json_build_object('owner_id', o.id, 'status', o.status, 'shop_id', s.id, 'shop_slug', s.slug,
                         'deactivated', (SELECT count(*) FROM vid_deact), 'dry_run', $DRY = 1)
  FROM shop_owners o JOIN shops s ON s.id = o.shop_id WHERE o.email = :'email';
$END;
SQL
