import db from './db.js'
import { v4 as uuidv4 } from 'uuid'
import { auditar } from './auditoria.js'
import { actividadPerteneceAServicio } from './catalogo.js'
import { esSupervisor } from './auth.js'
import { validarParaConversion, aplicarConversion } from './cotizaciones.js'

const CATEGORIAS = ['A', 'B', 'C', 'D']
const TIPOS_PAGO = ['contado', 'credito']

function rowToVenta(r) {
  if (!r) return null
  return {
    id: r.id,
    uuid: r.uuid,
    codigoAtencion: r.codigo_atencion,
    idCotizacion: r.id_cotizacion,
    cedulaCliente: r.cedula_cliente,
    nombreCliente: r.nombre_cliente,
    telefono: r.telefono || '',
    correo: r.correo || '',
    servicio: r.servicio,
    actividad: r.actividad,
    categoria: r.categoria,
    lugarPrestacion: r.lugar_prestacion,
    fechaServicio: r.fecha_servicio,
    valorUnitario: Number(r.valor_unitario),
    cantidad: r.cantidad,
    valorTotal: Number(r.valor_total),
    numeroFactura: r.numero_factura || '',
    responsableFactura: r.responsable_factura,
    responsableFacturaNombre: r.responsable_nombre || '',
    numeroAprobado: r.numero_aprobado || '',
    tipoPago: r.tipo_pago,
    idVendedor: r.id_vendedor,
    vendedorNombre: r.vendedor_nombre || '',
    observacion: r.observacion || '',
    sede: r.sede,
    estado: r.estado,
    fechaRegistro: r.fecha_registro,
  }
}

const SELECT_VENTA = `
  SELECT v.*, u.nombre AS vendedor_nombre, r.nombre AS responsable_nombre
  FROM ventas v
  JOIN usuarios u ON u.id = v.id_vendedor
  LEFT JOIN usuarios r ON r.id = v.responsable_factura
`

