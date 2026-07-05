import db from './db.js'
import { auditar } from './auditoria.js'
import { catalogoTieneCodigo } from './catalogo.js'
import { esSupervisor } from './auth.js'

// Prefijo de turno por servicio. Debe seguir a serviceOptions del frontend.
const PREFIX_BY_SERVICE = {
  Subsidio: 'S',
  Credito: 'C',
  'Asesor Integral': 'A',
  Mercadeo: 'M',
  Afiliaciones: 'F',
  PQRS: 'P',
}

const AVG_MINUTES_PER_TURN = 6
const LLAMADOS_VISIBLES = 6

// Resultados de atencion que exigen observaciones obligatorias al cerrar.
const RESULTADOS_CON_OBSERVACION_OBLIGATORIA = new Set(['sin_resolucion'])

function today() {
  // Fecha local en formato YYYY-MM-DD (clave del dia para el reset diario).
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function prefixFor(servicio) {
  return PREFIX_BY_SERVICE[servicio] || servicio.slice(0, 1).toUpperCase()
}

export function listServices() {
  return Object.keys(PREFIX_BY_SERVICE)
}

// --- Mapeo fila BD -> objeto turno que consume el frontend ---
function rowToTurno(r) {
  if (!r) return null
  return {
    id: String(r.id),
    numero: r.numero,
    servicio: r.servicio,
    prefijo: r.prefijo,
    cedula: r.cedula || '',
    prioritario: Boolean(r.prioritario),
    condicion: r.condicion || null,
    estado: r.estado,
    modulo: r.modulo,
    createdAt: Number(r.created_at),
    calledAt: r.called_at == null ? null : Number(r.called_at),
  }
}

// ─── Turnero (cola del dia) ──────────────────────────────────────

export async function snapshot() {
  const fecha = today()
  const [turnosRows] = await db.query('SELECT * FROM turnos WHERE fecha = ? ORDER BY created_at ASC', [
    fecha,
  ])
  const turns = turnosRows.map(rowToTurno)

  const enEspera = turns.filter((t) => t.estado === 'espera').length
  const atendidosHoy = turns.filter((t) => t.estado === 'atendido').length

  const llamados = turns
    .filter((t) => t.estado === 'llamado' || t.estado === 'atendido')
    .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0))
    .slice(0, LLAMADOS_VISIBLES)

  const ultimoLlamado =
    turns
      .filter((t) => t.estado === 'llamado')
      .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0))[0] || null

  return { date: fecha, enEspera, atendidosHoy, ultimoLlamado, llamados, turns }
}

export async function createTurno({ servicio, cedula, prioritario, condicion }) {
  if (!servicio || !PREFIX_BY_SERVICE[servicio]) {
    throw Object.assign(new Error('Servicio no valido'), { status: 400 })
  }
  const fecha = today()
  const prefijo = prefixFor(servicio)

  // Numeracion diaria por prefijo.
  const [[{ n: usados }]] = await db.query(
    'SELECT COUNT(*) AS n FROM turnos WHERE fecha = ? AND prefijo = ?',
    [fecha, prefijo],
  )
  const numero = `${prefijo}-${String(usados + 1).padStart(3, '0')}`

  const [info] = await db.query(
    `INSERT INTO turnos (fecha, numero, servicio, prefijo, cedula, prioritario, condicion, estado, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'espera', ?)`,
    [
      fecha,
      numero,
      servicio,
      prefijo,
      cedula ? String(cedula).trim() : '',
      prioritario ? 1 : 0,
      prioritario ? condicion || 'Prioritario' : null,
      Date.now(),
    ],
  )

  const [[turnoRow]] = await db.query('SELECT * FROM turnos WHERE id = ?', [info.insertId])
  const turno = rowToTurno(turnoRow)

  const [[{ n: enEsperaServicio }]] = await db.query(
    "SELECT COUNT(*) AS n FROM turnos WHERE fecha = ? AND estado = 'espera' AND servicio = ?",
    [fecha, servicio],
  )
  const [[{ n: enEspera }]] = await db.query(
    "SELECT COUNT(*) AS n FROM turnos WHERE fecha = ? AND estado = 'espera'",
    [fecha],
  )

  return {
    turno,
    posicion: enEsperaServicio,
    enEspera,
    esperaEstimadaMin: Math.max(0, enEsperaServicio - 1) * AVG_MINUTES_PER_TURN,
  }
}

// Siguiente turno: prioritarios primero, luego FIFO. Filtro opcional por servicio.
export async function llamarSiguiente({ modulo, servicio } = {}) {
  const fecha = today()
  const [[row]] = await db.query(
    `SELECT * FROM turnos
     WHERE fecha = ? AND estado = 'espera' AND (? IS NULL OR servicio = ?)
     ORDER BY prioritario DESC, created_at ASC
     LIMIT 1`,
    [fecha, servicio ?? null, servicio ?? null],
  )
  if (!row) return null

  await db.query("UPDATE turnos SET estado = 'llamado', modulo = ?, called_at = ? WHERE id = ?", [
    modulo ?? row.modulo ?? null,
    Date.now(),
    row.id,
  ])
  const [[updated]] = await db.query('SELECT * FROM turnos WHERE id = ?', [row.id])
  return rowToTurno(updated)
}

