#!/usr/bin/env bash
set -euo pipefail

DB_NAME="openflash-db"
TMP_DIR=".wrangler/push-tmp"
SQL_FILE="$TMP_DIR/delta.sql"
mkdir -p "$TMP_DIR"

echo "Computing delta between local and remote..."

# Get table list
TABLES=$(npx wrangler d1 execute "$DB_NAME" --local \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations' ORDER BY name" \
  --json 2>/dev/null | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    d[0].results.forEach(r => console.log(r.name));
  ")

> "$SQL_FILE"

for TABLE in $TABLES; do
  # Get primary key
  PK_COL=$(npx wrangler d1 execute "$DB_NAME" --local \
    --command "PRAGMA table_info($TABLE)" --json 2>/dev/null | node -e "
      const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      const pk = d[0].results.find(c => c.pk === 1);
      console.log(pk ? pk.name : 'rowid');
    ")

  # Export both
  npx wrangler d1 execute "$DB_NAME" --local \
    --command "SELECT * FROM $TABLE ORDER BY $PK_COL" --json 2>/dev/null > "$TMP_DIR/local_${TABLE}.json"

  npx wrangler d1 execute "$DB_NAME" --remote \
    --command "SELECT * FROM $TABLE ORDER BY $PK_COL" --json 2>/dev/null > "$TMP_DIR/remote_${TABLE}.json"

  # Generate SQL delta
  node -e "
    const local = JSON.parse(require('fs').readFileSync('$TMP_DIR/local_${TABLE}.json','utf8'))[0].results;
    const remote = JSON.parse(require('fs').readFileSync('$TMP_DIR/remote_${TABLE}.json','utf8'))[0].results;
    const pk = '$PK_COL';
    const table = '$TABLE';

    const normalize = (v) => (v === null || v === undefined || v === 'null') ? null : v;
    const normalizeRow = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, normalize(v)]));

    const localMap = new Map(local.map(r => [r[pk], normalizeRow(r)]));
    const remoteMap = new Map(remote.map(r => [r[pk], normalizeRow(r)]));

    const esc = (v) => v === null ? 'NULL' : \"'\" + String(v).replace(/'/g, \"''\") + \"'\";
    const stmts = [];

    // Inserts & updates
    for (const [id, row] of localMap) {
      const remoteRow = remoteMap.get(id);
      if (!remoteRow) {
        const cols = Object.keys(row);
        stmts.push('INSERT INTO ' + table + ' (' + cols.join(', ') + ') VALUES (' + cols.map(c => esc(row[c])).join(', ') + ');');
      } else if (JSON.stringify(row) !== JSON.stringify(remoteRow)) {
        const cols = Object.keys(row).filter(c => c !== pk);
        const sets = cols.map(c => c + ' = ' + esc(row[c])).join(', ');
        stmts.push('UPDATE ' + table + ' SET ' + sets + ' WHERE ' + pk + ' = ' + esc(id) + ';');
      }
    }

    // Deletes
    for (const id of remoteMap.keys()) {
      if (!localMap.has(id)) {
        stmts.push('DELETE FROM ' + table + ' WHERE ' + pk + ' = ' + esc(id) + ';');
      }
    }

    if (stmts.length) {
      console.log('-- ' + table + ': ' + stmts.length + ' changes');
      stmts.forEach(s => console.log(s));
    }
  " >> "$SQL_FILE"
done

# Check if there's anything to push
if [ ! -s "$SQL_FILE" ]; then
  echo "No changes to push. Local and remote are in sync."
  rm -rf "$TMP_DIR"
  exit 0
fi

echo ""
echo "Delta to push:"
grep '^-- ' "$SQL_FILE"
echo ""

TOTAL=$(grep -c '^[^-]' "$SQL_FILE" || true)
read -p "Push $TOTAL statement(s) to remote? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Aborted."
  rm -rf "$TMP_DIR"
  exit 0
fi

npx wrangler d1 execute "$DB_NAME" --remote --file="$SQL_FILE" --yes

rm -rf "$TMP_DIR"

echo "Done! Delta pushed to remote."
