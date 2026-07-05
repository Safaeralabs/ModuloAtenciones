import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-este-secreto-en-produccion'
// RNF Seguridad (seccion 12 del documento): la sesion expira a los 30 min de
// INACTIVIDAD. Se implementa como ventana deslizante: el token dura 30 min, pero
// cada peticion autenticada emite uno nuevo (ver renovarToken + requireAuth), de
// modo que la sesion solo caduca tras 30 min sin actividad. Configurable con JWT_TTL.
const TOKEN_TTL = process.env.JWT_TTL || '30m'

// Reglas del JWT que no forman parte de los datos del usuario (las agrega/quita
// la libreria al firmar); se descartan antes de re-firmar en la renovacion.
const CLAIMS_RESERVADAS = ['iat', 'exp', 'nbf', 'aud', 'iss', 'sub', 'jti']

// Firma un token nuevo con el mismo payload de usuario y un TTL fresco. Base de
// la ventana deslizante de inactividad.
function firmarToken(payload) {
  const limpio = { ...payload }
  for (const c of CLAIMS_RESERVADAS) delete limpio[c]
  return jwt.sign(limpio, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

export async function login(username, password) {
  const [[user]] = await db.query('SELECT * FROM usuarios WHERE username = ? AND activo = 1', [
    String(username || '').trim(),
  ])
  if (!user) return null
  if (!bcrypt.compareSync(String(password || ''), user.password_hash)) return null

  const payload = {
    id: user.id,
    username: user.username,
    nombre: user.nombre,
    rol: user.rol,
    sede: user.sede,
  }
  const token = firmarToken(payload)
  return { token, user: payload }
}

// Middleware: exige un JWT valido en Authorization: Bearer <token>.
// Cada peticion autenticada renueva el token (ventana deslizante de 30 min de
// inactividad) devolviendolo en el header X-Refreshed-Token. El cliente guarda
// ese token nuevo, de modo que la sesion solo caduca tras 30 min sin peticiones.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'No autenticado' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    res.setHeader('X-Refreshed-Token', firmarToken(req.user))
    next()
  } catch {
    res.status(401).json({ error: 'Sesion invalida o expirada' })
  }
}

// Middleware: exige alguno de los roles indicados (usar despues de requireAuth).
// requireRole('coordinador', 'admin') acepta cualquiera de los dos.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta accion' })
    }
    next()
  }
}

// True si el rol del usuario ve/gestiona todos los registros del modulo
// (coordinador/admin), no solo los propios.
export function esSupervisor(user) {
  return user?.rol === 'coordinador' || user?.rol === 'admin'
}