// Vuelve a anunciar un turno ya llamado (sin cambiar su estado).
export async function rellamarTurno(id) {
  const [[row]] = await db.query("SELECT * FROM turnos WHERE id = ? AND estado = 'llamado'", [id])
  if (!row) return null
  await db.query('UPDATE turnos SET called_at = ? WHERE id = ?', [Date.now(), id])
  const [[updated]] = await db.query('SELECT * FROM turnos WHERE id = ?', [id])
  return rowToTurno(updated)
}

export async function atenderTurno(id) {
  const [[row]] = await db.query('SELECT * FROM turnos WHERE id = ?', [id])
  if (!row) return null
  await db.query("UPDATE turnos SET estado = 'atendido' WHERE id = ?", [id])
  const [[updated]] = await db.query('SELECT * FROM turnos WHERE id = ?', [id])
  return rowToTurno(updated)
}

// El cliente no se presento: sale de la cola.
export async function marcarAusente(id) {
  const [[row]] = await db.query('SELECT * FROM turnos WHERE id = ?', [id])
  if (!row) return null
  await db.query("UPDATE turnos SET estado = 'ausente' WHERE id = ?", [id])
  const [[updated]] = await db.query('SELECT * FROM turnos WHERE id = ?', [id])
  return rowToTurno(updated)
}

// Que debe abrir el frontend segun el resultado de la atencion (seccion 4.2 del plan).
function abrirFlujoPara(resultado) {
  if (resultado === 'venta_directa') return 'venta'
  if (resultado === 'cotizacion_generada') return 'cotizacion'
  return null
}

