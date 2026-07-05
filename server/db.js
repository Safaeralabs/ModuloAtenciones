import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Pool de conexiones a la BD de Mercadeo (MySQL 8+). Requisito fijo de la
// Módulo de Mercadeo (ver docs/PLAN-IMPLEMENTACION-PLATAFORMA-MERCADEO.md).
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'mercadeo',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mercadeo',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  timezone: 'Z',
})

// Siembra de usuarios iniciales (solo si la tabla esta vacia). El esquema y
// los catalogos ya deben existir: correr antes `npm run migrate`.
async function seedUsuarios() {
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM usuarios')
  if (n > 0) return

  const adminUser = process.env.ADMIN_USER || 'admin'
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123'

  const seed = [
    [adminUser, 'Administrador', adminPass, 'admin'],
    ['mfernanda', 'Maria Fernanda', 'asesor123', 'asesor_integral'],
    ['cruiz', 'Carlos Ruiz', 'asesor123', 'asesor_integral'],
  ]
  for (const [username, nombre, pass, rol] of seed) {
    await pool.query(
      'INSERT INTO usuarios (uuid, username, nombre, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), username, nombre, bcrypt.hashSync(pass, 10), rol],
    )
  }
  console.log(`Usuarios sembrados. Admin: "${adminUser}" / "${adminPass}" (cambialo en produccion).`)
}

// Se llama una vez al arrancar el servidor (index.js), antes de app.listen.
export async function initDb() {
  try {
    await pool.query('SELECT 1')
  } catch (err) {
    console.error(
      'No se pudo conectar a MySQL. Verifica DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME ' +
        'y que las migraciones se hayan aplicado (npm run migrate).',
    )
    throw err
  }
  await seedUsuarios()
}

export default pool
