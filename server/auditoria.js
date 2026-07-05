import db from './db.js'

// Registra un cambio en la tabla auditoria (seccion 10.1 del plan: todo
// registro queda asociado al usuario que lo creo/modifico, con snapshot del
// valor anterior). Un fallo al auditar no debe tumbar la operacion de negocio
// que la origino: se loguea y se sigue.
export async function auditar(tabla, idRegistro, accion, idUsuario, datosAnteriores = null, datosNuevos = null) {
  try {
    await db.query(
      `INSERT INTO auditoria (tabla, id_registro, accion, id_usuario, datos_anteriores, datos_nuevos)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tabla, idRegistro, accion, idUsuario, datosAnteriores, datosNuevos],
    )
  } catch (err) {
    console.error(`[auditoria] no se pudo registrar ${accion} sobre ${tabla}#${idRegistro}:`, err.message)
  }
}

export async function listAuditoria({ tabla, idRegistro, idUsuario, desde, hasta } = {}) {
  const condiciones = []
  const params = []
  if (tabla) {
    condiciones.push('a.tabla = ?')
    params.push(tabla)
  }
  if (idRegistro) {
    condiciones.push('a.id_registro = ?')
    params.push(idRegistro)
  }
  if (idUsuario) {
    condiciones.push('a.id_usuario = ?')
    params.push(idUsuario)
  }
  if (desde) {
    condiciones.push('a.created_at >= ?')
    params.push(desde)
  }
  if (hasta) {
    condiciones.push('a.created_at <= ?')
    params.push(hasta)
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  const [rows] = await db.query(
    `SELECT a.*, u.nombre AS usuario_nombre FROM auditoria a
     JOIN usuarios u ON u.id = a.id_usuario
     ${where} ORDER BY a.created_at DESC LIMIT 500`,
    params,
  )
  return rows.map((r) => ({
    id: r.id,
    tabla: r.tabla,
    idRegistro: r.id_registro,
    accion: r.accion,
    idUsuario: r.id_usuario,
    usuarioNombre: r.usuario_nombre,
    datosAnteriores: r.datos_anteriores,
    datosNuevos: r.datos_nuevos,
    createdAt: r.created_at,
  }))
}
