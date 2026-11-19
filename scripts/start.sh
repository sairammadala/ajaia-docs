#!/bin/sh
set -e
node scripts/migrate.mjs
node scripts/seed.mjs
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
