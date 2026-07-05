-- Fase 5 (integracion SMTP): correo del usuario para enviarle por email las
-- alertas de cotizaciones por vencer, ademas de la notificacion en plataforma
-- (seccion 14 del documento de arquitectura). Opcional: si esta vacio, el
-- usuario solo recibe la notificacion interna.
ALTER TABLE usuarios
  ADD COLUMN correo VARCHAR(120) NULL AFTER nombre;
