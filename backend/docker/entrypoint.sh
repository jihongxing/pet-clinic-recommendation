#!/bin/sh
set -eu

echo "[entrypoint] running database migrations"
node dist/database/run-migrations.js

echo "[entrypoint] starting application"
exec "$@"
