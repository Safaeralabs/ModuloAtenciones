-- Seeds iniciales de catalogos (docs/PLAN-IMPLEMENTACION-PLATAFORMA-MERCADEO.md, seccion 4.7)
-- Ajustables luego desde el modulo de Parametrizacion (Fase 4) sin tocar codigo.

-- ─── Servicios y actividades ────────────────────────────────────────
INSERT IGNORE INTO servicios (codigo, nombre) VALUES
  ('recreacion', 'Recreación'),
  ('educacion',  'Educación'),
  ('turismo',    'Turismo');

INSERT IGNORE INTO actividades (id_servicio, codigo, nombre)
SELECT s.id, a.codigo, a.nombre FROM servicios s
JOIN (
  SELECT 'recreacion' AS servicio_codigo, 'recreacion_dirigida' AS codigo, 'Recreación Dirigida' AS nombre
  UNION ALL SELECT 'recreacion', 'maziruma', 'Maziruma'
  UNION ALL SELECT 'turismo', 'tour_cartagena', 'Tour Cartagena'
  UNION ALL SELECT 'turismo', 'pasadia_jumping_lam', 'Pasadía Jumping Lam'
) a ON a.servicio_codigo = s.codigo;

-- ─── Catalogos genericos (tabla catalogos: tipo/codigo/nombre) ─────
INSERT IGNORE INTO catalogos (tipo, codigo, nombre, orden) VALUES
  -- motivo_atencion
  ('motivo_atencion', 'informacion_servicios', 'Información de servicios', 1),
  ('motivo_atencion', 'subsidios',             'Subsidios', 2),
  ('motivo_atencion', 'credito',               'Crédito', 3),
  ('motivo_atencion', 'certificados',          'Certificados', 4),

  -- resultado_atencion
  ('resultado_atencion', 'venta_directa',         'Venta directa', 1),
  ('resultado_atencion', 'cotizacion_generada',    'Cotización generada', 2),
  ('resultado_atencion', 'informacion_brindada',   'Información brindada', 3),
  ('resultado_atencion', 'afiliacion',             'Afiliación', 4),
  ('resultado_atencion', 'escalada',               'Escalada', 5),
  ('resultado_atencion', 'sin_resolucion',         'Sin resolución / Otro', 6),

  -- motivo_rechazo (cotizaciones)
  ('motivo_rechazo', 'precio_alto',       'Precio alto', 1),
  ('motivo_rechazo', 'sin_presupuesto',   'Sin presupuesto', 2),
  ('motivo_rechazo', 'tercero',           'Lo consiguió con tercero', 3),

  -- tipo_evento
  ('tipo_evento', 'cumpleanos',          'Cumpleaños', 1),
  ('tipo_evento', 'grado',               'Grado', 2),
  ('tipo_evento', 'reunion_empresarial', 'Reunión empresarial', 3),

  -- lugar_prestacion
  ('lugar_prestacion', 'maziruma',            'Maziruma', 1),
  ('lugar_prestacion', 'anas_mai',             'Anas Mai', 2),
  ('lugar_prestacion', 'restaurante',          'Restaurante', 3),
  ('lugar_prestacion', 'cancha_sintetica',     'Cancha Sintética', 4),

  -- categoria_afiliado
  ('categoria_afiliado', 'A', 'A (hasta 2 SMMLV)', 1),
  ('categoria_afiliado', 'B', 'B (hasta 4 SMMLV)', 2),
  ('categoria_afiliado', 'C', 'C', 3),
  ('categoria_afiliado', 'D', 'D', 4),

  -- tipo_seguimiento
  ('tipo_seguimiento', 'llamar',             'Llamar', 1),
  ('tipo_seguimiento', 'enviar_informacion', 'Enviar información', 2),
  ('tipo_seguimiento', 'agendar_cita',       'Agendar cita', 3),
  ('tipo_seguimiento', 'visita',             'Visita', 4),

  -- canal_atencion
  ('canal_atencion', 'presencial', 'Presencial', 1),
  ('canal_atencion', 'telefonico', 'Telefónico', 2),
  ('canal_atencion', 'virtual',    'Virtual', 3),
  ('canal_atencion', 'whatsapp',   'WhatsApp', 4),

  -- estado_gestion_factura
  ('estado_gestion_factura', 'sin_asignar', 'Sin asignar', 1),
  ('estado_gestion_factura', 'asignada',    'Asignada', 2),
  ('estado_gestion_factura', 'gestionada',  'Gestionada', 3),

  -- sede (multi-sede, escalable a 5 sedes sin rediseno)
  ('sede', 'riohacha', 'Riohacha', 1);
