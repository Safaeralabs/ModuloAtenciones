// Envio de correo (SMTP) para alertas internas — seccion 14 del documento de
// arquitectura ("Correo SMTP: notificaciones de cotizaciones por vencer").
//
// Degrada con elegancia: si no hay SMTP_HOST configurado, enviarCorreo() no
// hace nada (solo avisa una vez). Asi la plataforma corre sin correo hasta que
// TI entregue el servidor SMTP de Comfaguajira; entonces basta llenar el .env.
//
// Variables de entorno:
//   SMTP_HOST     host del servidor SMTP (si falta, el correo queda deshabilitado)
//   SMTP_PORT     puerto (def. 587)
//   SMTP_SECURE   'true' para TLS directo (puerto 465); def. false (STARTTLS)
//   SMTP_USER     usuario de autenticacion (opcional)
//   SMTP_PASSWORD clave de autenticacion (opcional)
//   SMTP_FROM     remitente, ej. "Mercadeo Comfaguajira <mercadeo@comfaguajira.co>"

import nodemailer from 'nodemailer'

let transportePromesa = null
let avisoDeshabilitado = false

function smtpConfigurado() {
  return Boolean(process.env.SMTP_HOST)
}

// Crea (una sola vez) el transporte de nodemailer con la config del entorno.
function obtenerTransporte() {
  if (transportePromesa) return transportePromesa
  transportePromesa = Promise.resolve(
    nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || '' }
        : undefined,
    }),
  )
  return transportePromesa
}

// Envia un correo. Si SMTP no esta configurado, no hace nada (no lanza error):
// las notificaciones internas en la plataforma siguen funcionando igual.
export async function enviarCorreo({ to, subject, text, html }) {
  if (!smtpConfigurado()) {
    if (!avisoDeshabilitado) {
      console.log('[mailer] SMTP no configurado (SMTP_HOST vacio): los correos quedan deshabilitados.')
      avisoDeshabilitado = true
    }
    return { enviado: false, motivo: 'smtp_no_configurado' }
  }
  if (!to) return { enviado: false, motivo: 'sin_destinatario' }

  try {
    const transporte = await obtenerTransporte()
    const from = process.env.SMTP_FROM || 'Mercadeo Comfaguajira <no-reply@comfaguajira.co>'
    await transporte.sendMail({ from, to, subject, text, html })
    return { enviado: true }
  } catch (err) {
    // Un fallo de correo nunca debe tumbar la operacion que lo dispara.
    console.error('[mailer] error al enviar correo:', err.message)
    return { enviado: false, motivo: err.message }
  }
}

export { smtpConfigurado }
