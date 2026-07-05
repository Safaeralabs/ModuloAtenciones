# Plan de Implementación — Módulo de Mercadeo Comfaguajira

> **Propósito de este documento:** guía de implementación paso a paso, escrita para ser ejecutada
> por un agente de IA (o un desarrollador) sin necesidad de consultar el documento de arquitectura
> original. Contiene el estado actual del código, las decisiones ya tomadas, el modelo de datos
> completo, el contrato de API y las tareas ordenadas por fase con criterios de aceptación.
>
> **Fuente:** `Arquitectura-Plataforma-Mercadeo-Comfaguajira.docx` (v1.0, Junio 2026) + análisis
> del código existente en este repositorio.

---

## 0. Reglas para el agente implementador

1. **No reescribas el módulo de atenciones existente.** Funciona y está en producción. Se **extiende**, no se reemplaza. Mantén la coherencia visual (mismo `styles.css`, misma paleta, mismos componentes `FormCard`, `AttentionTable`, etc.).
2. **Idioma:** todo el código nuevo (nombres de variables de dominio, mensajes, UI) sigue el patrón existente: UI en español, código mezclado español/inglés como ya está (`atenciones`, `usuarios`, `requireAuth`). No "corrijas" nombres existentes.
3. **Nunca elimines datos.** Todo borrado es lógico (`estado = 'anulada'` o `activo = 0`). Es un principio del documento de arquitectura (§10.1).
4. **Toda escritura pasa por auditoría.** Cada INSERT/UPDATE/anulación en tablas de negocio registra fila en `auditoria` (quién, cuándo, qué, valor anterior).
5. **Ejecuta las fases en orden.** Cada fase termina con sus criterios de aceptación verificados antes de continuar.
6. **SISU sigue en modo mock** (`WS_PROVIDER=mock`) hasta la Fase 5. No bloquees nada esperando credenciales reales; el adaptador ya existe en `server/webservice.js`.
7. Trabaja en commits pequeños por tarea, con mensajes en español descriptivos.

---

## 1. Estado actual del código (punto de partida)

### 1.1 Stack existente

| Capa | Tecnología | Archivo(s) clave |
|---|---|---|
| Frontend | React 18 + Vite 5, sin router, sin librería UI | `src/App.jsx` (~1970 líneas, monolítico), `src/api.js`, `src/styles.css` (~2400 líneas) |
| Backend | Node.js + Express 4, ESM | `server/index.js` (rutas), `server/store.js` (lógica), `server/auth.js` (JWT) |
| Base de datos | **SQLite** (better-sqlite3) — ⚠️ debe migrar a **MySQL 8+** | `server/db.js` |
| Auth | JWT (jsonwebtoken) + bcryptjs, roles `admin` / `asesor` | `server/auth.js`, `server/usuarios.js` |
| SISU | Adaptador con providers `mock` / `rest` / `soap` / `off` | `server/webservice.js`, `server/clientes.js` |
| Tiempo real | SSE en `/api/stream` (turnero) | `server/index.js` |
| Despliegue | Docker + docker-compose, servidor propio; backend sirve `dist/` en producción | `Dockerfile`, `docker-compose.yml`, `scripts/backup.*` |

### 1.2 Funcionalidad existente (NO tocar salvo donde se indica)

- **Turnero digital:** kiosko de turnos (`KioskScreen`), pantalla TV con llamado sonoro (`TvScreen`), panel de llamado (`TurneroPanel`), cola vía SSE.
- **Módulo de Atenciones:** registro (`RegisterAttention`), historial (`History`), detalle (`AttentionDetail`), con consulta SISU por cédula, campos de mercadeo (`interes`, `consentimiento`, `accion_seguimiento`, `fecha_seguimiento`, `nota_mercadeo`).
- **Usuarios:** CRUD admin (`UsuariosAdmin`), login (`LoginScreen`), roles `admin`/`asesor`.
- **Reportes básicos:** `Reports` con gráficas SVG artesanales (`ChartCard`, `DonutCard`, `LineCard`) — hoy con datos parcialmente estáticos.

### 1.3 Tablas SQLite actuales

- `turnos` (id, fecha, numero, servicio, prefijo, cedula, prioritario, condicion, estado, modulo, created_at, called_at)
- `atenciones` (id, codigo, fecha, created_at, document, client, phone, email, address, city, service, motive, status, advisor, channel, duration, management, observations, caso, turno_id, turno_numero, modulo, prioritario, espera_min, sisu_json, interes, consentimiento, accion_seguimiento, fecha_seguimiento, nota_mercadeo)
- `usuarios` (id, username, nombre, password_hash, rol, activo)

### 1.4 Endpoints existentes

```
POST /api/auth/login            GET  /api/auth/me
GET  /api/servicios             GET  /api/estado
POST /api/turnos                POST /api/turnos/llamar
POST /api/turnos/:id/rellamar   POST /api/turnos/:id/atender
POST /api/turnos/:id/ausente    GET  /api/stream (SSE)
GET  /api/clientes/:cedula      (consulta SISU)
GET  /api/atenciones            POST /api/atenciones
GET  /api/usuarios              POST /api/usuarios      PATCH /api/usuarios/:id
```

