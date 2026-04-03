#!/usr/bin/env bash
set -euo pipefail

DB_NAME="openflash-db"
TMP_DIR=".wrangler/diff-tmp"
mkdir -p "$TMP_DIR"

echo "Comparing local vs remote database..."
echo ""

# Get table list from local
TABLES=$(npx wrangler d1 execute "$DB_NAME" --local \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations' ORDER BY name" \
  --json 2>/dev/null | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    d[0].results.forEach(r => console.log(r.name));
  ")

printf "%-30s %8s %8s %8s %8s %8s\n" "TABLE" "LOCAL" "REMOTE" "ADDED" "REMOVED" "CHANGED"
printf "%-30s %8s %8s %8s %8s %8s\n" "-----" "-----" "------" "-----" "-------" "-------"

for TABLE in $TABLES; do
  # Get primary key column for this table
  PK_COL=$(npx wrangler d1 execute "$DB_NAME" --local \
    --command "PRAGMA table_info($TABLE)" --json 2>/dev/null | node -e "
      const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      const pk = d[0].results.find(c => c.pk === 1);
      console.log(pk ? pk.name : 'rowid');
    ")

  # Export full rows as JSON for both local and remote
  npx wrangler d1 execute "$DB_NAME" --local \
    --command "SELECT * FROM $TABLE ORDER BY $PK_COL" --json 2>/dev/null > "$TMP_DIR/local_${TABLE}.json"

  npx wrangler d1 execute "$DB_NAME" --remote \
    --command "SELECT * FROM $TABLE ORDER BY $PK_COL" --json 2>/dev/null > "$TMP_DIR/remote_${TABLE}.json"

  # Compare using node
  RESULT=$(node -e "
    const pk = '$PK_COL';
    const local = JSON.parse(require('fs').readFileSync('$TMP_DIR/local_${TABLE}.json','utf8'))[0].results;
    const remote = JSON.parse(require('fs').readFileSync('$TMP_DIR/remote_${TABLE}.json','utf8'))[0].results;

    const normalize = (v) => (v === null || v === undefined || v === 'null') ? null : v;
    const normalizeRow = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, normalize(v)]));
    const localMap = new Map(local.map(r => [r[pk], JSON.stringify(normalizeRow(r))]));
    const remoteMap = new Map(remote.map(r => [r[pk], JSON.stringify(normalizeRow(r))]));

    let added = 0, removed = 0, changed = 0;

    for (const [id, json] of localMap) {
      if (!remoteMap.has(id)) added++;
      else if (remoteMap.get(id) !== json) changed++;
    }
    for (const id of remoteMap.keys()) {
      if (!localMap.has(id)) removed++;
    }

    console.log(local.length + ' ' + remote.length + ' ' + added + ' ' + removed + ' ' + changed);
  ")

  read -r LOCAL_COUNT REMOTE_COUNT ADDED REMOVED CHANGED <<< "$RESULT"

  ADD_STR=""; REM_STR=""; CHG_STR=""
  [ "$ADDED" -gt 0 ] && ADD_STR="+${ADDED}" || ADD_STR="-"
  [ "$REMOVED" -gt 0 ] && REM_STR="-${REMOVED}" || REM_STR="-"
  [ "$CHANGED" -gt 0 ] && CHG_STR="${CHANGED}" || CHG_STR="-"

  printf "%-30s %8s %8s %8s %8s %8s\n" "$TABLE" "$LOCAL_COUNT" "$REMOTE_COUNT" "$ADD_STR" "$REM_STR" "$CHG_STR"
done

# Show details for changed saved_verbs
if [ -f "$TMP_DIR/local_saved_verbs.json" ] && [ -f "$TMP_DIR/remote_saved_verbs.json" ]; then
  DETAILS=$(node -e "
    const local = JSON.parse(require('fs').readFileSync('$TMP_DIR/local_saved_verbs.json','utf8'))[0].results;
    const remote = JSON.parse(require('fs').readFileSync('$TMP_DIR/remote_saved_verbs.json','utf8'))[0].results;
    const remoteMap = new Map(remote.map(r => [r.id, r]));
    const localMap = new Map(local.map(r => [r.id, r]));

    const lines = [];

    for (const v of local) {
      const rv = remoteMap.get(v.id);
      if (!rv) {
        lines.push('  + ' + v.infinitive + ' (new)');
      } else if (JSON.stringify(v) !== JSON.stringify(rv)) {
        const localTenses = JSON.parse(v.conjugations).tenses.map(t => t.tense);
        const remoteTenses = JSON.parse(rv.conjugations).tenses.map(t => t.tense);
        const added = localTenses.filter(t => !remoteTenses.includes(t));
        const removed = remoteTenses.filter(t => !localTenses.includes(t));
        let detail = v.infinitive + ':';
        if (added.length) detail += ' +[' + added.join(', ') + ']';
        if (removed.length) detail += ' -[' + removed.join(', ') + ']';
        if (!added.length && !removed.length) detail += ' (other changes)';
        lines.push('  ~ ' + detail);
      }
    }
    for (const rv of remote) {
      if (!localMap.has(rv.id)) {
        lines.push('  - ' + rv.infinitive + ' (removed)');
      }
    }

    if (lines.length) {
      console.log('\nVerb changes:');
      lines.forEach(l => console.log(l));
    }
  ")
  echo "$DETAILS"
fi

echo ""
echo "Raw data saved in $TMP_DIR/ for inspection."
echo "Run 'npm run db:push' to overwrite remote with local."
