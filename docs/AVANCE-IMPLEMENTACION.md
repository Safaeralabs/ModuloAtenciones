# Avance de Implementación — Módulo de Mercadeo

Seguimiento de fases según `docs/PLAN-IMPLEMENTACION-PLATAFORMA-MERCADEO.md`.
Rama de trabajo: `plataforma-mercadeo`.

## Fase 1 — Fundamentos (2026-07-05)

Estado: **implementada, pendiente de verificación contra MySQL real.**

El entorno de desarrollo usado para esta implementación no tiene Docker ni un
cliente/servidor MySQL instalados, así que el código se escribió siguiendo el
plan al pie de la letra pero **no se pudo ejecutar contra una base de datos
MySQL real**. Se validó todo lo que sí era posible sin esa base de datos:

- `node --check` en todos los archivos del backend (sintaxis válida).
- `npm run build` del frontend (Vite) tras cada cambio — sin errores de
  transformación ni imports rotos.
- Servidor de desarrollo de Vite (`npm run dev`) sirviendo `index.html` y
  `App.jsx` con HTTP 200, sin errores de compilación en caliente.
- Verificación estática de que los 26 componentes originales de `App.jsx`
  quedaron definidos exactamente una vez tras el refactor modular (ningún
  componente se perdió o duplicó).

**Lo que falta verificar en un entorno con Docker/MySQL (pendiente del usuario o de una siguiente sesión):**

1. `docker compose up -d mysql` levanta MySQL sin errores.
2. `cd server && npm run migrate` crea el esquema completo (`server/sql/001_schema.sql`)
   y los catálogos (`002_catalogos_iniciales.sql`) sin fallos.
3. Si existía una instalación previa en SQLite: `npm run migrate:sqlite` migra
   usuarios/turnos/atenciones y los conteos origen/destino coinciden.
4. `npm run server` (o `docker compose up`) arranca contra MySQL, siembra los
   usuarios iniciales si la tabla está vacía, y el login funciona.
5. Flujo completo en el navegador: login → turnero (sacar turno, llamar,
   atender) → registrar atención con el nuevo campo **Resultado** → historial
   → detalle (debe mostrar el resultado) → Usuarios (admin) con los 4 roles y
   el campo Sede.
6. Que el resultado `sin_resolucion` exija observaciones (frontend y backend).
7. Que la tabla `auditoria` reciba filas al crear/editar usuarios y al crear
   atenciones.

### Entregable de la Fase 1 (según el plan)

> "Plataforma actual corriendo sobre MySQL con 4 roles, atención con
> resultado, auditoría y backups."

Todo el código para ese entregable está escrito y en la rama
`plataforma-mercadeo`. Falta el paso de ejecución/verificación en un entorno
con MySQL disponible (punto 5 del checklist de arranque, sección 12 del plan).

### Archivos nuevos/clave de la Fase 1

- `server/sql/001_schema.sql`, `002_catalogos_iniciales.sql` — esquema y seeds.
- `server/migrate.js` — runner de migraciones (idempotente).
- `server/sql/migrar_sqlite.js` — migración de datos desde el SQLite anterior.
- `server/db.js`, `store.js`, `usuarios.js`, `auth.js`, `index.js` — reescritos sobre `mysql2/promise`.
- `server/auditoria.js` — helper de auditoría.
- `docker-compose.yml` — servicio `mysql` + `turnero` apuntando a MySQL.
- `scripts/backup.ps1`, `scripts/backup.sh` — `mysqldump` en vez de copiar el `.db`.
- `src/App.jsx` refactorizado (1971 → 178 líneas) en `src/components/`,
  `src/modules/{atenciones,turnero,usuarios}/`, `src/constants.js`, `src/utils.js`.
- Campo **Resultado de la atención** en el formulario y en el detalle
  (`resultado_atencion`, catálogo parametrizable).

## Fase 2 — Módulo de Ventas + BI Asesor (2026-07-05)

Estado: **implementada, misma limitación de verificación que la Fase 1** (sin
Docker/MySQL en este entorno). Validado con `node --check`, `npm run build` y
`npm run dev` (HTTP 200, sin errores de compilación).

