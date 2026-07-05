#!/usr/bin/env bash
# Copia de seguridad de la BD de Mercadeo (MySQL, contenedor Docker).
# Uso:   ./scripts/backup.sh [carpeta_destino]
# Cron:  0 22 * * *  /ruta/al/proyecto/scripts/backup.sh /ruta/backups
#
# IMPORTANTE (seccion 12 del plan, requisito "Backup"): DEST debe apuntar a una
# ubicacion DISTINTA al servidor principal (NAS, bucket montado, disco externo).
# El valor por defecto (./backups) es solo para pruebas locales.
set -euo pipefail

DEST="${1:-./backups}"
CONTAINER="${MYSQL_CONTAINER:-mercadeo-mysql}"
DB_NAME="${DB_NAME:-mercadeo}"
DB_USER="${DB_USER:-mercadeo}"
DB_PASSWORD="${DB_PASSWORD:-}"
STAMP="$(date +%Y-%m-%d_%H%M)"

mkdir -p "$DEST"
OUT_FILE="$(cd "$DEST" && pwd)/mercadeo-${STAMP}.sql"

docker exec "$CONTAINER" mysqldump -u "$DB_USER" -p"$DB_PASSWORD" \
  --single-transaction --routines --triggers "$DB_NAME" > "$OUT_FILE"

echo "Backup creado: ${OUT_FILE}"

# Conserva solo los ultimos 30 respaldos.
ls -1t "${DEST}"/mercadeo-*.sql 2>/dev/null | tail -n +31 | xargs -r rm -f