---

## 2. Objetivo de la plataforma (resumen del documento)

Unificar en una sola plataforma web los tres procesos del área de Mercadeo Estratégico:

1. **Control de Atenciones** (existe; se extiende con campo `resultado` y vínculos a ventas/cotizaciones).
2. **Control de Ventas** (nuevo; reemplaza el Excel "Análisis de Ventas").
3. **Control de Cotizaciones** (nuevo; ciclo de vida completo con alertas de vencimiento).
4. **Control de Facturaciones** (nuevo, deliberadamente acotado: solo registro y asignación de responsable; **NO** genera facturas, **NO** integra ZEUS/contabilidad, **NO** gestiona cartera).
5. **Parametrización** (nuevo; catálogos autoadministrables por el coordinador).
6. **BI / Dashboards por rol** (nuevo; vista individual del asesor y consolidada del coordinador, con exportación a Excel).

**Trazabilidad central:** Atención → (resultado) → Cotización → (conversión) → Venta → Factura. Nunca se pierde el hilo de dónde nació cada venta.

**Fuera de alcance (no implementar):** facturación contable/ZEUS, módulo de cartera/crédito.

---

## 3. Decisiones de arquitectura (ya tomadas — no re-debatir)

| Decisión | Valor | Justificación |
|---|---|---|
| Base de datos | **MySQL 8+** (requisito fijo del documento) | Migrar desde SQLite. Usar driver `mysql2` (promesas). |
| Backend | Mantener Express (mismo `server/`) | Documento deja libre la tecnología; continuidad con lo construido. |
| Frontend | Mantener React 18 + Vite | Ídem. **Refactorizar `App.jsx` en módulos** (ver §7.1) porque crecerá ~4×. |
| Auth | Mantener JWT existente, ampliar roles | Compatible con login actual (requisito §3.2 del documento). |
| Roles | `asesor_integral`, `asesor_comercial`, `coordinador`, `admin` | El rol legado `asesor` se migra a `asesor_integral`. |
| Gráficas BI | Mantener el patrón SVG propio o introducir **Recharts** (recomendado por volumen de gráficas) | Se embeben en la app; sin servicios externos. |
| Exportación Excel | Librería `exceljs` en el backend (endpoint que responde `.xlsx`) | Requisito CO-04; generar en servidor evita duplicar lógica de filtros. |
| Alertas | Notificaciones internas en plataforma + tarea programada (`node-cron`) para vencimientos; correo SMTP vía `nodemailer` en Fase 5 | §6.4 y §14 del documento. |
| IDs de negocio | Tablas nuevas usan `id` autoincremental interno + `uuid` público (columna `CHAR(36)`) | El documento pide UUID; el autoincremental facilita FKs e índices. |
| Multi-sede | Columna `sede` en tablas de negocio desde el día 1 (default `'Riohacha'`) | Requisito de escalabilidad §12: 5 sedes sin rediseño. |
| Zona horaria | `America/Bogota` en MySQL y Node | Operación local 7am–6pm L–S. |

---

## 4. Modelo de datos completo (MySQL)

> Crear como `server/sql/001_schema.sql` (DDL) y `server/sql/002_catalogos_iniciales.sql` (seeds).
> Todas las tablas: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci`.

### 4.1 Tablas migradas (equivalentes a las actuales de SQLite)

```sql
-- usuarios: se amplía el enum de roles y se agregan campos
CREATE TABLE usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  uuid          CHAR(36) NOT NULL UNIQUE,
  username      VARCHAR(50) NOT NULL UNIQUE,
  nombre        VARCHAR(120) NOT NULL,
  cedula        VARCHAR(20),
  password_hash VARCHAR(100) NOT NULL,
  rol           ENUM('asesor_integral','asesor_comercial','coordinador','admin') NOT NULL DEFAULT 'asesor_integral',
  area          VARCHAR(80),
  sede          VARCHAR(60) NOT NULL DEFAULT 'Riohacha',
  activo        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- turnos: igual a SQLite (migración 1:1)
