# Sistema de Turnero · Módulo de Atención — Comfaguajira
### Guía completa: arquitectura, topología, despliegue y operación

> Documento de referencia para el montaje, despliegue y operación del sistema de
> turnero en un punto de atención de Comfaguajira.

---

## Índice

1. [Qué es el sistema](#1-qué-es-el-sistema)
2. [Componentes y arquitectura](#2-componentes-y-arquitectura)
3. [Topología de red](#3-topología-de-red)
4. [Qué se necesita (hardware, software, red)](#4-qué-se-necesita)
5. [Cómo funciona (flujos)](#5-cómo-funciona-flujos)
6. [Pantallas y rutas](#6-pantallas-y-rutas)
7. [Usuarios y roles](#7-usuarios-y-roles)
8. [Despliegue paso a paso](#8-despliegue-paso-a-paso)
9. [Configuración (variables de entorno)](#9-configuración-variables-de-entorno)
10. [Configuración de los dispositivos](#10-configuración-de-los-dispositivos)
11. [Operación diaria y mantenimiento](#11-operación-diaria-y-mantenimiento)
12. [Seguridad](#12-seguridad)
13. [Protección de datos (Habeas Data)](#13-protección-de-datos-habeas-data)
14. [Solución de problemas](#14-solución-de-problemas)
15. [Referencia de la API](#15-referencia-de-la-api)
16. [Checklist de producción](#16-checklist-de-producción)

---

## 1. Qué es el sistema

Un **sistema de gestión de filas (turnero)** para puntos de atención. Tiene tres caras:

- **Kiosko (iPad):** el cliente saca su turno eligiendo el servicio e ingresando su cédula.
- **TV (pantalla de llamado):** muestra en grande el turno que se está atendiendo, el
  módulo al que debe dirigirse y los últimos llamados; emite un sonido al llamar.
- **Asesor (dashboard):** llama el siguiente turno, lo atiende y registra la atención.

Además, el sistema lleva el **historial de atenciones**, calcula **tiempos reales** de
espera y atención, y maneja **prioridades** (adulto mayor, gestante, etc.).

---

## 2. Componentes y arquitectura

```
┌───────────────────────────────────────────────────────────────┐
│                     SERVIDOR (un contenedor)                   │
│                                                                │
│   ┌──────────────┐        ┌────────────────────────────────┐  │
│   │  Frontend    │        │  Backend (Node + Express)      │  │
│   │  React + Vite│◄──────►│  - API REST (turnos, auth...)  │  │
│   │  (SPA)       │  HTTP  │  - SSE (tiempo real a TV/kiosko)│  │
│   └──────────────┘        │  - Sirve el frontend (prod)    │  │
│                           └───────────────┬────────────────┘  │
│                                           │                    │
│                                  ┌────────▼────────┐           │
│                                  │  SQLite (BD)    │           │
│                                  │  turnos /       │           │
│                                  │  atenciones /   │           │
│                                  │  usuarios       │           │
│                                  └─────────────────┘           │
└───────────────────────────────────────────────────────────────┘
```

| Capa | Tecnología | Función |
|------|-----------|---------|
| Frontend | React 18 + Vite (SPA) | Kiosko, TV, dashboard del asesor |
| Backend | Node.js + Express | API REST, autenticación, tiempo real (SSE) |
| Base de datos | SQLite (better-sqlite3) | Turnos del día, historial de atenciones, usuarios |
| Tiempo real | SSE (Server-Sent Events) | Empuja cambios a la TV y al kiosko al instante |
| Autenticación | JWT + bcrypt | Login con roles (asesor / admin) |
| Empaquetado | Docker | Un solo contenedor desplegable |

**En producción, un único proceso sirve todo** (el frontend y la API en el mismo puerto),
así que el despliegue es un solo contenedor.

---

## 3. Topología de red

```
                  Router / Switch (red local de la sede)
                              │
   ┌──────────────┬──────────┴───────┬──────────────────┐
 SERVIDOR        iPad(s)            TV(s)            PCs asesores
 (Docker)        Kiosko            Pantalla          Dashboard
 IP fija         #/kiosko          #/tv              (login)
 192.168.1.10
 puerto 4000
```

- Todo opera dentro de la **misma red local (LAN)**. No requiere internet para funcionar.
- El **servidor** tiene una **IP fija** (ej. `192.168.1.10`) y expone el puerto **4000**.
- Cada dispositivo solo **abre una URL** en su navegador:
  - iPad → `http://192.168.1.10:4000/#/kiosko`
  - TV → `http://192.168.1.10:4000/#/tv`
  - Asesor → `http://192.168.1.10:4000`

---

## 4. Qué se necesita

### Hardware

| Equipo | Cantidad | Para qué | Recomendación |
|--------|----------|----------|---------------|
| **Servidor** | 1 | Corre el contenedor | Mini-PC siempre encendido. 2 GB RAM bastan (el app es liviano). Linux ideal; Windows con Docker Desktop también sirve. |
| **iPad** (o tablet) | 1+ | Kiosko | Soporte de mesa o pedestal a la entrada. |
| **TV** | 1+ | Pantalla de llamado | Smart TV con navegador, **o** TV normal + mini-PC/Raspberry Pi por HDMI. |
| **Reproductor TV** | según TV | Abre la URL `#/tv` | Raspberry Pi o mini-PC si la TV no tiene navegador usable. |
| **PCs asesores** | los existentes | Dashboard | Cualquier PC con navegador moderno. |
| **Router/Switch** | 1 | Red local | El de la sede; con UPS de preferencia. |
| **UPS** | recomendado | Continuidad | Para el servidor y el reproductor de la TV. |

### Software

- **En el servidor:** Docker + Docker Compose (o, sin Docker: Node.js 20+).
- **En los dispositivos:** solo un navegador moderno (Safari, Chrome, Edge).

### Red

- Red local cableada o WiFi estable.
- **IP fija** para el servidor (reserva por DHCP en el router, o estática).
- Los dispositivos deben poder alcanzar `http://<IP-servidor>:4000`.

---

## 5. Cómo funciona (flujos)

### Flujo principal

```
  KIOSKO (iPad)              ASESOR (dashboard)            TV
  ───────────────           ────────────────────         ──────────────
  Elige servicio
  Ingresa cédula
  (¿prioritario?)
       │
       └─► genera turno ──►  En espera: N  ◄────────────  En espera: N
           S-045
                            "Llamar siguiente"
                            (prioritarios primero,
                             luego orden de llegada)
                                   │
                                   └──────────────────►   TURNO S-045
                                                          → Módulo 3  🔔
                            "Registrar atención"
                            (formulario prellenado
                             con cédula y servicio)
                                   │
                                   └─► Guardar ──► turno atendido,
                                       queda en el Historial con
                                       tiempos reales de espera/atención
```

### Detalles

- **Numeración por servicio:** cada servicio tiene un prefijo (Subsidio→`S`, Crédito→`C`,
  Asesor Integral→`A`, Mercadeo→`M`, Afiliaciones→`F`, PQRS→`P`). Ej.: `S-045`.
- **Prioridad:** los turnos marcados como prioritarios (adulto mayor, gestante, movilidad
  reducida, discapacidad) se llaman **antes** que los normales.
- **Rellamar:** si el cliente no aparece, el asesor puede volver a anunciarlo (la TV suena
  otra vez) o marcarlo **ausente** (sale de la cola).
- **Cliente conocido:** si la cédula ya tiene atenciones previas, el formulario prellena
  nombre y teléfono automáticamente.
- **Tiempo real:** todo se sincroniza al instante por SSE; no hay que recargar.
- **Reinicio diario:** la numeración vuelve a empezar cada día; el historial se conserva.

---

## 6. Pantallas y rutas

| Ruta | Pantalla | Acceso |
|------|----------|--------|
| `/` | Dashboard del asesor (cola, llamar, registrar, métricas, historial) | Requiere login |
| `/#/kiosko` | Kiosko para sacar turno | Público |
| `/#/tv` | Pantalla de llamado (TV) | Público |
| Menú **Historial** | Atenciones registradas | Requiere login |
| Menú **Reportes** | Indicadores y gráficas | Requiere login |
| Menú **Usuarios** | Gestión de usuarios | Solo **admin** |

---

## 7. Usuarios y roles

Dos roles:

- **Asesor:** atiende la cola y registra atenciones.
- **Admin:** todo lo del asesor + gestión de usuarios (menú **Usuarios**).

Desde **Usuarios** (como admin) puedes: crear usuarios, cambiar rol, activar/desactivar y
resetear contraseña. El sistema impide desactivar tu propia cuenta o quedar sin administradores.

**Usuarios sembrados en el primer arranque** (cambiar en producción):

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | (definida en `.env`, por defecto `admin123`) | admin |
| `mfernanda` | `asesor123` | asesor |
| `cruiz` | `asesor123` | asesor |

---

## 8. Despliegue paso a paso

### Opción A — Docker (recomendada)

En el servidor, dentro de la carpeta del proyecto:

```bash
# 1. Configura las variables de entorno
cp .env.example .env
#    Edita .env y cambia, como mínimo:
#      - JWT_SECRET     (una cadena larga y aleatoria)
#      - ADMIN_PASSWORD (la clave del administrador)

# 2. Construye y levanta el contenedor
docker compose up -d --build

# 3. Verifica
#    Abre http://<IP-servidor>:4000 desde cualquier PC de la red
```

- La app queda en `http://<IP-servidor>:4000`.
- La base de datos persiste en el volumen `turnero-data` (sobrevive a reinicios y
  actualizaciones del contenedor).
- Con `restart: unless-stopped` + Docker en el arranque del sistema, **se levanta solo**.

### Opción B — Sin Docker (on-premise con Node)

```bash
npm ci && npm run build              # genera el frontend (dist/)
cd server && npm ci --omit=dev && cd ..
# define las variables (o usa un archivo .env) y arranca en modo producción:
NODE_ENV=production node server/index.js
```

Para que arranque solo, usar **PM2** (`pm2 start server/index.js --name turnero` y
`pm2 startup`) o registrarlo como servicio del sistema.

### Actualizar el sistema

```bash
# (con el código nuevo en el servidor)
docker compose up -d --build
```
La BD está en el volumen, así que **no se pierde** al actualizar.

---

## 9. Configuración (variables de entorno)

Archivo `.env` (basado en `.env.example`):

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `NODE_ENV` | `production` | En `production` el backend sirve el frontend y aplica seguridad |
| `PORT` | `4000` | Puerto del servidor |
| `JWT_SECRET` | — | **Cambiar.** Secreto para firmar las sesiones (JWT) |
| `CORS_ORIGIN` | `*` | Origen permitido para CORS |
| `ADMIN_USER` / `ADMIN_PASSWORD` | `admin` / `admin123` | Admin sembrado en el primer arranque |
| `DB_PATH` | `server/data/turnero.db` | Ruta del archivo SQLite (en Docker: `/data/turnero.db`) |

---

## 10. Configuración de los dispositivos

### iPad (kiosko)

1. Safari → `http://<IP-servidor>:4000/#/kiosko`
2. Activa **Acceso Guiado** (Ajustes › Accesibilidad › Acceso Guiado) para que el cliente
   no pueda salir de la app.
3. (Opcional) "Añadir a pantalla de inicio" para abrirlo a pantalla completa.

### TV (pantalla de llamado)

1. Navegador → `http://<IP-servidor>:4000/#/tv` a **pantalla completa**.
2. Pulsa **"Activar sonido"** una vez (los navegadores bloquean el audio hasta el primer toque).
3. Con mini-PC / Raspberry Pi, usa el script de autoarranque:
   ```bash
   TURNERO_URL="http://<IP-servidor>:4000/#/tv" ./scripts/tv-kiosk.sh
   ```
   Para que arranque solo en Raspberry Pi OS, crea `~/.config/autostart/turnero.desktop`
   (instrucciones dentro del script). En Windows, un acceso directo a Chrome con
   `--kiosk http://<IP-servidor>:4000/#/tv` en la carpeta `Inicio`.

### PCs de asesores

Abren `http://<IP-servidor>:4000`, inician sesión, eligen su módulo y trabajan.

---

## 11. Operación diaria y mantenimiento

- **Reinicio diario:** automático. Cada día la numeración vuelve a `S-001`; el historial
  de atenciones se conserva.
- **Backups de la BD:** scripts listos (conservan los últimos 30 respaldos):
  ```bash
  # Linux/macOS (programar con cron, p. ej. diario a las 10 pm)
  ./scripts/backup.sh /ruta/a/backups

  # Windows (programar con el Programador de tareas)
  powershell -File .\scripts\backup.ps1 C:\backups
  ```
- **Reinicio del servicio:** `docker compose restart` (o reiniciar el servidor; vuelve solo).
- **Logs:** `docker compose logs -f turnero`.

---

## 12. Seguridad

- **Autenticación:** las acciones del asesor (llamar, atender, registrar, usuarios) exigen
  un token JWT válido. El kiosko y la TV son públicos (solo crear turno y leer estado).
- **Contraseñas:** se guardan **hasheadas con bcrypt**, nunca en texto plano.
- **Protecciones:** `helmet` (cabeceras seguras), límite de tamaño de petición, y
  **rate-limiting** en el login y en la creación de turnos (anti-abuso).
- **Buenas prácticas:**
  - Cambiar `JWT_SECRET` y la clave de admin antes de producción.
  - Mantener el servidor y los dispositivos en una red controlada.
  - Hacer backups periódicos (ver arriba).

---

## 13. Protección de datos (Habeas Data)

El kiosko captura la **cédula** del cliente. El sistema ya muestra el **aviso de tratamiento
de datos** (Ley 1581 de 2012) en el kiosko y un texto de autorización al generar el turno.

**Antes de producción, Comfaguajira debe:**
- Enlazar la **política de privacidad** oficial.
- Definir la **política de retención** (cuánto tiempo se conservan las atenciones).
- Asegurar la finalidad del tratamiento (gestión de la atención) y los derechos del titular.

---

## 14. Solución de problemas

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| La TV no actualiza | Perdió conexión con el servidor | Verifica la red; recarga la página (la reconexión es automática) |
| La TV no suena | El navegador bloquea el audio | Pulsar "Activar sonido" una vez |
| "Sesión expirada" al asesor | El token caducó (12 h) | Volver a iniciar sesión |
| Un dispositivo no carga | IP del servidor incorrecta o fuera de red | Verifica la IP fija y que estén en la misma LAN |
| El turno no aparece en la TV | El asesor no ha llamado aún | Usar "Llamar siguiente" en el dashboard |
| Puerto ocupado al iniciar | Otra instancia corriendo | Detener el proceso/contenedor previo |

---

## 15. Referencia de la API

Base: `http://<IP-servidor>:4000`

### Públicos (kiosko / TV)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/servicios` | Lista de servicios |
| `GET` | `/api/estado` | Estado actual de la cola |
| `GET` | `/api/stream` | Stream SSE en tiempo real |
| `POST` | `/api/turnos` | Crea un turno (kiosko) |
| `POST` | `/api/auth/login` | Inicia sesión → devuelve token |

### Protegidos (requieren `Authorization: Bearer <token>`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/turnos/llamar` | Llama el siguiente turno |
| `POST` | `/api/turnos/:id/rellamar` | Vuelve a anunciar un turno |
| `POST` | `/api/turnos/:id/atender` | Marca turno como atendido |
| `POST` | `/api/turnos/:id/ausente` | Marca turno como ausente |
| `GET` | `/api/clientes/:cedula` | Datos del cliente por cédula |
| `GET` / `POST` | `/api/atenciones` | Lista / crea atenciones |

### Solo admin
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` / `POST` | `/api/usuarios` | Lista / crea usuarios |
| `PATCH` | `/api/usuarios/:id` | Actualiza rol / estado / contraseña |

---

## 16. Checklist de producción

- [ ] Servidor con IP fija y Docker instalado.
- [ ] `.env` con **`JWT_SECRET`** y **`ADMIN_PASSWORD`** cambiados.
- [ ] `docker compose up -d --build` ejecutado y verificado.
- [ ] **Usuarios reales** de los asesores creados; contraseñas de demo cambiadas.
- [ ] iPad en modo **Acceso Guiado** apuntando al kiosko.
- [ ] TV a pantalla completa en `#/tv` con sonido activado.
- [ ] **Backups** programados (cron / Programador de tareas).
- [ ] Servidor y reproductor de la TV en **UPS**.
- [ ] **Política de privacidad** enlazada y **retención** de datos definida (Habeas Data).
- [ ] Flujo completo probado en los dispositivos reales de la sede.

---

*Para detalles de desarrollo y arranque local, ver el `README.md` del proyecto.*