### Alcance implementado

- **API de ventas** (`server/ventas.js`): CRUD con scope por rol (un asesor
  comercial solo ve/edita sus propias ventas; coordinador/admin ven todas),
  `valor_total` siempre calculado en servidor, validación de que la actividad
  pertenece al servicio elegido, anulación restringida a coordinador/admin,
  auditoría en crear/editar/anular. Si la venta viene de una atención
  (`codigoAtencion`), vincula `id_venta_vinculada` en la atención de origen.
- **Endpoints de apoyo**: `GET /api/servicios-catalogo` (servicios +
  actividades anidadas, solo lectura) y `GET /api/usuarios/opciones` (lista
  ligera para selects de responsable de factura / filtro por asesor).
- **Formulario de venta** (`src/modules/ventas/VentaForm.jsx`): autocompleta
  por cédula (SISU), selects dependientes Servicio→Actividad, total calculado
  en vivo. Si el resultado de una atención fue "Venta directa", el flujo pasa
  directo a este formulario con los datos prellenados (antes solo mostraba un
  aviso; ahora el encadenado atención→venta funciona de punta a punta).
- **Historial y detalle** (`VentasHistorial.jsx`, `VentaDetalle.jsx`): filtros
  por fecha/servicio/asesor/búsqueda, total del mes en curso, anulación con
  motivo (coordinador+).
- **Dashboard del asesor** (`server/bi.js` + `src/modules/bi/DashboardAsesor.jsx`):
  atenciones día/semana/mes, ventas del mes vs. mes anterior, ventas por
  servicio, distribución de resultados de atención — reemplaza los KPIs
  estáticos de ejemplo que tenía el Dashboard.
- **Importación del Excel histórico** (`server/sql/importar_ventas_excel.js`):
  valida fila a fila (cédula, servicio/actividad contra catálogo, categoría,
  fechas, vendedor por nombre) y reporta rechazos sin abortar el resto.
  **Pendiente**: el mapeo de columnas es una plantilla basada en los campos
  del plan — falta el archivo Excel real de Comfaguajira para ajustar los
  nombres de encabezado exactos y probarlo con datos reales.
- **Navegación**: ítem "Ventas" visible solo para Asesor Comercial,
  Coordinador y Administrador (Asesor Integral no lo ve, según la matriz de
  permisos).

### Pendiente de verificación con MySQL real

Mismos pasos que la Fase 1, más: crear una venta desde cero, crear una venta
encadenada desde una atención con resultado "Venta directa", filtrar el
historial por asesor (como coordinador) y por período, anular una venta y
confirmar que un asesor_comercial no puede ver ventas ajenas (403).

## Fase 3 — Cotizaciones + Facturaciones (2026-07-05)

Estado: **implementada, misma limitación de verificación que las fases
anteriores** (sin Docker/MySQL en este entorno). Validado con `node --check`
en los 18 archivos del backend, `npm run build` (65 módulos) y `npm run dev`
(HTTP 200).

### Alcance implementado

- **Migración 003** (`server/sql/003_facturaciones_registrador.sql`): agrega
  `id_registrador` a `facturaciones` para distinguir quién registró la
  factura de quién es responsable de gestionarla.
- **API de cotizaciones** (`server/cotizaciones.js`): máquina de estados
  completa (elaborada→pendiente→aprobada/rechazada, aprobada→convertida solo
  automático, vencida→pendiente solo coordinador+), `motivo_rechazo`
  obligatorio al rechazar, scope propias/todas, alertas a ≤3 días hábiles de
  vencer (`GET /cotizaciones/alertas`).
- **Conversión a venta** (F3-3): `POST /cotizaciones/:id/convertir` valida
  que esté Aprobada y devuelve el prefill; `ventas.crearVenta` valida de nuevo
  el estado antes de insertar y, tras crear la venta, marca la cotización
  `convertida` con `id_venta_generada` — todo en un solo flujo desde el botón
  "Registrar venta" del detalle de la cotización.