-- atenciones: igual a SQLite + columnas nuevas de §4.3 (ver más abajo)
```

### 4.2 Tabla nueva: afiliados (caché local de SISU/Subsidio)

```sql
CREATE TABLE afiliados (
  cedula          VARCHAR(20) PRIMARY KEY,
  nombre          VARCHAR(160) NOT NULL,
  telefono        VARCHAR(30),
  correo          VARCHAR(120),
  categoria       ENUM('A','B','C','D') DEFAULT NULL,
  empresa         VARCHAR(160),
  info_subsidio   JSON,                -- respuesta cruda de BD subsidio
  autoriza_datos  TINYINT(1) NOT NULL DEFAULT 0,
  fuente          ENUM('SISU','Subsidio','Manual') NOT NULL DEFAULT 'Manual',
  actualizado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
Regla: cada consulta SISU exitosa hace UPSERT aquí (§10.1: "se actualizan en cada nueva atención").

### 4.3 Extensión de atenciones (nuevas columnas)

```sql
ALTER TABLE atenciones
  ADD COLUMN resultado            VARCHAR(40)  NULL,   -- código del catálogo 'resultado_atencion'
  ADD COLUMN interes_servicio     JSON         NULL,   -- array de códigos de servicios de interés
  ADD COLUMN genera_cotizacion    TINYINT(1)   NOT NULL DEFAULT 0,  -- auto
  ADD COLUMN genera_venta         TINYINT(1)   NOT NULL DEFAULT 0,  -- auto
  ADD COLUMN id_cotizacion_vinculada INT NULL,          -- FK cotizaciones.id
  ADD COLUMN id_venta_vinculada   INT NULL,             -- FK ventas.id
  ADD COLUMN sede                 VARCHAR(60) NOT NULL DEFAULT 'Riohacha';
```

Resultados posibles (catálogo `resultado_atencion`, parametrizable) y acción del sistema:

| Código | Acción del sistema al guardar |
|---|---|
| `venta_directa` | Abre formulario de venta prellenado (cédula, nombre, servicio); al guardar la venta, setea `genera_venta=1` e `id_venta_vinculada`. |
| `cotizacion_generada` | Abre formulario de cotización prellenado; al guardar, `genera_cotizacion=1` e `id_cotizacion_vinculada`. |
| `informacion_brindada` | Cierra la atención; guarda `interes_servicio`. |
| `afiliacion` | Cierra la atención; registra tipo de afiliación en observaciones/gestión. |
| `escalada` | Flujo existente de escalamiento (no cambiar). |
| `sin_resolucion` | Cierra; **observaciones obligatorias**. |

### 4.4 Tabla nueva: ventas

```sql
CREATE TABLE ventas (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  uuid                CHAR(36) NOT NULL UNIQUE,
  codigo_atencion     INT NULL,              -- FK atenciones.id (origen)
  id_cotizacion       INT NULL,              -- FK cotizaciones.id (origen)
  cedula_cliente      VARCHAR(20) NOT NULL,  -- FK afiliados.cedula
  nombre_cliente      VARCHAR(160) NOT NULL,
  telefono            VARCHAR(30),
  correo              VARCHAR(120),
  servicio            VARCHAR(60) NOT NULL,  -- código catálogo servicios
  actividad           VARCHAR(60) NOT NULL,  -- código catálogo actividades (depende de servicio)
  categoria           ENUM('A','B','C','D') NOT NULL,
  lugar_prestacion    VARCHAR(120) NOT NULL,
  fecha_servicio      DATE NOT NULL,
  valor_unitario      DECIMAL(14,2) NOT NULL,
  cantidad            INT NOT NULL DEFAULT 1,
  valor_total         DECIMAL(14,2) NOT NULL,     -- calculado en backend: unitario × cantidad
  numero_factura      VARCHAR(40),
  responsable_factura INT NULL,              -- FK usuarios.id
  numero_aprobado     VARCHAR(60),           -- nº aprobado de consignación
  tipo_pago           ENUM('contado','credito') NOT NULL,
  id_vendedor         INT NOT NULL,          -- FK usuarios.id (sesión activa)
  observacion         TEXT,
  sede                VARCHAR(60) NOT NULL DEFAULT 'Riohacha',
  estado              ENUM('activa','anulada') NOT NULL DEFAULT 'activa',
  fecha_registro      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ventas_vendedor (id_vendedor), INDEX idx_ventas_fecha (fecha_registro),
  INDEX idx_ventas_cedula (cedula_cliente)
);
```

### 4.5 Tabla nueva: cotizaciones

```sql
CREATE TABLE cotizaciones (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  uuid                      CHAR(36) NOT NULL UNIQUE,
  numero_cotizacion_externo VARCHAR(40),      -- nº del sistema transaccional, para cruce
  codigo_atencion           INT NULL,          -- FK atenciones.id (origen)
  cedula_cliente            VARCHAR(20) NOT NULL,
  nombre_cliente            VARCHAR(160) NOT NULL,
  empresa_cliente           VARCHAR(160),
  telefono                  VARCHAR(30),
  correo                    VARCHAR(120),
  servicio                  VARCHAR(60) NOT NULL,
  actividad                 VARCHAR(60) NOT NULL,
  descripcion_servicio      TEXT NOT NULL,
  fecha_cotizacion          DATE NOT NULL,     -- auto (hoy)
  fecha_limite_confirmacion DATE NOT NULL,
  fecha_servicio            DATE NULL,
  valor_total               DECIMAL(14,2) NOT NULL,
  tipo_pago                 ENUM('contado','credito') NOT NULL,
  estado ENUM('elaborada','pendiente','aprobada','rechazada','convertida','vencida')
         NOT NULL DEFAULT 'pendiente',
  motivo_rechazo            VARCHAR(120),      -- OBLIGATORIO si estado='rechazada' (validar en backend)
  id_venta_generada         INT NULL,          -- FK ventas.id, auto al convertir
  id_asesor                 INT NOT NULL,      -- FK usuarios.id (sesión)
  observaciones             TEXT,
  sede                      VARCHAR(60) NOT NULL DEFAULT 'Riohacha',
  anulada                   TINYINT(1) NOT NULL DEFAULT 0,
  fecha_ultima_gestion      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cot_estado (estado), INDEX idx_cot_asesor (id_asesor),
  INDEX idx_cot_limite (fecha_limite_confirmacion)
);
```

**Máquina de estados (validar en backend, rechazar transiciones inválidas):**

| Desde | Hacia permitido | Quién |
|---|---|---|
| `elaborada` | `pendiente`, `aprobada`, `rechazada` | Asesor dueño / coordinador |
| `pendiente` (default al crear) | `aprobada`, `rechazada`, `vencida` | Asesor / sistema (cron) |
| `aprobada` | `convertida` | Automático al registrar venta vinculada |
| `rechazada` | — (final; exige `motivo_rechazo`) | — |
| `convertida` | — (final) | — |
| `vencida` | `pendiente` (reactivación) | **Solo coordinador** |

### 4.6 Tabla nueva: facturaciones

```sql
CREATE TABLE facturaciones (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  uuid             CHAR(36) NOT NULL UNIQUE,
  numero_factura   VARCHAR(40) NOT NULL,
  id_venta         INT NULL,               -- FK ventas.id
  cedula_cliente   VARCHAR(20) NOT NULL,
  valor_factura    DECIMAL(14,2) NOT NULL,
  id_responsable   INT NULL,               -- FK usuarios.id
  estado_gestion   VARCHAR(40) NOT NULL DEFAULT 'sin_asignar', -- catálogo parametrizable
  fecha_asignacion TIMESTAMP NULL,
  observacion      TEXT,
  sede             VARCHAR(60) NOT NULL DEFAULT 'Riohacha',
  anulada          TINYINT(1) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
Recordatorio de alcance: es una **bandeja de facturas** (registro + responsable + estado de gestión). Nada más.

### 4.7 Catálogos y auditoría

```sql
CREATE TABLE servicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE actividades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_servicio INT NOT NULL,               -- FK servicios.id
  codigo VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (id_servicio) REFERENCES servicios(id)
);

