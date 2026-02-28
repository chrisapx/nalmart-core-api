#!/bin/sh
set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

echo "⏳ Waiting for MySQL at ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done
echo "✅ Database is reachable."

echo "🔄 Running database migrations..."
npx sequelize-cli db:migrate
echo "✅ Migrations complete."

echo "🚀 Starting server..."
exec node dist/app.js
