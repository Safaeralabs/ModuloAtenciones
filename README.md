# Modulo de Atencion · Turnero Comfaguajira

Sistema de turnero para puntos de atencion: el cliente saca turno en un **kiosko (iPad)**,
la **TV** muestra el llamado, y el **asesor** gestiona la cola y registra la atencion.

- **Frontend:** React 18 + Vite (SPA).
- **Backend:** Node + Express, **SQLite** (better-sqlite3), tiempo real con **SSE**.
- **Auth:** login con JWT y contrasenas hasheadas (bcrypt), roles `asesor` / `admin`.

## Pantallas

| Ruta | Uso | Acceso |
|------|-----|--------|
| `/` | Dashboard del asesor (cola, llamar, registrar) | Requiere login |
| `/#/kiosko` | Kiosko para sacar turno (iPad) | Publico |
| `/#/tv` | Pantalla de llamado (TV) | Publico |

---

## Desarrollo local

```bash
# 1. Dependencias
npm install
cd server && npm install && cd ..

# 2. Levantar backend (:4000) + frontend (:5173)
npm run dev:all
```

Abrir http://localhost:5173. El proxy de Vite redirige `/api` al backend.

**Usuarios sembrados (demo):**

| Usuario | Contrasena | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | admin |
| `mfernanda` | `asesor123` | asesor |
| `cruiz` | `asesor123` | asesor |

---

## Despliegue en produccion (Docker)

Un solo contenedor sirve el frontend y la API.

```bash
# 1. Configura las variables
cp .env.example .env
#   -> edita JWT_SECRET y ADMIN_PASSWORD (obligatorio)

# 2. Construye y levanta
docker compose up -d --build
```

La app queda en `http://<host>:4000`. La base de datos SQLite persiste en el
volumen `turnero-data` (sobrevive a reinicios y actualizaciones del contenedor).

### Variables de entorno

| Variable | Por defecto | Descripcion |
|----------|-------------|-------------|
| `PORT` | `4000` | Puerto del servidor |
| `JWT_SECRET` | — | Secreto para firmar sesiones (**cambiar**) |
| `CORS_ORIGIN` | `*` | Origen permitido para CORS |
| `ADMIN_USER` / `ADMIN_PASSWORD` | `admin` / `admin123` | Admin sembrado en el primer arranque |
| `DB_PATH` | `server/data/turnero.db` | Ruta del archivo SQLite |

### Sin Docker (servidor on-premise)

```bash
npm ci && npm run build          # genera dist/
cd server && npm ci --omit=dev && cd ..
# define las variables (o usa un archivo .env) y arranca:
NODE_ENV=production node server/index.js
```

Con `NODE_ENV=production` el backend sirve `dist/` y la API desde el puerto 4000.
Para que arranque solo, usar PM2 (`pm2 start server/index.js --name turnero`) o un
servicio del sistema.

---

## Dispositivos (iPad / TV)

- Conectar iPad y TV a la misma red que el servidor.
- **iPad (kiosko):** abrir `http://<host>:4000/#/kiosko` en modo Acceso Guiado.
- **TV:** abrir `http://<host>:4000/#/tv` a pantalla completa; pulsar
  "Activar sonido" una vez para habilitar el aviso sonoro.

---

## Gestion de usuarios

Inicia sesion con un usuario **admin** → menu **Usuarios**. Desde ahi puedes:
- Crear asesores/administradores (usuario, nombre, contrasena, rol).
- Cambiar el rol, activar/desactivar y resetear la contrasena.
- El sistema impide desactivar tu propia cuenta o quedarte sin administradores.

> En el primer arranque se siembra el admin definido en `.env` (`ADMIN_USER`/`ADMIN_PASSWORD`).
> Crea los usuarios reales y cambia las contrasenas de demo.

## Backups de la base de datos

La BD vive en el volumen Docker `turnero-data`. Hay scripts listos:

```bash
# Linux/macOS (programar con cron, p. ej. diario a las 10pm)
./scripts/backup.sh /ruta/a/backups

# Windows (programar con el Programador de tareas)
powershell -File .\scripts\backup.ps1 C:\backups
```

Ambos conservan los ultimos 30 respaldos automaticamente.

## Autostart de la TV / kiosko (mini-PC o Raspberry Pi)

`scripts/tv-kiosk.sh` abre Chromium a pantalla completa apuntando a la TV o al kiosko:

```bash
TURNERO_URL="http://192.168.1.10:4000/#/tv" ./scripts/tv-kiosk.sh
```

Para que arranque solo en Raspberry Pi OS, crea `~/.config/autostart/turnero.desktop`
(ver instrucciones dentro del propio script). En **Windows**, crea un acceso directo a
Chrome con los argumentos `--kiosk http://192.168.1.10:4000/#/tv` en la carpeta `Inicio`.

## Notas

- Los turnos se reinician automaticamente cada dia; las atenciones quedan en el historico.
- **Habeas Data (Ley 1581/2012):** el kiosko ya muestra el aviso de tratamiento de datos.
  Antes de produccion, enlaza la **politica de privacidad** oficial y define la **retencion**
  de datos (cuanto tiempo se conservan las atenciones).
