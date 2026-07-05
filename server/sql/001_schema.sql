-- ─────────────────────────────────────────────────────────────────
-- Plataforma de Gestion de Mercadeo Comfaguajira - Esquema MySQL
-- Fuente unica de verdad: BD de Mercadeo (ver docs/PLAN-IMPLEMENTACION-PLATAFORMA-MERCADEO.md)
-- Convencion: nunca se elimina informacion, solo se marca anulada/inactiva.
-- ─────────────────────────────────────────────────────────────────

SET NAMES utf8mb4;

-- ─── Control de migraciones ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS _migraciones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  archivo     VARCHAR(150) NOT NULL UNIQUE,
  ejecutada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- ─── Usuarios ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  uuid          CHAR(36) NOT NULL UNIQUE,
  username      VARCHAR(50) NOT NULL UNIQUE,
  nombre        VARCHAR(120) NOT NULL,
  cedula        VARCHAR(20),
  password_hash VARCHAR(100) NOT NULL,
  rol           ENUM('asesor_integral','asesor_comercial','coordinador','admin')
                NOT NULL DEFAULT 'asesor_integral',
  area          VARCHAR(80),
  sede          VARCHAR(60) NOT NULL DEFAULT 'Riohacha',
  activo        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- ─── Turnero (cola del dia) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS turnos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  fecha       VARCHAR(10) NOT NULL,
  numero      VARCHAR(20) NOT NULL,
  servicio    VARCHAR(60) NOT NULL,
  prefijo     VARCHAR(5) NOT NULL,
  cedula      VARCHAR(20),
  prioritario TINYINT(1) NOT NULL DEFAULT 0,
  condicion   VARCHAR(120),
  estado      VARCHAR(20) NOT NULL DEFAULT 'espera',
  modulo      INT,
  created_at  BIGINT NOT NULL,
  called_at   BIGINT,
  INDEX idx_turnos_fecha (fecha),
  INDEX idx_turnos_estado (fecha, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- ─── Afiliados (cache local de SISU / BD Subsidio, solo lectura de origen) ──
CREATE TABLE IF NOT EXISTS afiliados (
  cedula          VARCHAR(20) PRIMARY KEY,
  nombre          VARCHAR(160) NOT NULL,
  telefono        VARCHAR(30),
  correo          VARCHAR(120),
  categoria       ENUM('A','B','C','D') DEFAULT NULL,
  empresa         VARCHAR(160),
  info_subsidio   JSON,
  autoriza_datos  TINYINT(1) NOT NULL DEFAULT 0,
  fuente          ENUM('SISU','Subsidio','Manual') NOT NULL DEFAULT 'Manual',
  actualizado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- ─── Atenciones (modulo existente, extendido con resultado y vinculos) ────
CREATE TABLE IF NOT EXISTS atenciones (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  codigo              VARCHAR(20) NOT NULL,
  fecha               VARCHAR(40) NOT NULL,
  created_at          BIGINT NOT NULL,
  document            VARCHAR(20),
  client              VARCHAR(160),
  phone               VARCHAR(30),
  email               VARCHAR(120),
  address             VARCHAR(200),
  city                VARCHAR(80),
  service             VARCHAR(60),
  motive              VARCHAR(120),
  status              VARCHAR(40),
  advisor             VARCHAR(120),
  channel             VARCHAR(40),
  duration            VARCHAR(20),
  management          TEXT,
  observations        TEXT,
  caso                VARCHAR(40),
  turno_id            INT,
  turno_numero        VARCHAR(20),
  modulo              INT,
  prioritario         TINYINT(1) DEFAULT 0,
  espera_min          INT,
  sisu_json           JSON,
  interes             JSON,
  consentimiento      TINYINT(1) DEFAULT 0,
  accion_seguimiento  VARCHAR(120),
  fecha_seguimiento   VARCHAR(20),
  nota_mercadeo       TEXT,
  -- Extension Plataforma de Mercadeo (Fase 1, seccion 4.3 del plan):
  resultado                 VARCHAR(40)  NULL,
  interes_servicio          JSON         NULL,
  genera_cotizacion         TINYINT(1)   NOT NULL DEFAULT 0,
  genera_venta              TINYINT(1)   NOT NULL DEFAULT 0,
  id_cotizacion_vinculada   INT NULL,
  id_venta_vinculada        INT NULL,
  sede                      VARCHAR(60) NOT NULL DEFAULT 'Riohacha',
  id_asesor                 INT NULL,
  INDEX idx_atenciones_doc (document),
  INDEX idx_atenciones_codigo (codigo),
  INDEX idx_atenciones_asesor (id_asesor),
  INDEX idx_atenciones_resultado (resultado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- ─── Catalogos de servicios / actividades ──────────────────────────
CREATE TABLE IF NOT EXISTS servicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE IF NOT EXISTS actividades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_servicio INT NOT NULL,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (id_servicio) REFERENCES servicios(id),
  INDEX idx_actividades_servicio (id_servicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Catalogo generico parametrizable (resultados, motivos, lugares, etc.)
CREATE TABLE IF NOT EXISTS catalogos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_catalogo (tipo, codigo),
  INDEX idx_catalogo_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- ─── Ventas ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  uuid                CHAR(36) NOT NULL UNIQUE,
  codigo_atencion     INT NULL,
  id_cotizacion       INT NULL,
  cedula_cliente      VARCHAR(20) NOT NULL,
  nombre_cliente      VARCHAR(160) NOT NULL,
  telefono            VARCHAR(30),
  correo              VARCHAR(120),
  servicio            VARCHAR(60) NOT NULL,
  actividad           VARCHAR(60) NOT NULL,
  categoria           ENUM('A','B','C','D') NOT NULL,
  lugar_prestacion    VARCHAR(120) NOT NULL,
  fecha_servicio      DATE NOT NULL,
  valor_unitario      DECIMAL(14,2) NOT NULL,
  cantidad            INT NOT NULL DEFAULT 1,
  valor_total         DECIMAL(14,2) NOT NULL,
  numero_factura      VARCHAR(40),
  responsable_factura INT NULL,
  numero_aprobado     VARCHAR(60),
  tipo_pago           ENUM('contado','credito') NOT NULL,
  id_vendedor         INT NOT NULL,
  observacion         TEXT,
  sede                VARCHAR(60) NOT NULL DEFAULT 'Riohacha',
  estado              ENUM('activa','anulada') NOT NULL DEFAULT 'activa',
  fecha_registro      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (codigo_atencion) REFERENCES atenciones(id),
  FOREIGN KEY (id_vendedor) REFERENCES usuarios(id),
  FOREIGN KEY (responsable_factura) REFERENCES usuarios(id),
  INDEX idx_ventas_vendedor (id_vendedor),
  INDEX idx_ventas_fecha (fecha_registro),
  INDEX idx_ventas_cedula (cedula_cliente),
  INDEX idx_ventas_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- ─── Cotizaciones ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cotizaciones (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  uuid                      CHAR(36) NOT NULL UNIQUE,
  numero_cotizacion_externo VARCHAR(40),
  codigo_atencion           INT NULL,
  cedula_cliente            VARCHAR(20) NOT NULL,
  nombre_cliente            VARCHAR(160) NOT NULL,
  empresa_cliente           VARCHAR(160),
  telefono                  VARCHAR(30),
  correo                    VARCHAR(120),
  servicio                  VARCHAR(60) NOT NULL,
  actividad                 VARCHAR(60) NOT NULL,
  descripcion_servicio      TEXT NOT NULL,
  fecha_cotizacion          DATE NOT NULL,
  fecha_limite_confirmacion DATE NOT NULL,
  fecha_servicio            DATE NULL,
  valor_total               DECIMAL(14,2) NOT NULL,
  tipo_pago                 ENUM('contado','credito') NOT NULL,
  estado ENUM('elaborada','pendiente','aprobada','rechazada','convertida','vencida')
         NOT NULL DEFAULT 'pendiente',
  motivo_rechazo            VARCHAR(120),
  id_venta_generada         INT NULL,
  id_asesor                 INT NOT NULL,
  observaciones             TEXT,
  sede                      VARCHAR(60) NOT NULL DEFAULT 'Riohacha',
  anulada                   TINYINT(1) NOT NULL DEFAULT 0,
  fecha_ultima_gestion      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (codigo_atencion) REFERENCES atenciones(id),
  FOREIGN KEY (id_asesor) REFERENCES usuarios(id),
  FOREIGN KEY (id_venta_generada) REFERENCES ventas(id),
  INDEX idx_cot_estado (estado),
  INDEX idx_cot_asesor (id_asesor),
  INDEX idx_cot_limite (fecha_limite_confirmacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Cierra la referencia cruzada ventas -> cotizaciones (creada despues de cotizaciones).
ALTER TABLE ventas
  ADD CONSTRAINT fk_ventas_cotizacion FOREIGN KEY (id_cotizacion) REFERENCES cotizaciones(id);

ALTER TABLE atenciones
  ADD CONSTRAINT fk_atenciones_cotizacion FOREIGN KEY (id_cotizacion_vinculada) REFERENCES cotizaciones(id),
  ADD CONSTRAINT fk_atenciones_venta FOREIGN KEY (id_venta_vinculada) REFERENCES ventas(id),
  ADD CONSTRAINT fk_atenciones_asesor FOREIGN KEY (id_asesor) REFERENCES usuarios(id);

-- ─── Facturaciones (bandeja de control, NO factura ni integra contable) ────
CREATE TABLE IF NOT EXISTS facturaciones (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  uuid             CHAR(36) NOT NULL UNIQUE,
  numero_factura   VARCHAR(40) NOT NULL,
  id_venta         INT NULL,
  cedula_cliente   VARCHAR(20) NOT NULL,
  valor_factura    DECIMAL(14,2) NOT NULL,
  id_responsable   INT NULL,
  estado_gestion   VARCHAR(40) NOT NULL DEFAULT 'sin_asignar',
  fecha_asignacion TIMESTAMP NULL,
  observacion      TEXT,
  sede             VARCHAR(60) NOT NULL DEFAULT 'Riohacha',
  anulada          TINYINT(1) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_venta) REFERENCES ventas(id),
  FOREIGN KEY (id_responsable) REFERENCES usuarios(id),
  INDEX idx_facturas_estado (estado_gestion),
  INDEX idx_facturas_responsable (id_responsable)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- ─── Auditoria ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tabla VARCHAR(50) NOT NULL,
  id_registro INT NOT NULL,
  accion ENUM('crear','editar','anular','reactivar','cambio_estado') NOT NULL,
  id_usuario INT NOT NULL,
  datos_anteriores JSON NULL,
  datos_nuevos JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
  INDEX idx_aud_tabla (tabla, id_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- ─── Notificaciones internas ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  referencia_tabla VARCHAR(40),
  referencia_id INT,
  mensaje VARCHAR(255) NOT NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
  INDEX idx_notif_usuario (id_usuario, leida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