-- Catálogo genérico para todo lo demás (un solo CRUD lo administra)
CREATE TABLE catalogos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,     -- ver lista de tipos abajo
  codigo VARCHAR(50) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_catalogo (tipo, codigo)
);

CREATE TABLE auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tabla VARCHAR(50) NOT NULL,
  id_registro INT NOT NULL,
  accion ENUM('crear','editar','anular','reactivar','cambio_estado') NOT NULL,
  id_usuario INT NOT NULL,
  datos_anteriores JSON NULL,     -- snapshot previo en ediciones/anulaciones
  datos_nuevos JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aud_tabla (tabla, id_registro)
);

CREATE TABLE notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,        -- destinatario
  tipo VARCHAR(40) NOT NULL,      -- 'cotizacion_por_vencer', 'cotizacion_vencida', 'factura_asignada'
  referencia_tabla VARCHAR(40), referencia_id INT,
  mensaje VARCHAR(255) NOT NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Tipos de catálogo (`catalogos.tipo`) y seeds iniciales (002_catalogos_iniciales.sql):**

| tipo | Ítems iniciales |
|---|---|
| `motivo_atencion` | Información de servicios, Subsidios, Crédito, Certificados |
| `resultado_atencion` | Venta directa, Cotización generada, Información brindada, Afiliación, Escalada, Sin resolución/Otro |
| `motivo_rechazo` | Precio alto, Sin presupuesto, Lo consiguió con tercero |
| `tipo_evento` | Cumpleaños, Grado, Reunión empresarial |
| `lugar_prestacion` | Maziruma, Anas Mai, Restaurante, Cancha Sintética |
| `categoria_afiliado` | A (hasta 2 SMMLV), B (hasta 4 SMMLV), C, D |
| `tipo_seguimiento` | Llamar, Enviar información, Agendar cita, Visita |
| `canal_atencion` | Presencial, Telefónico, Virtual, WhatsApp |
| `estado_gestion_factura` | Sin asignar, Asignada, Gestionada |
| `sede` | Riohacha (ampliable a 5 sedes) |

Seeds de `servicios`: Recreación, Educación, Turismo. Seeds de `actividades`: Recreación Dirigida, Maziruma (→Recreación), Tour Cartagena, Pasadía Jumping Lam (→Turismo).

---

## 5. Roles y matriz de permisos (implementar como middleware)

Roles: `asesor_integral` (Atención al Cliente), `asesor_comercial` (Promoción y Ventas), `coordinador`, `admin`.

| Funcionalidad | asesor_integral | asesor_comercial | coordinador | admin |
|---|---|---|---|---|
| Registrar/ver atenciones | ✓ propias | ✓ propias | ✓ todas | ✓ todas |
| Registrar/ver ventas | ✗ | ✓ propias | ✓ todas | ✓ todas |
| Registrar/ver cotizaciones | ✓ propias | ✓ propias | ✓ todas | ✓ todas |
| Cambiar estado cotización | solo propias | solo propias | todas | todas |
| Reactivar cotización vencida | ✗ | ✗ | ✓ | ✓ |
| Registrar factura | ✗ | ✓ propias | ✓ | ✓ |
| Asignar responsable factura | ✗ | ✗ | ✓ | ✓ |
| Gestionar factura asignada | si es responsable | si es responsable | ✓ | ✓ |
| Anular registros | ✗ | ✗ | ✓ | ✓ |
| BI individual | ✓ | ✓ | ✓ | ✓ |
| BI consolidado | ✗ | ✗ | ✓ | ✓ |
| Parametrizar catálogos | ✗ | ✗ | ✓ | ✓ |
| Gestión de usuarios | ✗ | ✗ | ✗ | ✓ |
| Exportar a Excel | ✗ | ✗ | ✓ | ✓ |
| Ver log auditoría | ✗ | ✗ | parcial (sus módulos) | ✓ |

