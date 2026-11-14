#!/usr/bin/env sh
set -eu

: "${BACKUP_DATABASE_URL:?Configurá BACKUP_DATABASE_URL antes de ejecutar el backup}"
umask 077
mkdir -p ./backups
target="./backups/$(date -u +%Y%m%dT%H%M%SZ).dump"
if [ -e "$target" ]; then
    echo "Ya existe un backup con ese nombre." >&2
    exit 1
fi
export PGDATABASE="$BACKUP_DATABASE_URL"
pg_dump -Fc -f "$target"
echo "Backup creado en $target"