// ─── Atenciones (historico persistente) ──────────────────────────

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatFecha(date) {
  let h = date.getHours()
  const ap = h < 12 ? 'a.m.' : 'p.m.'
  h = h % 12 || 12
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(h)}:${pad(date.getMinutes())} ${ap}`
}

function formatDuracion(ms) {
  if (!ms || ms < 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

function rowToAtencion(r) {
  return {
    id: r.codigo,
    date: r.fecha,
    client: r.client || '',
    document: r.document || '',
    phone: r.phone || '',
    email: r.email || '',
    address: r.address || '',
    city: r.city || '',
    service: r.service || '',
    motive: r.motive || '',
    status: r.status || '',
    advisor: r.advisor || '',
    channel: r.channel || '',
    duration: r.duration || '',
    management: r.management || '',
    observations: r.observations || '',
    caso: r.caso || '',
    escalation: null,
    turnoNumero: r.turno_numero || null,
    modulo: r.modulo ?? null,
    prioritario: Boolean(r.prioritario),
    esperaMin: r.espera_min,
    // Columnas JSON: mysql2 ya las entrega deserializadas (objeto/array) o null.
    sisu: r.sisu_json || null,
    // Mercadeo (oportunidad comercial)
    interes: r.interes || [],
    consentimiento: Boolean(r.consentimiento),
    accionSeguimiento: r.accion_seguimiento || '',
    fechaSeguimiento: r.fecha_seguimiento || '',
    notaMercadeo: r.nota_mercadeo || '',
    // Extension Plataforma de Mercadeo
    resultado: r.resultado || '',
    interesServicio: r.interes_servicio || [],
    generaCotizacion: Boolean(r.genera_cotizacion),
    generaVenta: Boolean(r.genera_venta),
    idCotizacionVinculada: r.id_cotizacion_vinculada ?? null,
    idVentaVinculada: r.id_venta_vinculada ?? null,
    sede: r.sede || 'Riohacha',
    idAsesor: r.id_asesor ?? null,
  }
}

// Datos conocidos del cliente a partir de su ultima atencion registrada.
export async function buscarCliente(cedula) {
  const doc = onlyDigits(cedula)
  if (!doc) return null
  const [[prev]] = await db.query(
    "SELECT * FROM atenciones WHERE REPLACE(REPLACE(document, '.', ''), ' ', '') = ? ORDER BY id DESC LIMIT 1",
    [doc],
  )
  if (!prev) return null
  return {
    client: prev.client || '',
    phone: prev.phone || '',
    email: prev.email || '',
    address: prev.address || '',
    city: prev.city || '',
  }
}

// Ver historial de atenciones: Asesor Integral/Comercial solo las propias,
// Coordinador/Admin ven todas (matriz de permisos, seccion 2.2 del plan).
export async function listAtenciones(user) {
  const propias = user && !esSupervisor(user)
  const [rows] = await db.query(
    `SELECT * FROM atenciones ${propias ? 'WHERE id_asesor = ?' : ''} ORDER BY id DESC`,
    propias ? [user.id] : [],
  )
  return rows.map(rowToAtencion)
}

// Crea una atencion. Si viene `turnoId`, la liga al turno, calcula los tiempos
// reales (espera / atencion) y marca el turno como atendido.
//
// Si viene `resultado`, valida contra el catalogo 'resultado_atencion' y exige
// observaciones cuando el resultado es 'sin_resolucion'. Devuelve ademas
// `abrirFlujo` ('venta' | 'cotizacion' | null) para que el frontend encadene
// el formulario correspondiente (los flujos en si se conectan en Fase 2/3).
export async function crearAtencion(data = {}) {
  const now = Date.now()
  let turno = null
  if (data.turnoId) {
    const [[row]] = await db.query('SELECT * FROM turnos WHERE id = ?', [data.turnoId])
    turno = row || null
  }

  const esperaMin = turno?.called_at ? Math.round((turno.called_at - turno.created_at) / 60000) : null
  const atencionMs = turno?.called_at ? now - turno.called_at : null

  // Filtro legal (Habeas Data): si SISU indica que el afiliado o su empresa no
  // autorizan compartir datos a terceros, no se puede registrar consentimiento
  // de seguimiento de mercadeo, venga lo que venga del cliente.
  const sisuAutoriza =
    !data.sisu ||
    (Boolean(data.sisu.trabajador?.autorizaCompartir) &&
      (data.sisu.empresa ? Boolean(data.sisu.empresa.autorizaCompartir) : true))
  const consentimiento = Boolean(data.consentimiento) && sisuAutoriza

  // Resultado de la atencion (extension Plataforma de Mercadeo).
  let resultado = data.resultado ? String(data.resultado).trim() : ''
  if (resultado) {
    const valido = await catalogoTieneCodigo('resultado_atencion', resultado)
    if (!valido) throw Object.assign(new Error('Resultado de atencion no valido'), { status: 400 })
    if (RESULTADOS_CON_OBSERVACION_OBLIGATORIA.has(resultado) && !String(data.observations || '').trim()) {
      throw Object.assign(
        new Error('Las observaciones son obligatorias para este resultado'),
        { status: 400 },
      )
    }
  }
  const generaVenta = resultado === 'venta_directa' ? 1 : 0
  const generaCotizacion = resultado === 'cotizacion_generada' ? 1 : 0
  const interesServicio =
    Array.isArray(data.interesServicio) && data.interesServicio.length ? data.interesServicio : null

  const year = new Date(now).getFullYear()
  const [info] = await db.query(
    `INSERT INTO atenciones
      (codigo, fecha, created_at, document, client, phone, email, address, city,
       service, motive, status, advisor, channel, duration, management, observations, caso,
       turno_id, turno_numero, modulo, prioritario, espera_min, sisu_json,
       interes, consentimiento, accion_seguimiento, fecha_seguimiento, nota_mercadeo,
       resultado, interes_servicio, genera_cotizacion, genera_venta, sede, id_asesor)
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?, ?)`,
    [
      'PENDING',
      formatFecha(new Date(now)),
      now,
      data.document || (turno ? turno.cedula : ''),
      data.client || '',
      data.phone || '',
      data.email || '',
      data.address || '',
      data.city || '',
      data.service || turno?.servicio || '',
      data.motive || '',
      data.status || 'Cerrada',
      data.advisor || 'Asesor',
      data.channel || 'Presencial',
      formatDuracion(atencionMs),
      data.management || '',
      data.observations || '',
      data.caso || '',
      turno ? turno.id : null,
      turno ? turno.numero : null,
      turno ? turno.modulo : (data.modulo ?? null),
      turno ? turno.prioritario : 0,
      esperaMin,
      // Snapshot de SISU (solo el objeto valido { trabajador, empresa }).
      data.sisu && data.sisu.trabajador ? data.sisu : null,
      // Mercadeo
      Array.isArray(data.interes) && data.interes.length ? data.interes : null,
      consentimiento ? 1 : 0,
      data.accionSeguimiento || '',
      data.fechaSeguimiento || '',
      data.notaMercadeo || '',
      // Extension Plataforma de Mercadeo
      resultado || null,
      interesServicio,
      generaCotizacion,
      generaVenta,
      data.sede || 'Riohacha',
      data.idAsesor ?? null,
    ],
  )

  // El codigo legible se deriva del id autoincremental (unico).
  const codigo = `AT-${year}-${String(info.insertId).padStart(6, '0')}`
  await db.query('UPDATE atenciones SET codigo = ? WHERE id = ?', [codigo, info.insertId])

  if (turno) {
    await db.query("UPDATE turnos SET estado = 'atendido' WHERE id = ?", [turno.id])
  }

  const [[row]] = await db.query('SELECT * FROM atenciones WHERE id = ?', [info.insertId])
  const registrada = rowToAtencion(row)
  await auditar('atenciones', row.id, 'crear', data.idAsesor ?? null, null, registrada)

  return {
    ...registrada,
    dbId: row.id,
    abrirFlujo: abrirFlujoPara(resultado),
  }
}