**Implementación:** en `server/auth.js` agregar `requireRole(...roles)` y helper `scopeOwn(req)` que inyecta `WHERE id_asesor = ?` cuando el rol no es coordinador/admin. Migración de datos: rol legado `'asesor'` → `'asesor_integral'`; `'admin'` se mantiene.

---

## 6. Contrato de API (endpoints nuevos)

Prefijo `/api`. Todos requieren JWT salvo indicación. Convención de respuestas y errores igual a la existente (`{ error: msg }`, códigos HTTP).

```
# Ventas
GET    /ventas                 ?desde&hasta&servicio&actividad&asesor&estado&q   (scope por rol)
POST   /ventas                 crea; calcula valor_total en servidor; si trae id_cotizacion →
                               valida estado 'aprobada', marca cotización 'convertida', setea id_venta_generada;
                               si trae codigo_atencion → setea genera_venta/id_venta_vinculada en la atención
GET    /ventas/:id
PATCH  /ventas/:id             editar (dueño o coordinador+)
POST   /ventas/:id/anular      coordinador+ (motivo obligatorio → auditoría)

# Cotizaciones
GET    /cotizaciones           ?estado&asesor&servicio&desde&hasta&q   (scope por rol)
POST   /cotizaciones           default estado 'pendiente'; si trae codigo_atencion vincula la atención
GET    /cotizaciones/:id
PATCH  /cotizaciones/:id       editar datos (dueño o coordinador+); actualiza fecha_ultima_gestion
POST   /cotizaciones/:id/estado  { estado, motivo_rechazo? } — valida máquina de estados §4.5
POST   /cotizaciones/:id/convertir  atajo: devuelve payload prellenado para formulario de venta
GET    /cotizaciones/alertas   propias (o todas si coordinador) con fecha_limite ≤ hoy+3 días hábiles

# Facturaciones
GET    /facturas               ?estado_gestion&responsable&q
POST   /facturas               manual o desde venta (id_venta prellena cedula/valor)
PATCH  /facturas/:id           editar / marcar gestionada (responsable o coordinador+)
POST   /facturas/:id/asignar   { id_responsable } — coordinador+; setea fecha_asignacion,
                               estado 'asignada', crea notificación al responsable

# Parametrización (coordinador+)
GET    /parametros/:tipo               lista ítems del catálogo (incluye inactivos para el gestor)
POST   /parametros/:tipo               crear ítem
PATCH  /parametros/:tipo/:id           editar / activar / desactivar (nunca DELETE)
GET    /servicios-catalogo             servicios + actividades anidadas (para selects dependientes)
POST   /servicios-catalogo / PATCH ... CRUD de servicios y actividades

# BI
GET    /bi/asesor              KPIs individuales del usuario de sesión (ver §9.1)
GET    /bi/coordinador         ?asesor&servicio&actividad&desde&hasta&sede — consolidado (coordinador+)
GET    /bi/export/:vista       genera .xlsx con exceljs, mismos filtros (coordinador+)

# Notificaciones
GET    /notificaciones         propias, no leídas primero
POST   /notificaciones/:id/leer

# Auditoría
GET    /auditoria              ?tabla&id_registro&usuario&desde&hasta (admin; coordinador parcial)

# Extensión atenciones (modificar endpoint existente POST /atenciones)
- acepta resultado, interes_servicio[]; si resultado='sin_resolucion' exige observations
- respuesta incluye { abrirFlujo: 'venta'|'cotizacion'|null, prefill: {...} } para que el
  frontend encadene el formulario correspondiente
```

**Validaciones de negocio críticas (backend, no solo frontend):**
- `valor_total` SIEMPRE calculado en servidor (`valor_unitario × cantidad`).
- `motivo_rechazo` obligatorio si estado → `rechazada`.
- Transiciones de estado de cotización solo las de la máquina §4.5.
- `actividad` debe pertenecer al `servicio` seleccionado.
- Scope de propiedad: un asesor no puede leer/editar registros de otro (403).
- Anulación solo coordinador+; el registro nunca se borra.

---

## 7. Frontend — estructura y pantallas

### 7.1 Refactor previo (Fase 1, tarea F1-6)

`src/App.jsx` (~1970 líneas) debe dividirse ANTES de agregar módulos, manteniendo comportamiento idéntico:

