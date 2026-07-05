import db from './db.js'
import { v4 as uuidv4 } from 'uuid'
import { auditar } from './auditoria.js'
import { esSupervisor } from './auth.js'
import { crearNotificacion } from './notificaciones.js'
import { enviarCorreo } from './mailer.js'

const TIPOS_PAGO = ['contado', 'credito']

// Maquina de estados del ciclo de vida de la cotizacion (seccion 6.2 del plan).
// 'convertida' solo se alcanza automaticamente al registrar la venta vinculada.
const TRANSICIONES = {
  elaborada: ['pendiente', 'aprobada', 'rechazada'],
  pendiente: ['aprobada', 'rechazada', 'vencida'],
  aprobada: [],
  rechazada: [],
  convertida: [],
  vencida: ['pendiente'],
}

function rowToCotizacion(r) {
  if (!r) return null
  return {
    id: r.id,
    uuid: r.uuid,
    numeroCotizacionExterno: r.numero_cotizacion_externo || '',
    codigoAtencion: r.codigo_atencion,
    cedulaCliente: r.cedula_cliente,
    nombreCliente: r.nombre_cliente,
    empresaCliente: r.empresa_cliente || '',
    telefono: r.telefono || '',
    correo: r.correo || '',
    servicio: r.servicio,
    actividad: r.actividad,
    descripcionServicio: r.descripcion_servicio,
    fechaCotizacion: r.fecha_cotizacion,
    fechaLimiteConfirmacion: r.fecha_limite_confirmacion,
    fechaServicio: r.fecha_servicio,
    valorTotal: Number(r.valor_total),
    tipoPago: r.tipo_pago,
    estado: r.estado,
    motivoRechazo: r.motivo_rechazo || '',
    idVentaGenerada: r.id_venta_generada,
    idAsesor: r.id_asesor,
    asesorNombre: r.asesor_nombre || '',
    observaciones: r.observaciones || '',
    sede: r.sede,
    anulada: Boolean(r.anulada),
    fechaUltimaGestion: r.fecha_ultima_gestion,
  }
}

const SELECT_COTIZACION = `
  SELECT c.*, u.nombre AS asesor_nombre
  FROM cotizaciones c
  JOIN usuarios u ON u.id = c.id_asesor
`

