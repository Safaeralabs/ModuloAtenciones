#!/usr/bin/env bash
# Abre la pantalla de la TV (o el kiosko) en Chromium a pantalla completa.
# Pensado para un mini-PC / Raspberry Pi conectado a la TV por HDMI.
#
# Configura la URL del servidor y cual pantalla mostrar:
#   TURNERO_URL  -> http://192.168.1.10:4000/#/tv   (TV de llamado)
#                   http://192.168.1.10:4000/#/kiosko (kiosko iPad/pantalla tactil)
#
# Autoarranque en Raspberry Pi OS (escritorio):
#   crea ~/.config/autostart/turnero.desktop con:
#     [Desktop Entry]
#     Type=Application
#     Name=Turnero
#     Exec=/ruta/al/proyecto/scripts/tv-kiosk.sh
set -euo pipefail

URL="${TURNERO_URL:-http://192.168.1.10:4000/#/tv}"

# Evita que la pantalla se apague o entre el salvapantallas.
command -v xset >/dev/null && { xset s off; xset -dpms; xset s noblank; } || true

# Detecta el navegador disponible.
BROWSER="$(command -v chromium-browser || command -v chromium || command -v google-chrome || true)"
if [ -z "$BROWSER" ]; then
  echo "No se encontro Chromium/Chrome. Instala chromium-browser." >&2
  exit 1
fi

exec "$BROWSER" \
  --kiosk \
  --incognito \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  --autoplay-policy=no-user-gesture-required \
  "$URL"