```
src/
  api.js                    (existente; se amplía por módulo)
  App.jsx                   (solo shell: auth, navegación, layout)
  components/               (Sidebar, Topbar, FormCard, DetailCard, AttentionTable,
                             ChartCard..., Logo, iconos — extraídos tal cual)
  modules/
    atenciones/   (Dashboard, RegisterAttention, History, AttentionDetail)
    turnero/      (PublicTurnero, TurneroPanel, KioskScreen, TvScreen)
    ventas/       (VentaForm, VentasHistorial, VentaDetalle)
    cotizaciones/ (CotizacionForm, CotizacionesLista, CotizacionDetalle, PipelineBoard)
    facturas/     (FacturaForm, FacturasBandeja)
    bi/           (DashboardAsesor, DashboardCoordinador)
    parametros/   (CatalogosAdmin)
    usuarios/     (UsuariosAdmin — existente)
```

No introducir react-router si no es necesario: el patrón actual de estado `current` + `onNavigate` en `App.jsx` puede extenderse. Mantener `styles.css` único, agregando secciones por módulo con los mismos tokens/clases.

### 7.2 Navegación por rol (Sidebar)

| Rol | Ítems visibles |
|---|---|
| asesor_integral | Inicio, Nueva Atención, Historial, Cotizaciones, Mi Dashboard, Turnero |
| asesor_comercial | Inicio, Ventas, Cotizaciones, Facturas (propias), Mi Dashboard, (Atenciones opcional) |
| coordinador | Todo lo anterior + BI Consolidado, Parametrización, Facturas (bandeja completa), Alertas |
| admin | Todo + Usuarios + Auditoría |

### 7.3 Reglas UX (requisitos no funcionales §12 del documento)

- Formularios cortos y progresivos: **máx. 10 campos visibles a la vez**; el formulario de atención cabe sin scroll vertical.
- Selects dependientes: `Actividad` se filtra por `Servicio` automáticamente.
- Autocompletado SISU: cédula + Enter → nombre, teléfono, categoría en < 2 s (patrón ya existente en `RegisterAttention`).
- Prellenado encadenado: atención→cotización, atención→venta, cotización→venta. **Nunca redigitar datos del afiliado.**
- Campana de notificaciones en `Topbar` (badge con no leídas; polling cada 60 s o reutilizar SSE existente).
- Pantallas < 2 s en red local; compatibilidad Chrome/Edge/Firefox 2024+.
- Sesión expira a los 30 min de inactividad (ajustar TTL del JWT + renovación en actividad).

---

## 8. Fases de implementación (ejecutar en orden)

### FASE 1 — Fundamentos: MySQL + roles + extensión de atenciones

| # | Tarea | Detalle | Criterio de aceptación |
|---|---|---|---|
| F1-1 | Infraestructura MySQL | Agregar servicio `mysql:8` a `docker-compose.yml` (volumen persistente, TZ America/Bogota). Instalar `mysql2` y `uuid` en `server/`. Variables `.env`: `DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME=mercadeo`. | `docker compose up` levanta MySQL; healthcheck OK. |
| F1-2 | Esquema y seeds | Crear `server/sql/001_schema.sql` (todas las tablas de §4) y `002_catalogos_iniciales.sql`. Runner de migraciones simple (`server/migrate.js`, tabla `_migraciones`). | Ejecutar migraciones deja BD completa; re-ejecutar es idempotente. |
| F1-3 | Capa de datos | Reescribir `server/db.js` sobre `mysql2/promise` (pool). Adaptar `store.js`, `usuarios.js` y rutas a async/await. **La API pública (rutas y formas de respuesta) no cambia.** | Turnero + atenciones + login funcionan igual que antes contra MySQL. |
| F1-4 | Script de migración de datos | `server/sql/migrar_sqlite.js`: copia `usuarios`, `turnos`, `atenciones` desde `turnero.db` a MySQL (rol `asesor`→`asesor_integral`; genera `uuid` donde aplique). | Conteos origen=destino; login de usuarios existentes funciona. |
| F1-5 | Roles y middleware | 4 roles en `usuarios`; `requireRole()` y scope "propias" en `auth.js`; `UsuariosAdmin` permite elegir rol y sede. | Un asesor_comercial no puede ver atenciones ajenas (403 probado). |
| F1-6 | Refactor frontend | Dividir `App.jsx` según §7.1 sin cambiar comportamiento. | La app se ve y funciona idéntica (verificación manual de las 8 pantallas). |
| F1-7 | Extensión atenciones | Columnas §4.3 + catálogo `resultado_atencion` + UI: al cerrar atención se elige Resultado; `sin_resolucion` exige observaciones; respuesta indica `abrirFlujo` (los flujos se conectan en F2/F3). | AU-02: el formulario incluye Resultado parametrizado; queda persistido. |
| F1-8 | Auditoría base | Helper `auditar(tabla, id, accion, usuario, antes, despues)`; aplicarlo a usuarios y atenciones. | Editar una atención genera fila en `auditoria` con snapshot anterior. |
| F1-9 | Backups | Cambiar `scripts/backup.*` a `mysqldump` diario, destino distinto al servidor principal. | Dump diario generado y restaurable. |

**Entregable Fase 1:** plataforma actual corriendo sobre MySQL con 4 roles, atención con resultado, auditoría y backups.

### FASE 2 — Módulo de Ventas + BI del asesor

