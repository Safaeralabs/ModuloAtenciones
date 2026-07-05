import db from './db.js'
import { auditar } from './auditoria.js'

// Tipos de catalogo generico parametrizables (seccion 8.2 del plan). La tabla
// `catalogos` es unica; `tipo` distingue cada lista logica.
export const TIPOS_CATALOGO = [
  'motivo_atencion',
  'resultado_atencion',
  'motivo_rechazo',
  'tipo_evento',
  'lugar_prestacion',
  'categoria_afiliado',
  'tipo_seguimiento',
  'canal_atencion',
  'estado_gestion_factura',
  'sede',
]

// Devuelve los items activos de un catalogo generico (tipo), ordenados.
// Usado por resultado_atencion, motivo_rechazo, estado_gestion_factura, etc.
export async function listCatalogoActivo(tipo) {
  const [rows] = await db.query(
    'SELECT codigo, nombre, orden FROM catalogos WHERE tipo = ? AND activo = 1 ORDER BY orden, nombre',
    [tipo],
  )
  return rows
}

// Todos los items (activos e inactivos) de un catalogo, para el gestor de
// Parametrizacion: el coordinador necesita ver y reactivar los desactivados.
export async function listCatalogoTodos(tipo) {
  const [rows] = await db.query(
    'SELECT id, codigo, nombre, orden, activo FROM catalogos WHERE tipo = ? ORDER BY orden, nombre',
    [tipo],
  )
  return rows.map((r) => ({ ...r, activo: Boolean(r.activo) }))
}

export async function catalogoTieneCodigo(tipo, codigo) {
  if (!codigo) return false
  const [[row]] = await db.query(
    'SELECT 1 FROM catalogos WHERE tipo = ? AND codigo = ? AND activo = 1',
    [tipo, codigo],
  )
  return Boolean(row)
}

// Igual que catalogoTieneCodigo pero por nombre. Usado por 'sede': a
// diferencia de otros catalogos, la sede se guarda por nombre en las tablas
// de negocio (ya existia como texto libre 'Riohacha' antes de parametrizarse).
export async function catalogoTieneNombre(tipo, nombre) {
  if (!nombre) return false
  const [[row]] = await db.query(
    'SELECT 1 FROM catalogos WHERE tipo = ? AND nombre = ? AND activo = 1',
    [tipo, nombre],
  )
  return Boolean(row)
}

export async function crearItemCatalogo(tipo, { codigo, nombre, orden }, actorId) {
  if (!TIPOS_CATALOGO.includes(tipo)) {
    throw Object.assign(new Error('Tipo de catalogo no valido'), { status: 400 })
  }
  const cod = String(codigo || '').trim()
  const nom = String(nombre || '').trim()
  if (!cod || !nom) {
    throw Object.assign(new Error('Codigo y nombre son obligatorios'), { status: 400 })
  }
  const [[existe]] = await db.query('SELECT 1 FROM catalogos WHERE tipo = ? AND codigo = ?', [tipo, cod])
  if (existe) throw Object.assign(new Error('Ya existe un item con ese codigo en este catalogo'), { status: 409 })

  const [info] = await db.query(
    'INSERT INTO catalogos (tipo, codigo, nombre, orden) VALUES (?, ?, ?, ?)',
    [tipo, cod, nom, Number(orden) || 0],
  )
  const creado = { id: info.insertId, tipo, codigo: cod, nombre: nom, orden: Number(orden) || 0, activo: true }
  await auditar('catalogos', info.insertId, 'crear', actorId, null, creado)
  return creado
}

// Nunca elimina: solo edita nombre/orden o activa/desactiva (seccion 8.2 del
// plan: preserva el historico de registros que ya usaron el item).
export async function actualizarItemCatalogo(id, { nombre, orden, activo }, actorId) {
  const [[antes]] = await db.query('SELECT * FROM catalogos WHERE id = ?', [id])
  if (!antes) return null

  const nuevoNombre = nombre != null ? String(nombre).trim() : antes.nombre
  const nuevoOrden = orden != null ? Number(orden) : antes.orden
  const nuevoActivo = activo == null ? antes.activo : activo ? 1 : 0

  await db.query('UPDATE catalogos SET nombre = ?, orden = ?, activo = ? WHERE id = ?', [
    nuevoNombre, nuevoOrden, nuevoActivo, id,
  ])
  const [[despues]] = await db.query('SELECT * FROM catalogos WHERE id = ?', [id])
  await auditar('catalogos', id, 'editar', actorId, antes, despues)
  return { ...despues, activo: Boolean(despues.activo) }
}

// ─── Servicios y actividades (catalogo comercial de Ventas/Cotizaciones) ───

