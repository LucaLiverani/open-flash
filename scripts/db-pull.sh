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
# D1 export doesn't guarantee topological table order, so INSERTs can
# reference tables that haven't been created yet. Reorder the dump:
# DDL first (CREATE/PRAGMA/DELETE), then DML (INSERT).
REORDERED="${DUMP_FILE%.sql}-reordered.sql"
grep -v '^INSERT ' "$DUMP_FILE" > "$REORDERED"
grep '^INSERT ' "$DUMP_FILE" >> "$REORDERED"
npx wrangler d1 execute "$DB_NAME" --local --file="$REORDERED"
rm -f "$REORDERED"

rm -f "$DUMP_FILE"

echo "Done! Local database is now a 1:1 copy of remote."
