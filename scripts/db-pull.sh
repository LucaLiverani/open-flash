#!/usr/bin/env bash
set -euo pipefail

DB_NAME="openflash-db"
DUMP_FILE=".wrangler/sync-dump.sql"
LOCAL_D1_DIR=".wrangler/state/v3/d1"

echo "Exporting remote D1 database..."
npx wrangler d1 export "$DB_NAME" --remote --output="$DUMP_FILE"

echo "Wiping local database..."
rm -rf "$LOCAL_D1_DIR"

echo "Importing remote data into local database..."
npx wrangler d1 execute "$DB_NAME" --local --file="$DUMP_FILE"

rm -f "$DUMP_FILE"

echo "Done! Local database is now a 1:1 copy of remote."
