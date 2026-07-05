# Módulo de Mercadeo · Comfaguajira

Plataforma web del área de Mercadeo Estratégico. Integra el **turnero** de atención
al cliente (kiosko + TV) con los procesos comerciales: cada cliente saca turno, la
**TV** muestra el llamado y el **asesor** registra la atención, la venta o la cotización.

- **Frontend:** React 18 + Vite (SPA).
- **Backend:** Node + Express, **MySQL 8** (BD de Mercadeo), tiempo real con **SSE**.
- **Auth:** login con JWT (sesion deslizante de 30 min) y contrasenas hasheadas (bcrypt),
  roles `asesor_integral` / `asesor_comercial` / `coordinador` / `admin`.

Ademas del turnero, incluye los modulos comerciales: **Ventas**, **Cotizaciones**
(con ciclo de vida y alertas), **Facturaciones**, **Parametrizacion**, **BI por rol** y **Auditoria**.

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

## Despliegue en Railway (recomendado para demo / staging)

Railway construye con el `Dockerfile` del repo (un solo contenedor sirve el
frontend y la API) y **aplica las migraciones solo al arrancar**.

1. **New Project → Deploy from GitHub repo** → elige el repo y la rama.
2. **Add → Database → MySQL** — Railway lo provisiona y expone sus variables.
3. En el **servicio de la app**, pestana *Variables*, define (referenciando la BD):

   ```
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   JWT_SECRET=<una-cadena-larga-y-aleatoria>
   ADMIN_USER=admin
   ADMIN_PASSWORD=<clave-segura>
   NODE_ENV=production
   WS_PROVIDER=mock
   BACKUP_ENABLED=false      # en Railway usa los backups gestionados de la BD
   ```
4. **Settings → Networking → Generate Domain** para obtener la URL publica.
   Railway inyecta `PORT` automaticamente; la app ya lo respeta.

> La BD queda en la red privada de Railway. Es ideal para **mostrar la plataforma**
> con datos mock de SISU; para produccion real de Comfaguajira, ver on-premise abajo.

## Despliegue con Docker Compose (servidor propio)

Levanta MySQL + la app juntos. Un solo contenedor sirve el frontend y la API.

```bash
# 1. Configura las variables
cp .env.example .env
#   -> edita JWT_SECRET, ADMIN_PASSWORD y DB_PASSWORD (obligatorio)

# 2. Construye y levanta (las migraciones se aplican solas al arrancar)
docker compose up -d --build
```

La app queda en `http://<host>:4000`. Los datos persisten en el volumen
`mercadeo-mysql-data`. Delante conviene un nginx con el dominio interno + HTTPS.

### Variables de entorno principales

| Variable | Por defecto | Descripcion |
|----------|-------------|-------------|
| `PORT` | `4000` | Puerto del servidor (Railway lo inyecta) |
| `JWT_SECRET` | — | Secreto para firmar sesiones (**cambiar**) |
| `JWT_TTL` | `30m` | Expiracion por inactividad (ventana deslizante) |
| `CORS_ORIGIN` | `*` | Origen permitido para CORS |
| `ADMIN_USER` / `ADMIN_PASSWORD` | `admin` / `admin123` | Admin sembrado en el primer arranque |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | — | Conexion a MySQL |
| `WS_PROVIDER` | `mock` | SISU: `mock` / `rest` / `soap` / `off` |
| `SMTP_HOST` … `SMTP_FROM` | vacio | Correo de alertas (vacio = solo notificacion interna) |
| `BACKUP_ENABLED` | `true` | Respaldo diario con `mysqldump` (2am) en bare-metal |

Ver `.env.example` para la lista completa.

### Sin Docker (servidor on-premise / bare-metal)

```bash
npm ci && npm run build          # genera dist/
cd server && npm ci --omit=dev
npm run migrate                  # crea/actualiza las tablas (idempotente)
cd ..
# define las variables (o usa server/.env) y arranca:
NODE_ENV=production node server/index.js
```

Con `NODE_ENV=production` el backend sirve `dist/` y la API desde el puerto 4000.
Para que arranque solo, usar PM2 (`pm2 start server/index.js --name mercadeo`) o un
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

## Backups de la base de datos (MySQL)

El respaldo se hace con `mysqldump` (comprimido a `.sql.gz`). Segun el despliegue:

- **Railway:** usa los **backups gestionados** del servicio MySQL (deja `BACKUP_ENABLED=false`).
- **Bare-metal (on-premise):** el backend ya trae un cron diario a las 2am
  (`server/backup.js`). Configuralo por env y apunta `BACKUP_DIR` a un disco o
  recurso de red **distinto** al servidor principal (lo exige la arquitectura):

  ```bash
  # manual / verificacion
  cd server && npm run backup
  ```

  Variables: `BACKUP_DIR`, `BACKUP_RETENTION_DAYS` (por defecto 14),
  `MYSQLDUMP_PATH` (si `mysqldump` no esta en el PATH), `BACKUP_ENABLED`.

- **Docker Compose:** el cron interno queda desactivado (el contenedor es
  efimero). Programa en el host un dump desde el servicio `mysql`:

  ```bash
  docker compose exec -T mysql \
    mysqldump -u root -p"$DB_ROOT_PASSWORD" --single-transaction mercadeo \
    | gzip > /ruta/backups/mercadeo-$(date +%F).sql.gz
  ```

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