- **Vencimientos automáticos** (`server/cron.js` con `node-cron`, diario
  6:00 America/Bogota): marca `vencida` las pendientes con fecha límite
  pasada y genera notificación interna a 2 días de vencer (sin duplicar el
  mismo día). Campana de notificaciones en el Topbar (`NotificationBell.jsx`,
  polling cada 60s).
- **Facturaciones** (`server/facturaciones.js`): registro manual o vinculado
  a una venta (hereda cédula/valor si no se dan), asignación de responsable
  solo coordinador+ (con notificación automática), estado de gestión
  parametrizable contra el catálogo `estado_gestion_factura` (no un enum
  fijo), scope: un asesor ve las que registró o las que tiene asignadas.
  Frontend: `FacturasBandeja.jsx` (paneles "Sin asignar" / "Asignadas
  pendientes" + tabla con asignación y cambio de estado inline).
- **Frontend de cotizaciones**: `CotizacionForm.jsx` (prellenado desde
  atención con resultado "Cotización generada"), `CotizacionesLista.jsx`
  (filtros por estado/asesor/búsqueda), `CotizacionDetalle.jsx` (aprobar,
  rechazar con motivo, reactivar si vencida —coordinador+—, registrar venta
  si aprobada).
- **Navegación**: "Cotizaciones" visible para todos los roles (todos
  registran/ven las propias); "Facturas" solo para Asesor Comercial,
  Coordinador y Administrador (igual que Ventas).

### Pendiente de verificación con MySQL real

Además de los pasos de fases anteriores: crear una cotización desde una
atención con resultado "Cotización generada", aprobarla y convertirla en
venta (confirmar que la cotización queda `convertida` y la venta trae
`idCotizacion`), forzar el rechazo sin motivo (debe fallar con 400), esperar
o simular el cron para confirmar que vence cotizaciones vencidas y genera la
notificación de "por vencer", asignar una factura como coordinador y
confirmar que el responsable recibe la notificación y puede marcarla
"Gestionada" pero no reasignarla.

## Fase 4 — BI Coordinador + Parametrización + Excel (2026-07-05)

Estado: **implementada, misma limitación de verificación que las fases
anteriores** (sin Docker/MySQL en este entorno). Validado con `node --check`
en los 19 archivos del backend, `npm run build` (68 módulos) y `npm run dev`
(HTTP 200).

### Alcance implementado

- **BI consolidado** (`server/bi.js`, función `biCoordinador`): ranking de
  atenciones por asesor, atenciones por servicio(ventanilla)/resultado,
  evolución temporal, pipeline de cotizaciones por estado, tasa de conversión
  por asesor, ventas totales, ventas por servicio/actividad, ticket promedio,
  rechazos por motivo con valor perdido, cotizaciones vencidas sin gestión.
  Todo filtrable por asesor/servicio/actividad/período/sede
  (`GET /api/bi/coordinador`, solo coordinador/admin).
  **Nota de diseño importante**: `atenciones.service` (la ventanilla del
  turnero: Subsidio, Crédito, Mercadeo...) es un concepto distinto del
  catálogo comercial de servicios que usan ventas/cotizaciones (Recreación,
  Educación, Turismo); el filtro "servicio" del dashboard solo aplica a
  ventas y cotizaciones, nunca a las consultas de atenciones.
- **Dashboard del coordinador** (`src/modules/bi/DashboardCoordinador.jsx`):
  KPIs, ranking de asesores en barras, funnel del pipeline, y las tablas de
  conversión/ventas/ticket promedio/rechazos/alertas, todo con los mismos
  filtros que el backend.
- **Exportación a Excel** (`server/export.js`, `exceljs`): endpoint único
  `GET /api/bi/export/:vista` para `ventas`, `cotizaciones`, `facturas`,
  `atenciones` y `bi-coordinador` (esta última solo coordinador/admin, con
  una hoja por métrica). Reutiliza las mismas funciones de listado que la
  API, así que un asesor exportando desde su propio historial solo descarga
  lo que puede ver. Botón "Exportar a Excel" agregado a Ventas, Cotizaciones,
  Facturas y el Dashboard consolidado (visible solo para coordinador/admin,
  según la matriz de permisos).
- **Parametrización** (`server/catalogo.js` ampliado + `/api/parametros/:tipo`
  y `/api/servicios-catalogo`): CRUD completo de los 10 catálogos genéricos
  del plan y de servicios/actividades. Nunca elimina — solo crea, edita y
  activa/desactiva, preservando el histórico de lo que ya se usó. Frontend:
  `src/modules/parametros/CatalogosAdmin.jsx` con selector de catálogo y
  gestión anidada de servicios→actividades.
- **Auditoría** (`server/auditoria.js` ampliado con nombre de usuario;
  `GET /api/auditoria`): el coordinador solo consulta las tablas de negocio
  (atenciones, ventas, cotizaciones, facturaciones, catálogos, servicios,
  actividades) — nunca `usuarios`; el administrador consulta todo. Frontend:
  `src/modules/auditoria/AuditoriaAdmin.jsx`.
- **Navegación**: "BI Consolidado", "Parametrización" y "Auditoría" visibles
  solo para Coordinador/Administrador (Auditoría oculta la tabla `usuarios`
  del selector cuando el rol es coordinador).

### Pendiente de verificación con MySQL real

Además de los pasos de fases anteriores: cargar datos de prueba en varias
tablas y confirmar que el BI consolidado agrega correctamente con distintas
combinaciones de filtros; abrir un .xlsx exportado y verificar que las hojas
y columnas correspondan a la vista filtrada; crear y desactivar un ítem de
catálogo y confirmar que un registro histórico que ya lo usaba sigue
mostrándolo correctamente; confirmar que un coordinador no puede consultar
auditoría de la tabla `usuarios` (403) pero un admin sí.

## Fase 5

Parcial: implementados los tres frentes que **no dependen de credenciales de TI**.
Los que sí dependen (SISU real, BD Subsidio) siguen pendientes de que TI entregue accesos.

### Implementado y verificado (julio 2026)

- **Sesión de 30 min por inactividad (RNF Seguridad).** Ventana deslizante:
  el token JWT dura 30 min (`JWT_TTL=30m`, `server/auth.js`) y cada petición
  autenticada emite uno nuevo en el header `X-Refreshed-Token`; el cliente
  (`src/api.js`) lo guarda, de modo que la sesión solo caduca tras 30 min sin
  actividad. CORS expone el header (`exposedHeaders`, `server/index.js`).
  Verificado por curl: TTL de 30 min exactos y header presente en cada respuesta.
- **Respaldo automático de la BD (RNF Backup).** `server/backup.js` ejecuta
  `mysqldump` y guarda un `.sql.gz` diario; `server/cron.js` lo programa a las
  2:00 America/Bogota (fuera del horario de atención). Configurable por env:
  `BACKUP_DIR` (apuntar a disco/servidor distinto), `BACKUP_RETENTION_DAYS`
  (limpia copias viejas), `MYSQLDUMP_PATH`, `BACKUP_ENABLED`. Manual: `npm run backup`.
  Verificado: copia creada, gzip válido con las 13 tablas.
- **Correo SMTP para alertas (sección 14).** `server/mailer.js` (nodemailer)
  envía por email las alertas de cotización por vencer, además de la
  notificación en plataforma (`generarAlertasPorVencer` en `server/cotizaciones.js`).
  Degrada con elegancia: si `SMTP_HOST` está vacío, el correo se deshabilita y
  solo quedan las notificaciones internas (nunca lanza error). Nueva columna
  `usuarios.correo` (migración `004_usuarios_correo.sql`) editable desde
  `UsuariosAdmin.jsx`. Config por env: `SMTP_HOST/PORT/SECURE/USER/PASSWORD/FROM`.

### Pendiente (bloqueado por TI)

- Conexión al **servicio real de SISU** (`server/webservice.js` ya tiene las
  ramas `rest`/`soap` listas; hoy `WS_PROVIDER=mock`). Requiere endpoint +
  credenciales de TI.
- Conexión a la **BD de Subsidio** (solo lectura). Requiere datos de conexión
  y la consulta autorizada de TI.
- **UAT** con el equipo de mercadeo y ajustes de usabilidad según feedback.
- **Migración del Excel histórico** de ventas (`sql/importar_ventas_excel.js`
  ya existe; falta el archivo real).
