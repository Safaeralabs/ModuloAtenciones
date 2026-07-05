import db from './db.js'

function rowToNotificacion(r) {
  return {
    id: r.id,
    tipo: r.tipo,
    referenciaTabla: r.referencia_tabla,
    referenciaId: r.referencia_id,
    mensaje: r.mensaje,
    leida: Boolean(r.leida),
    createdAt: r.created_at,
  }
}

export async function crearNotificacion({ idUsuario, tipo, referenciaTabla = null, referenciaId = null, mensaje }) {
  await db.query(
    `INSERT INTO notificaciones (id_usuario, tipo, referencia_tabla, referencia_id, mensaje)
     VALUES (?, ?, ?, ?, ?)`,
    [idUsuario, tipo, referenciaTabla, referenciaId, mensaje],
  )
}

// Propias del usuario, no leidas primero (seccion 6 del contrato de API del plan).
export async function listNotificaciones(userId) {
  const [rows] = await db.query(
    `SELECT * FROM notificaciones WHERE id_usuario = ?
     ORDER BY leida ASC, created_at DESC LIMIT 50`,
    [userId],
  )
  return rows.map(rowToNotificacion)
}

export async function marcarLeida(id, userId) {
  await db.query('UPDATE notificaciones SET leida = 1 WHERE id = ? AND id_usuario = ?', [id, userId])
}