// Servicios con sus actividades anidadas. Por defecto solo activos (uso en
// selects de formularios); Parametrizacion pide `soloActivos=false` para ver
// y reactivar los desactivados.
export async function listServiciosConActividades(soloActivos = true) {
  const filtro = soloActivos ? 'WHERE activo = 1' : ''
  const [servicios] = await db.query(`SELECT id, codigo, nombre, activo FROM servicios ${filtro} ORDER BY nombre`)
  const [actividades] = await db.query(`SELECT id, id_servicio, codigo, nombre, activo FROM actividades ${filtro} ORDER BY nombre`)
  return servicios.map((s) => ({
    ...s,
    activo: Boolean(s.activo),
    actividades: actividades
      .filter((a) => a.id_servicio === s.id)
      .map(({ id_servicio, ...a }) => ({ ...a, activo: Boolean(a.activo) })),
  }))
}

// True si `actividadCodigo` pertenece al servicio `servicioCodigo` (valida el
// par antes de guardar una venta/cotizacion).
export async function actividadPerteneceAServicio(servicioCodigo, actividadCodigo) {
  const [[row]] = await db.query(
    `SELECT 1 FROM actividades a
     JOIN servicios s ON s.id = a.id_servicio
     WHERE s.codigo = ? AND a.codigo = ? AND a.activo = 1 AND s.activo = 1`,
    [servicioCodigo, actividadCodigo],
  )
  return Boolean(row)
}

export async function crearServicio({ codigo, nombre }, actorId) {
  const cod = String(codigo || '').trim()
  const nom = String(nombre || '').trim()
  if (!cod || !nom) throw Object.assign(new Error('Codigo y nombre son obligatorios'), { status: 400 })
  const [[existe]] = await db.query('SELECT 1 FROM servicios WHERE codigo = ?', [cod])
  if (existe) throw Object.assign(new Error('Ya existe un servicio con ese codigo'), { status: 409 })

  const [info] = await db.query('INSERT INTO servicios (codigo, nombre) VALUES (?, ?)', [cod, nom])
  const creado = { id: info.insertId, codigo: cod, nombre: nom, activo: true, actividades: [] }
  await auditar('servicios', info.insertId, 'crear', actorId, null, creado)
  return creado
}

export async function actualizarServicio(id, { nombre, activo }, actorId) {
  const [[antes]] = await db.query('SELECT * FROM servicios WHERE id = ?', [id])
  if (!antes) return null
  const nuevoNombre = nombre != null ? String(nombre).trim() : antes.nombre
  const nuevoActivo = activo == null ? antes.activo : activo ? 1 : 0

  await db.query('UPDATE servicios SET nombre = ?, activo = ? WHERE id = ?', [nuevoNombre, nuevoActivo, id])
  const [[despues]] = await db.query('SELECT * FROM servicios WHERE id = ?', [id])
  await auditar('servicios', id, 'editar', actorId, antes, despues)
  return { ...despues, activo: Boolean(despues.activo) }
}

export async function crearActividad({ idServicio, codigo, nombre }, actorId) {
  const cod = String(codigo || '').trim()
  const nom = String(nombre || '').trim()
  if (!idServicio || !cod || !nom) {
    throw Object.assign(new Error('Servicio, codigo y nombre son obligatorios'), { status: 400 })
  }
  const [[servicio]] = await db.query('SELECT 1 FROM servicios WHERE id = ?', [idServicio])
  if (!servicio) throw Object.assign(new Error('El servicio indicado no existe'), { status: 400 })
  const [[existe]] = await db.query('SELECT 1 FROM actividades WHERE codigo = ?', [cod])
  if (existe) throw Object.assign(new Error('Ya existe una actividad con ese codigo'), { status: 409 })

  const [info] = await db.query('INSERT INTO actividades (id_servicio, codigo, nombre) VALUES (?, ?, ?)', [
    idServicio, cod, nom,
  ])
  const creada = { id: info.insertId, idServicio, codigo: cod, nombre: nom, activo: true }
  await auditar('actividades', info.insertId, 'crear', actorId, null, creada)
  return creada
}

export async function actualizarActividad(id, { nombre, activo }, actorId) {
  const [[antes]] = await db.query('SELECT * FROM actividades WHERE id = ?', [id])
  if (!antes) return null
  const nuevoNombre = nombre != null ? String(nombre).trim() : antes.nombre
  const nuevoActivo = activo == null ? antes.activo : activo ? 1 : 0

  await db.query('UPDATE actividades SET nombre = ?, activo = ? WHERE id = ?', [nuevoNombre, nuevoActivo, id])
  const [[despues]] = await db.query('SELECT * FROM actividades WHERE id = ?', [id])
  await auditar('actividades', id, 'editar', actorId, antes, despues)
  return { ...despues, activo: Boolean(despues.activo) }
}