export async function listCotizaciones(user, filtros = {}) {
  const condiciones = ['c.anulada = 0']
  const params = []

  if (!esSupervisor(user)) {
    condiciones.push('c.id_asesor = ?')
    params.push(user.id)
  } else if (filtros.asesor) {
    condiciones.push('c.id_asesor = ?')
    params.push(filtros.asesor)
  }
  if (filtros.estado) {
    condiciones.push('c.estado = ?')
    params.push(filtros.estado)
  }
  if (filtros.servicio) {
    condiciones.push('c.servicio = ?')
    params.push(filtros.servicio)
  }
  if (filtros.desde) {
    condiciones.push('c.fecha_cotizacion >= ?')
    params.push(filtros.desde)
  }
  if (filtros.hasta) {
    condiciones.push('c.fecha_cotizacion <= ?')
    params.push(filtros.hasta)
  }
  if (filtros.q) {
    condiciones.push('(c.cedula_cliente LIKE ? OR c.nombre_cliente LIKE ?)')
    params.push(`%${filtros.q}%`, `%${filtros.q}%`)
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  const [rows] = await db.query(`${SELECT_COTIZACION} ${where} ORDER BY c.fecha_ultima_gestion DESC`, params)
  return rows.map(rowToCotizacion)
}

export async function getCotizacion(id, user) {
  const [[row]] = await db.query(`${SELECT_COTIZACION} WHERE c.id = ?`, [id])
  if (!row) return null
  if (!esSupervisor(user) && row.id_asesor !== user.id) {
    throw Object.assign(new Error('No tienes permiso para ver esta cotizacion'), { status: 403 })
  }
  return rowToCotizacion(row)
}

function validarCampos({ cedulaCliente, nombreCliente, servicio, actividad, descripcionServicio, fechaLimiteConfirmacion, valorTotal, tipoPago }) {
  if (!cedulaCliente || !nombreCliente || !servicio || !actividad || !descripcionServicio || !fechaLimiteConfirmacion) {
    throw Object.assign(new Error('Completa cedula, nombre, servicio, actividad, descripcion y fecha limite'), { status: 400 })
  }
  if (!(Number(valorTotal) > 0)) {
    throw Object.assign(new Error('El valor total debe ser mayor a cero'), { status: 400 })
  }
  if (!TIPOS_PAGO.includes(tipoPago)) {
    throw Object.assign(new Error('Tipo de pago no valido (contado o credito)'), { status: 400 })
  }
}

export async function crearCotizacion(data, user) {
  validarCampos(data)

  const uuid = uuidv4()
  const [info] = await db.query(
    `INSERT INTO cotizaciones
      (uuid, numero_cotizacion_externo, codigo_atencion, cedula_cliente, nombre_cliente, empresa_cliente,
       telefono, correo, servicio, actividad, descripcion_servicio, fecha_cotizacion,
       fecha_limite_confirmacion, fecha_servicio, valor_total, tipo_pago, estado, id_asesor, observaciones, sede)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, 'pendiente', ?, ?, ?)`,
    [
      uuid,
      data.numeroCotizacionExterno || null,
      data.codigoAtencion || null,
      String(data.cedulaCliente).trim(),
      String(data.nombreCliente).trim(),
      data.empresaCliente || null,
      data.telefono || null,
      data.correo || null,
      data.servicio,
      data.actividad,
      String(data.descripcionServicio).trim(),
      data.fechaLimiteConfirmacion,
      data.fechaServicio || null,
      Number(data.valorTotal),
      data.tipoPago,
      user.id,
      data.observaciones || null,
      user.sede || 'Riohacha',
    ],
  )

  if (data.codigoAtencion) {
    await db.query('UPDATE atenciones SET id_cotizacion_vinculada = ? WHERE id = ?', [info.insertId, data.codigoAtencion])
  }

  const creada = await getCotizacion(info.insertId, user)
  await auditar('cotizaciones', info.insertId, 'crear', user.id, null, creada)
  return creada
}

export async function actualizarCotizacion(id, data, user) {
  const actual = await getCotizacion(id, user) // valida scope
  if (!actual) return null
  if (actual.estado === 'convertida') {
    throw Object.assign(new Error('No se puede editar una cotizacion ya convertida en venta'), { status: 400 })
  }

  const merged = { ...actual, ...data }
  validarCampos(merged)

  await db.query(
    `UPDATE cotizaciones SET
       numero_cotizacion_externo = ?, cedula_cliente = ?, nombre_cliente = ?, empresa_cliente = ?,
       telefono = ?, correo = ?, servicio = ?, actividad = ?, descripcion_servicio = ?,
       fecha_limite_confirmacion = ?, fecha_servicio = ?, valor_total = ?, tipo_pago = ?, observaciones = ?
     WHERE id = ?`,
    [
      merged.numeroCotizacionExterno || null, merged.cedulaCliente, merged.nombreCliente, merged.empresaCliente || null,
      merged.telefono || null, merged.correo || null, merged.servicio, merged.actividad, merged.descripcionServicio,
      merged.fechaLimiteConfirmacion, merged.fechaServicio || null, Number(merged.valorTotal), merged.tipoPago,
      merged.observaciones || null, id,
    ],
  )

  const actualizada = await getCotizacion(id, user)
  await auditar('cotizaciones', id, 'editar', user.id, actual, actualizada)
  return actualizada
}

export async function cambiarEstadoCotizacion(id, { estado, motivoRechazo }, user) {
  const actual = await getCotizacion(id, user) // valida scope
  if (!actual) return null

  if (estado === 'convertida') {
    throw Object.assign(new Error('La conversion a venta se hace automaticamente al registrar la venta vinculada'), { status: 400 })
  }
  if (!TRANSICIONES[actual.estado]?.includes(estado)) {
    throw Object.assign(new Error(`No se puede pasar de "${actual.estado}" a "${estado}"`), { status: 422 })
  }
  if (estado === 'pendiente' && actual.estado === 'vencida' && !esSupervisor(user)) {
    throw Object.assign(new Error('Solo el coordinador puede reactivar una cotizacion vencida'), { status: 403 })
  }
  if (estado === 'rechazada' && !motivoRechazo) {
    throw Object.assign(new Error('El motivo de rechazo es obligatorio'), { status: 400 })
  }

  await db.query('UPDATE cotizaciones SET estado = ?, motivo_rechazo = ? WHERE id = ?', [
    estado,
    estado === 'rechazada' ? motivoRechazo : null,
    id,
  ])

  const actualizada = await getCotizacion(id, user)
  await auditar('cotizaciones', id, 'cambio_estado', user.id, actual, actualizada)
  return actualizada
}

// Llamado desde ventas.crearVenta ANTES de insertar la venta: valida que la
// cotizacion este Aprobada (regla del ciclo de vida) y devuelve su estado
// actual para auditoria. Lanza error si no se puede convertir.
export async function validarParaConversion(idCotizacion, user) {
  const [[row]] = await db.query(`${SELECT_COTIZACION} WHERE c.id = ?`, [idCotizacion])
  if (!row) {
    throw Object.assign(new Error('La cotizacion vinculada no existe'), { status: 400 })
  }
  const cotizacion = rowToCotizacion(row)
  if (!esSupervisor(user) && cotizacion.idAsesor !== user.id) {
    throw Object.assign(new Error('No tienes permiso sobre esta cotizacion'), { status: 403 })
  }
  if (cotizacion.estado !== 'aprobada') {
    throw Object.assign(new Error('Solo se puede registrar una venta desde una cotizacion Aprobada'), { status: 422 })
  }
  return cotizacion
}

// Llamado desde ventas.crearVenta DESPUES de insertar la venta (ya se conoce
// idVenta). Completa la conversion: cotizacion -> 'convertida'.
export async function aplicarConversion(antes, idVenta, user) {
  await db.query("UPDATE cotizaciones SET estado = 'convertida', id_venta_generada = ? WHERE id = ?", [idVenta, antes.id])
  const [[actualizadaRow]] = await db.query(`${SELECT_COTIZACION} WHERE c.id = ?`, [antes.id])
  const despues = rowToCotizacion(actualizadaRow)
  await auditar('cotizaciones', antes.id, 'cambio_estado', user.id, antes, despues)
  return despues
}

// Devuelve los datos para prellenar el formulario de venta a partir de una
// cotizacion Aprobada (AV-02). No cambia nada: la conversion real ocurre al
// guardar la venta (POST /api/ventas con idCotizacion).
export async function prefillConversion(id, user) {
  const cot = await getCotizacion(id, user)
  if (!cot) return null
  if (cot.estado !== 'aprobada') {
    throw Object.assign(new Error('Solo se puede convertir una cotizacion en estado Aprobada'), { status: 400 })
  }
  return {
    idCotizacion: cot.id,
    codigoAtencion: cot.codigoAtencion,
    cedula: cot.cedulaCliente,
    nombre: cot.nombreCliente,
    telefono: cot.telefono,
    correo: cot.correo,
    servicio: cot.servicio,
    actividad: cot.actividad,
    valorSugerido: cot.valorTotal,
    tipoPago: cot.tipoPago,
  }
}

// Cuenta dias habiles (lunes a viernes) entre hoy y `fechaLimite`, ambos
// inclusive si fechaLimite es futura. Usado para el umbral "a 3 dias habiles".
function diasHabilesHasta(fechaLimite) {
  const hoy = new Date(new Date().toISOString().slice(0, 10))
  const limite = new Date(fechaLimite)
  if (limite < hoy) return -1
  let dias = 0
  const cursor = new Date(hoy)
  while (cursor < limite) {
    cursor.setDate(cursor.getDate() + 1)
    const diaSemana = cursor.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) dias++
  }
  return dias
}