| # | Tarea | Detalle | Criterio |
|---|---|---|---|
| F2-1 | API ventas | Endpoints §6 con validaciones (total en servidor, actividad∈servicio, scope). Auditoría en todas las escrituras. | Tests de API: crear, listar con filtros, editar, anular (solo coordinador). |
| F2-2 | Formulario Nueva Venta | Flujo §5.3 del documento: cédula→SISU autocompleta; servicio→filtra actividad; cantidad×unitario→total en vivo; factura opcional. Prellenado si viene de atención (`abrirFlujo:'venta'`). | AV-01: mismos campos del Excel; total automático. |
| F2-3 | Historial de ventas | Tabla con filtros (período, servicio, actividad; asesor solo para coordinador+), suma del mes visible, detalle, anulación coordinador. | AV-03: total del mes en curso + filtro por período. |
| F2-4 | Dashboard asesor v1 | `GET /bi/asesor`: atenciones día/semana/mes, mis ventas del mes vs anterior, ventas por servicio, resultado de mis atenciones. Reutilizar/mejorar `ChartCard`/`DonutCard` con datos reales (o introducir Recharts aquí). | AU-05: ≥4 KPIs propios con datos reales. |
| F2-5 | Migración Excel histórico | Script `server/sql/importar_ventas_excel.js` (lee .xlsx con `exceljs`, mapea columnas, reporta filas inválidas). Pedir el archivo real al usuario cuando llegue esta tarea. | Registros históricos cargados y visibles con filtros. |

**Entregable Fase 2:** módulo de ventas reemplaza el Excel; asesor ve su dashboard.

### FASE 3 — Cotizaciones + Facturaciones

| # | Tarea | Detalle | Criterio |
|---|---|---|---|
| F3-1 | API cotizaciones | Endpoints + máquina de estados §4.5 + `motivo_rechazo` condicional + `fecha_ultima_gestion`. | Transición inválida → 422; rechazo sin motivo → 400. |
| F3-2 | UI cotizaciones | Formulario (prellenado desde atención — AU-03), lista con filtros por estado, detalle con línea de tiempo de estados y observaciones. | AU-03: desde atención con resultado 'cotización', el form llega prellenado. |
| F3-3 | Conversión a venta | Botón "Registrar venta" en cotización `aprobada` → formulario de venta prellenado; al guardar: cotización→`convertida`, `id_venta_generada` seteado, atención origen actualizada. | AV-02 completo; trazabilidad atención→cotización→venta consultable. |
| F3-4 | Vencimientos y alertas | `node-cron` diario (ej. 6:00): `pendiente` con fecha límite pasada → `vencida`; crear `notificaciones` a 2 días de vencer. Campana en Topbar + vista de alertas (≤3 días hábiles). | CO-02: lista de próximas a vencer; vencidas se marcan solas; coordinador puede reactivar. |
| F3-5 | Facturaciones | API + UI bandeja: registrar (manual o desde venta), asignar responsable (coordinador), marcar gestionada, panel de "sin asignar"/"pendientes". Estados desde catálogo `estado_gestion_factura`. | Flujo §7.3 del documento completo; notificación al responsable asignado. |

**Entregable Fase 3:** ciclo completo atención→cotización→venta→factura con alertas.

### FASE 4 — BI Coordinador + Parametrización + Excel

| # | Tarea | Detalle | Criterio |
|---|---|---|---|
| F4-1 | API BI consolidado | `GET /bi/coordinador` con filtros (asesor, servicio, actividad, período, sede): atenciones por asesor/servicio/resultado/tiempo, pipeline por estado, tasa de conversión por asesor (ventas desde cotización ÷ cotizaciones elaboradas), ventas totales, ticket promedio, rechazos por motivo con valor perdido, vencidas sin gestión. | CO-01, CO-05: embudo con filtros; conversión por asesor. |
| F4-2 | UI Dashboard coordinador | KPI cards + barras (ranking asesores), apiladas (servicio×resultado), línea temporal, funnel del pipeline, tablas rankeadas, lista de alertas. | Todas las métricas de §9.2 del documento presentes. |
| F4-3 | Exportación Excel | `GET /bi/export/:vista` con `exceljs` (mismos filtros de la vista). Botón "Exportar a Excel" en todas las vistas del coordinador (BI, historial ventas, cotizaciones, facturas, atenciones). | CO-04: cada vista de reportes descarga .xlsx fiel a los filtros aplicados. |
| F4-4 | Parametrización | `CatalogosAdmin`: pestañas por tipo de catálogo + servicios/actividades anidados. Crear, editar, activar/desactivar (nunca eliminar). Cambios visibles de inmediato en formularios. | CO-03: agregar/editar/desactivar sin código; histórico preservado. |
| F4-5 | Vista de auditoría | Pantalla admin (filtros tabla/usuario/fecha); coordinador ve solo módulos de negocio. | Cambios trazables: quién, cuándo, qué, valor anterior. |

**Entregable Fase 4:** BI completo + catálogos autoadministrables + exportación.

### FASE 5 — Integraciones reales + UAT

