-- Fase 3 (Control de Facturaciones): distingue quien registro la factura de
-- quien es el responsable de gestionarla (columnas distintas, seccion 7 del plan).
ALTER TABLE facturaciones
  ADD COLUMN id_registrador INT NULL AFTER id_venta,
  ADD CONSTRAINT fk_facturas_registrador FOREIGN KEY (id_registrador) REFERENCES usuarios(id);
