#!/bin/sh
set -e
node scripts/migrate.mjs
if [ "$SEED_DEMO_DATA" = "true" ]; then
  node scripts/seed.mjs
fi
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
