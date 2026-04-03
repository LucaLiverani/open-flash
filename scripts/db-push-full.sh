#!/usr/bin/env bash
set -euo pipefail

DB_NAME="openflash-db"
DUMP_FILE=".wrangler/push-dump.sql"

echo "⚠️  This will FULLY OVERWRITE the remote database with your local copy."
read -p "Are you sure? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

echo "Exporting local D1 database..."
npx wrangler d1 export "$DB_NAME" --local --output="$DUMP_FILE"

echo "Preparing import file..."
REORDERED="${DUMP_FILE%.sql}-reordered.sql"

# Extract table names and generate DROP statements in reverse order
TABLES=$(grep -oP '(?<=CREATE TABLE )\w+' "$DUMP_FILE" | tac)
{
  for T in $TABLES; do
    echo "DROP TABLE IF EXISTS $T;"
  done
  # DDL first, then DML
  grep -v '^INSERT ' "$DUMP_FILE"
  grep '^INSERT ' "$DUMP_FILE"
} > "$REORDERED"

echo "Pushing to remote database..."
npx wrangler d1 execute "$DB_NAME" --remote --file="$REORDERED" --yes

rm -f "$REORDERED" "$DUMP_FILE"

echo "Done! Remote database is now a 1:1 copy of local."