| # | Tarea | Detalle | Criterio |
|---|---|---|---|
| F5-1 | SISU real | Configurar `WS_PROVIDER=rest|soap` con endpoint/credenciales de TI (el adaptador `webservice.js` ya lo soporta; ajustar mapeo de campos reales: nombre, estado, categoría, empresa, teléfono, correo, autorización de datos). UPSERT en `afiliados`. | Consulta real por cédula < 2 s; datos correctos (AU-01). |
| F5-2 | BD Subsidio | Conector solo-lectura (datos de conexión los entrega TI); guardar en `afiliados.info_subsidio`; mostrar en panel `SisuReadOnly`. | Info de subsidio visible en la atención. **Jamás escribir en esa BD.** |
| F5-3 | SMTP | `nodemailer` con servidor de Comfaguajira: correo de cotizaciones por vencer (complemento de la notificación interna). Config por `.env`; si no hay SMTP, degradar silenciosamente a solo-interno. | Correo de alerta recibido en prueba real. |
| F5-4 | Endurecimiento | Sesión 30 min inactividad; verificación bcrypt en revisión; rate limits en endpoints nuevos; revisar helmet/CORS para producción. | Checklist de seguridad §12 del documento aprobado. |
| F5-5 | UAT y ajustes | Pruebas con el equipo de mercadeo; registrar hallazgos y corregir usabilidad. | Asesor nuevo registra una atención completa sin guía en < 5 min y ≤ 3 min por atención en operación. |

**Entregable Fase 5:** sistema en producción con datos reales.

---

## 9. Definición de métricas BI (fórmulas exactas)

### 9.1 Dashboard asesor (`/bi/asesor` — siempre filtrado por usuario de sesión)

| KPI | Fórmula |
|---|---|
| Atenciones día/semana/mes | COUNT(atenciones) por rango, id_asesor = yo |
| Mis cotizaciones activas | COUNT(cotizaciones estado='pendiente'), orden por fecha_limite ASC |
| Tasa de conversión propia | COUNT(mis cotizaciones estado='convertida') ÷ COUNT(mis cotizaciones total no anuladas) |
| Mis ventas del mes | SUM(valor_total) mes actual vs mes anterior (ventas activas) |
| Ventas por servicio | SUM(valor_total) GROUP BY servicio/actividad |
| Resultado de mis atenciones | COUNT GROUP BY resultado |
| Cotizaciones por estado | COUNT GROUP BY estado |
| Alertas por vencer | cotizaciones pendiente con fecha_limite ≤ hoy+3 días |

### 9.2 Dashboard coordinador (filtros: asesor, servicio, actividad, período, sede)

Además de las anteriores agregadas por equipo: ranking de atenciones por asesor; atenciones por servicio×resultado; evolución temporal; **pipeline** (COUNT y SUM(valor_total) por estado, embudo elaboradas→pendientes→aprobadas→convertidas); tasa de conversión por asesor (tabla rankeada); ventas totales del período; ticket promedio (SUM÷COUNT por asesor y servicio); rechazadas por motivo con valor perdido; vencidas sin gestión (fecha_ultima_gestion antigua). Todas exportables a Excel.

---

## 10. Criterios de éxito globales (medir tras salida a producción)

| Criterio | Objetivo |
|---|---|
| Adopción: % atenciones registradas vs estimado | ≥ 90 % en 2 meses |
| Eliminación del Excel de ventas | desde Fase 2 en producción |
| % cotizaciones con resultado final registrado | ≥ 80 % en 3 meses |
| Tiempo de registro por atención | ≤ 3 minutos |
| Pipeline visible en tiempo real | siempre en dashboard coordinador |

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Migración SQLite→MySQL rompe el turnero en producción | F1-3 mantiene la API idéntica; F1-4 verifica conteos; conservar `turnero.db` como respaldo de solo lectura hasta validar 2 semanas. |
| Credenciales SISU/BD Subsidio tardan | Mock ya operativo; F5-1/F5-2 son las únicas tareas bloqueadas por TI. Todo lo demás avanza. |
| Catálogos iniciales no aprobados por el área | Los seeds §4.7 son los ejemplos del documento; el módulo de parametrización (F4-4) permite ajustarlos sin código. Pedir aprobación del Jefe de Mercadeo antes de F1-2 si es posible, pero no bloquear. |
| Excel histórico con datos sucios | F2-5 valida fila a fila y genera reporte de rechazos en lugar de fallar todo el import. |
| `App.jsx` monolítico degrada velocidad de desarrollo | Refactor F1-6 es obligatorio antes de agregar módulos. |

---

## 12. Checklist de arranque para el agente

```
[ ] Leer este documento completo.
[ ] Verificar entorno: node --version, docker --version, acceso a este repo.
[ ] Crear rama: git checkout -b plataforma-mercadeo
[ ] Ejecutar la app actual (npm install; npm run dev:all) y recorrer las pantallas
    para conocer el comportamiento base antes de tocar nada.
[ ] Comenzar por F1-1 y avanzar tarea por tarea, con commit por tarea.
[ ] Al cerrar cada fase: verificar TODOS sus criterios de aceptación y anotar
    resultados en docs/AVANCE-IMPLEMENTACION.md (crearlo en la primera fase).
```