// Cotizaciones pendientes a 3 dias habiles o menos de vencer (CO-02).
export async function alertasVencimiento(user) {
  const condiciones = ["c.estado = 'pendiente'", 'c.anulada = 0', 'c.fecha_limite_confirmacion >= CURDATE()']
  const params = []
  if (!esSupervisor(user)) {
    condiciones.push('c.id_asesor = ?')
    params.push(user.id)
  }
  const [rows] = await db.query(
    `${SELECT_COTIZACION} WHERE ${condiciones.join(' AND ')} ORDER BY c.fecha_limite_confirmacion ASC`,
    params,
  )
  return rows
    .map(rowToCotizacion)
    .filter((c) => diasHabilesHasta(c.fechaLimiteConfirmacion) <= 3)
}

// ─── Tareas programadas (llamadas desde server/cron.js) ───────────

export async function marcarVencidas() {
  const [result] = await db.query(
    "UPDATE cotizaciones SET estado = 'vencida' WHERE estado = 'pendiente' AND anulada = 0 AND fecha_limite_confirmacion < CURDATE()",
  )
  return result.affectedRows
}

// Notifica al asesor cuando su cotizacion esta a 2 dias calendario de vencer
// (seccion 6.4 del plan). Evita duplicar la notificacion el mismo dia.
export async function generarAlertasPorVencer() {
  const [rows] = await db.query(
    `SELECT c.id, c.id_asesor, c.nombre_cliente, c.fecha_limite_confirmacion,
            u.nombre AS asesor_nombre, u.correo AS asesor_correo
     FROM cotizaciones c
     JOIN usuarios u ON u.id = c.id_asesor
     WHERE c.estado = 'pendiente' AND c.anulada = 0
       AND c.fecha_limite_confirmacion = CURDATE() + INTERVAL 2 DAY`,
  )
  let creadas = 0
  for (const r of rows) {
    const [[yaExiste]] = await db.query(
      `SELECT 1 FROM notificaciones
       WHERE tipo = 'cotizacion_por_vencer' AND referencia_tabla = 'cotizaciones' AND referencia_id = ?
         AND DATE(created_at) = CURDATE()`,
      [r.id],
    )
    if (yaExiste) continue
    const mensaje = `La cotizacion de ${r.nombre_cliente} vence en 2 dias.`
    // Notificacion en plataforma (siempre) + correo (si SMTP configurado y el
    // asesor tiene correo). El correo nunca bloquea ni repite la notificacion.
    await crearNotificacion({
      idUsuario: r.id_asesor,
      tipo: 'cotizacion_por_vencer',
      referenciaTabla: 'cotizaciones',
      referenciaId: r.id,
      mensaje,
    })
    if (r.asesor_correo) {
      await enviarCorreo({
        to: r.asesor_correo,
        subject: 'Cotizacion por vencer — Mercadeo Comfaguajira',
        text: `Hola ${r.asesor_nombre},\n\n${mensaje}\nFecha limite: ${r.fecha_limite_confirmacion}.\n\nRevisa el pipeline de cotizaciones en la plataforma de mercadeo.`,
      })
    }
    creadas++
  }
  return creadas
}