export async function listVentas(user, filtros = {}) {
  const condiciones = []
  const params = []

  if (!esSupervisor(user)) {
    condiciones.push('v.id_vendedor = ?')
    params.push(user.id)
  } else if (filtros.asesor) {
    condiciones.push('v.id_vendedor = ?')
    params.push(filtros.asesor)
  }
  if (filtros.desde) {
    condiciones.push('v.fecha_servicio >= ?')
    params.push(filtros.desde)
  }
  if (filtros.hasta) {
    condiciones.push('v.fecha_servicio <= ?')
    params.push(filtros.hasta)
  }
  if (filtros.servicio) {
    condiciones.push('v.servicio = ?')
    params.push(filtros.servicio)
  }
  if (filtros.actividad) {
    condiciones.push('v.actividad = ?')
    params.push(filtros.actividad)
  }
  if (filtros.estado) {
    condiciones.push('v.estado = ?')
    params.push(filtros.estado)
  }
  if (filtros.q) {
    condiciones.push('(v.cedula_cliente LIKE ? OR v.nombre_cliente LIKE ?)')
    params.push(`%${filtros.q}%`, `%${filtros.q}%`)
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  const [rows] = await db.query(`${SELECT_VENTA} ${where} ORDER BY v.fecha_registro DESC`, params)
  return rows.map(rowToVenta)
}

export async function getVenta(id, user) {
  const [[row]] = await db.query(`${SELECT_VENTA} WHERE v.id = ?`, [id])
  if (!row) return null
  if (!esSupervisor(user) && row.id_vendedor !== user.id) {
    throw Object.assign(new Error('No tienes permiso para ver esta venta'), { status: 403 })
  }
  return rowToVenta(row)
}

function validarCamposVenta({ cedulaCliente, nombreCliente, servicio, actividad, categoria, lugarPrestacion, fechaServicio, valorUnitario, cantidad, tipoPago }) {
  if (!cedulaCliente || !nombreCliente || !servicio || !actividad || !lugarPrestacion || !fechaServicio) {
    throw Object.assign(new Error('Completa cedula, nombre, servicio, actividad, lugar y fecha del servicio'), { status: 400 })
  }
  if (!CATEGORIAS.includes(categoria)) {
    throw Object.assign(new Error('Categoria no valida (debe ser A, B, C o D)'), { status: 400 })
  }
  if (!TIPOS_PAGO.includes(tipoPago)) {
    throw Object.assign(new Error('Tipo de pago no valido (contado o credito)'), { status: 400 })
  }
  const valorUnitarioNum = Number(valorUnitario)
  const cantidadNum = Number(cantidad)
  if (!(valorUnitarioNum > 0) || !Number.isInteger(cantidadNum) || cantidadNum < 1) {
    throw Object.assign(new Error('Valor unitario y cantidad deben ser numeros validos mayores a cero'), { status: 400 })
  }
  return { valorUnitarioNum, cantidadNum }
}

export async function crearVenta(data, user) {
  const { valorUnitarioNum, cantidadNum } = validarCamposVenta(data)

  const actividadValida = await actividadPerteneceAServicio(data.servicio, data.actividad)
  if (!actividadValida) {
    throw Object.assign(new Error('La actividad seleccionada no pertenece al servicio elegido'), { status: 400 })
  }

  // Si la venta viene de una cotizacion, esta debe estar Aprobada (seccion 6.2
  // del plan). Se valida ANTES de insertar para no dejar ventas huerfanas.
  const cotizacionOrigen = data.idCotizacion ? await validarParaConversion(data.idCotizacion, user) : null

  const valorTotal = valorUnitarioNum * cantidadNum
  const uuid = uuidv4()

  const [info] = await db.query(
    `INSERT INTO ventas
      (uuid, codigo_atencion, id_cotizacion, cedula_cliente, nombre_cliente, telefono, correo,
       servicio, actividad, categoria, lugar_prestacion, fecha_servicio, valor_unitario, cantidad,
       valor_total, numero_factura, responsable_factura, numero_aprobado, tipo_pago, id_vendedor,
       observacion, sede)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      data.codigoAtencion || null,
      data.idCotizacion || null,
      String(data.cedulaCliente).trim(),
      String(data.nombreCliente).trim(),
      data.telefono || null,
      data.correo || null,
      data.servicio,
      data.actividad,
      data.categoria,
      String(data.lugarPrestacion).trim(),
      data.fechaServicio,
      valorUnitarioNum,
      cantidadNum,
      valorTotal,
      data.numeroFactura || null,
      data.responsableFactura || null,
      data.numeroAprobado || null,
      data.tipoPago,
      user.id,
      data.observacion || null,
      user.sede || 'Riohacha',
    ],
  )

  if (data.codigoAtencion) {
    await db.query('UPDATE atenciones SET id_venta_vinculada = ? WHERE id = ?', [info.insertId, data.codigoAtencion])
  }
  if (cotizacionOrigen) {
    await aplicarConversion(cotizacionOrigen, info.insertId, user)
  }

  const creada = await getVenta(info.insertId, user)
  await auditar('ventas', info.insertId, 'crear', user.id, null, creada)
  return creada
}

export async function actualizarVenta(id, data, user) {
  const actual = await getVenta(id, user) // ya valida scope (owner o supervisor)
  if (!actual) return null
  if (actual.estado === 'anulada') {
    throw Object.assign(new Error('No se puede editar una venta anulada'), { status: 400 })
  }

  const merged = { ...actual, ...data }
  const { valorUnitarioNum, cantidadNum } = validarCamposVenta({
    cedulaCliente: merged.cedulaCliente,
    nombreCliente: merged.nombreCliente,
    servicio: merged.servicio,
    actividad: merged.actividad,
    categoria: merged.categoria,
    lugarPrestacion: merged.lugarPrestacion,
    fechaServicio: merged.fechaServicio,
    valorUnitario: merged.valorUnitario,
    cantidad: merged.cantidad,
    tipoPago: merged.tipoPago,
  })
  const actividadValida = await actividadPerteneceAServicio(merged.servicio, merged.actividad)
  if (!actividadValida) {
    throw Object.assign(new Error('La actividad seleccionada no pertenece al servicio elegido'), { status: 400 })
  }
  const valorTotal = valorUnitarioNum * cantidadNum

  await db.query(
    `UPDATE ventas SET
       cedula_cliente = ?, nombre_cliente = ?, telefono = ?, correo = ?, servicio = ?, actividad = ?,
       categoria = ?, lugar_prestacion = ?, fecha_servicio = ?, valor_unitario = ?, cantidad = ?,
       valor_total = ?, numero_factura = ?, responsable_factura = ?, numero_aprobado = ?, tipo_pago = ?,
       observacion = ?
     WHERE id = ?`,
    [
      merged.cedulaCliente, merged.nombreCliente, merged.telefono || null, merged.correo || null,
      merged.servicio, merged.actividad, merged.categoria, merged.lugarPrestacion, merged.fechaServicio,
      valorUnitarioNum, cantidadNum, valorTotal, merged.numeroFactura || null,
      merged.responsableFactura || null, merged.numeroAprobado || null, merged.tipoPago,
      merged.observacion || null, id,
    ],
  )

  const actualizada = await getVenta(id, user)
  await auditar('ventas', id, 'editar', user.id, actual, actualizada)
  return actualizada
}

// Solo coordinador/admin (verificado en la ruta). No se elimina el registro,
// solo se marca anulada (principio de no-borrado, seccion 10.1 del plan).
export async function anularVenta(id, motivo, user) {
  const [[row]] = await db.query(`${SELECT_VENTA} WHERE v.id = ?`, [id])
  if (!row) return null
  const antes = rowToVenta(row)

  const observacionFinal = motivo
    ? `${row.observacion ? row.observacion + ' | ' : ''}Anulada: ${motivo}`
    : row.observacion

  await db.query("UPDATE ventas SET estado = 'anulada', observacion = ? WHERE id = ?", [observacionFinal, id])
  const despues = await getVenta(id, user)
  await auditar('ventas', id, 'anular', user.id, antes, despues)
  return despues
}
