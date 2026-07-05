import db from './db.js'
import { v4 as uuidv4 } from 'uuid'
import { auditar } from './auditoria.js'
import { esSupervisor } from './auth.js'
import { catalogoTieneCodigo } from './catalogo.js'
import { crearNotificacion } from './notificaciones.js'

function rowToFactura(r) {
  if (!r) return null
  return {
    id: r.id,
    uuid: r.uuid,
    numeroFactura: r.numero_factura,
    idVenta: r.id_venta,
    idRegistrador: r.id_registrador,
    registradorNombre: r.registrador_nombre || '',
    cedulaCliente: r.cedula_cliente,
    valorFactura: Number(r.valor_factura),
    idResponsable: r.id_responsable,
    responsableNombre: r.responsable_nombre || '',
    estadoGestion: r.estado_gestion,
    fechaAsignacion: r.fecha_asignacion,
    observacion: r.observacion || '',
    sede: r.sede,
    anulada: Boolean(r.anulada),
    createdAt: r.created_at,
  }
}

const SELECT_FACTURA = `
  SELECT f.*, reg.nombre AS registrador_nombre, resp.nombre AS responsable_nombre
  FROM facturaciones f
  LEFT JOIN usuarios reg ON reg.id = f.id_registrador
  LEFT JOIN usuarios resp ON resp.id = f.id_responsable
`

function puedeVer(factura, user) {
  return esSupervisor(user) || factura.idRegistrador === user.id || factura.idResponsable === user.id
}

export async function listFacturas(user, filtros = {}) {
  const condiciones = ['f.anulada = 0']
  const params = []

  if (!esSupervisor(user)) {
    condiciones.push('(f.id_registrador = ? OR f.id_responsable = ?)')
    params.push(user.id, user.id)
  } else if (filtros.responsable) {
    condiciones.push('f.id_responsable = ?')
    params.push(filtros.responsable)
  }
  if (filtros.estadoGestion) {
    condiciones.push('f.estado_gestion = ?')
    params.push(filtros.estadoGestion)
  }
  if (filtros.q) {
    condiciones.push('(f.cedula_cliente LIKE ? OR f.numero_factura LIKE ?)')
    params.push(`%${filtros.q}%`, `%${filtros.q}%`)
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  const [rows] = await db.query(`${SELECT_FACTURA} ${where} ORDER BY f.created_at DESC`, params)
  return rows.map(rowToFactura)
}

export async function getFactura(id, user) {
  const [[row]] = await db.query(`${SELECT_FACTURA} WHERE f.id = ?`, [id])
  if (!row) return null
  const factura = rowToFactura(row)
  if (!puedeVer(factura, user)) {
    throw Object.assign(new Error('No tienes permiso para ver esta factura'), { status: 403 })
  }
  return factura
}

export async function crearFactura(data, user) {
  if (!data.numeroFactura) {
    throw Object.assign(new Error('El numero de factura es obligatorio'), { status: 400 })
  }

  let cedulaCliente = data.cedulaCliente
  let valorFactura = data.valorFactura

  if (data.idVenta) {
    const [[venta]] = await db.query('SELECT cedula_cliente, valor_total FROM ventas WHERE id = ?', [data.idVenta])
    if (!venta) throw Object.assign(new Error('La venta indicada no existe'), { status: 400 })
    cedulaCliente = cedulaCliente || venta.cedula_cliente
    valorFactura = valorFactura ?? venta.valor_total
  }
  if (!cedulaCliente || !(Number(valorFactura) > 0)) {
    throw Object.assign(new Error('Cedula del cliente y valor de la factura son obligatorios'), { status: 400 })
  }

  // Solo coordinador/admin puede asignar responsable desde la creacion.
  const asignaDesdeCreacion = data.responsableFactura && esSupervisor(user)
  const uuid = uuidv4()

  const [info] = await db.query(
    `INSERT INTO facturaciones
      (uuid, numero_factura, id_venta, id_registrador, cedula_cliente, valor_factura,
       id_responsable, estado_gestion, fecha_asignacion, observacion, sede)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      data.numeroFactura,
      data.idVenta || null,
      user.id,
      cedulaCliente,
      Number(valorFactura),
      asignaDesdeCreacion ? data.responsableFactura : null,
      asignaDesdeCreacion ? 'asignada' : 'sin_asignar',
      asignaDesdeCreacion ? new Date() : null,
      data.observacion || null,
      user.sede || 'Riohacha',
    ],
  )

  if (asignaDesdeCreacion) {
    await crearNotificacion({
      idUsuario: data.responsableFactura,
      tipo: 'factura_asignada',
      referenciaTabla: 'facturaciones',
      referenciaId: info.insertId,
      mensaje: `Se te asigno la factura ${data.numeroFactura} para gestionar.`,
    })
  }

  const creada = await getFactura(info.insertId, user)
  await auditar('facturaciones', info.insertId, 'crear', user.id, null, creada)
  return creada
}

// Solo coordinador/admin (verificado en la ruta).
export async function asignarResponsable(id, idResponsable, user) {
  const [[row]] = await db.query(`${SELECT_FACTURA} WHERE f.id = ?`, [id])
  if (!row) return null
  const antes = rowToFactura(row)

  await db.query(
    "UPDATE facturaciones SET id_responsable = ?, estado_gestion = 'asignada', fecha_asignacion = NOW() WHERE id = ?",
    [idResponsable, id],
  )
  await crearNotificacion({
    idUsuario: idResponsable,
    tipo: 'factura_asignada',
    referenciaTabla: 'facturaciones',
    referenciaId: id,
    mensaje: `Se te asigno la factura ${antes.numeroFactura} para gestionar.`,
  })

  const despues = await getFactura(id, user)
  await auditar('facturaciones', id, 'editar', user.id, antes, despues)
  return despues
}

// El responsable (o coordinador+) actualiza el estado de gestion o las notas.
// El estado es parametrizable (catalogo 'estado_gestion_factura'), no un enum fijo.
export async function actualizarFactura(id, data, user) {
  const actual = await getFactura(id, user) // valida scope
  if (!actual) return null

  if (data.estadoGestion) {
    const valido = await catalogoTieneCodigo('estado_gestion_factura', data.estadoGestion)
    if (!valido) throw Object.assign(new Error('Estado de gestion no valido'), { status: 400 })
    if (!esSupervisor(user) && actual.idResponsable !== user.id) {
      throw Object.assign(new Error('Solo el responsable asignado puede actualizar la gestion'), { status: 403 })
    }
  }

  const nuevoEstado = data.estadoGestion || actual.estadoGestion
  const nuevaObservacion = data.observacion != null ? data.observacion : actual.observacion
  const nuevoNumero = data.numeroFactura || actual.numeroFactura

  await db.query(
    'UPDATE facturaciones SET numero_factura = ?, estado_gestion = ?, observacion = ? WHERE id = ?',
    [nuevoNumero, nuevoEstado, nuevaObservacion, id],
  )

  const despues = await getFactura(id, user)
  await auditar('facturaciones', id, 'editar', user.id, actual, despues)
  return despues
}

// Solo coordinador/admin (verificado en la ruta).
export async function anularFactura(id, user) {
  const [[row]] = await db.query(`${SELECT_FACTURA} WHERE f.id = ?`, [id])
  if (!row) return null
  const antes = rowToFactura(row)

  await db.query('UPDATE facturaciones SET anulada = 1 WHERE id = ?', [id])
  const despues = { ...antes, anulada: true }
  await auditar('facturaciones', id, 'anular', user.id, antes, despues)
  return despues
}
