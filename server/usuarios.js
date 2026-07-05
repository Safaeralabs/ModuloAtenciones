import db from './db.js'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { auditar } from './auditoria.js'
import { catalogoTieneNombre } from './catalogo.js'

export const ROLES = ['asesor_integral', 'asesor_comercial', 'coordinador', 'admin']

function normalizarRol(rol) {
  return ROLES.includes(rol) ? rol : 'asesor_integral'
}

// La sede no es texto libre: debe existir en el catalogo 'sede' (parametrizable
// solo por el administrador, ver server/catalogo.js y /api/parametros/sede).
async function validarSede(sede) {
  const valor = String(sede || '').trim()
  if (!valor) return 'Riohacha'
  const valida = await catalogoTieneNombre('sede', valor)
  if (!valida) throw Object.assign(new Error('La sede indicada no existe en el catalogo de sedes'), { status: 400 })
  return valor
}

// Nunca exponemos el hash de la contrasena.
function safe(u) {
  if (!u) return null
  return {
    id: u.id,
    uuid: u.uuid,
    username: u.username,
    nombre: u.nombre,
    correo: u.correo || '',
    cedula: u.cedula || '',
    rol: u.rol,
    area: u.area || '',
    sede: u.sede || 'Riohacha',
    activo: Boolean(u.activo),
  }
}

export async function listUsuarios() {
  const [rows] = await db.query(
    'SELECT id, uuid, username, nombre, correo, cedula, rol, area, sede, activo FROM usuarios ORDER BY id',
  )
  return rows.map(safe)
}

export async function getUsuario(id) {
  const [[row]] = await db.query('SELECT * FROM usuarios WHERE id = ?', [id])
  return row || null
}

export async function crearUsuario({ username, nombre, password, rol, cedula, area, sede, correo }, actorId = null) {
  const u = String(username || '').trim()
  const n = String(nombre || '').trim()
  if (!u || !n || !password) {
    throw Object.assign(new Error('Usuario, nombre y contrasena son obligatorios'), { status: 400 })
  }
  const [[exists]] = await db.query('SELECT 1 FROM usuarios WHERE username = ?', [u])
  if (exists) throw Object.assign(new Error('Ese nombre de usuario ya existe'), { status: 409 })
  const sedeValida = await validarSede(sede)

  const [info] = await db.query(
    `INSERT INTO usuarios (uuid, username, nombre, correo, cedula, password_hash, rol, area, sede)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      u,
      n,
      correo ? String(correo).trim() : null,
      cedula ? String(cedula).trim() : null,
      bcrypt.hashSync(String(password), 10),
      normalizarRol(rol),
      area ? String(area).trim() : null,
      sedeValida,
    ],
  )
  const creado = safe(await getUsuario(info.insertId))
  await auditar('usuarios', info.insertId, 'crear', actorId ?? info.insertId, null, creado)
  return creado
}

export async function actualizarUsuario(id, { nombre, rol, activo, password, cedula, area, sede, correo }, actorId = null) {
  const u = await getUsuario(id)
  if (!u) return null
  const antes = safe(u)

  const nuevoNombre = nombre != null ? String(nombre).trim() : u.nombre
  const nuevoRol = rol ? normalizarRol(rol) : u.rol
  const nuevoActivo = activo == null ? u.activo : activo ? 1 : 0
  const nuevoCedula = cedula != null ? String(cedula).trim() : u.cedula
  const nuevoArea = area != null ? String(area).trim() : u.area
  const nuevoCorreo = correo != null ? String(correo).trim() || null : u.correo
  const nuevoSede = sede != null ? await validarSede(sede) : u.sede

  if (password) {
    await db.query(
      `UPDATE usuarios
       SET nombre = ?, correo = ?, rol = ?, activo = ?, cedula = ?, area = ?, sede = ?, password_hash = ?
       WHERE id = ?`,
      [nuevoNombre, nuevoCorreo, nuevoRol, nuevoActivo, nuevoCedula, nuevoArea, nuevoSede, bcrypt.hashSync(String(password), 10), id],
    )
  } else {
    await db.query(
      'UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, activo = ?, cedula = ?, area = ?, sede = ? WHERE id = ?',
      [nuevoNombre, nuevoCorreo, nuevoRol, nuevoActivo, nuevoCedula, nuevoArea, nuevoSede, id],
    )
  }
  const despues = safe(await getUsuario(id))
  await auditar('usuarios', id, 'editar', actorId ?? id, antes, despues)
  return despues
}

// Cuantos admins activos quedan (para no quedarnos sin administradores).
export async function adminsActivos() {
  const [[{ n }]] = await db.query("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin' AND activo = 1")
  return n
}

// Lista ligera de usuarios activos (sin datos sensibles) para poblar selects:
// asignar responsable de factura, filtrar por asesor en el BI del coordinador, etc.
export async function listUsuariosOpciones() {
  const [rows] = await db.query(
    "SELECT id, nombre, rol, sede FROM usuarios WHERE activo = 1 ORDER BY nombre",
  )
  return rows
}
