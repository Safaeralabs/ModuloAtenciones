// Runner de migraciones SQL para la BD de Mercadeo (MySQL).
// Ejecuta en orden alfabetico los archivos server/sql/NNN_*.sql que aun no
// esten registrados en la tabla _migraciones. Idempotente: correrlo de nuevo
// no repite migraciones ya aplicadas.
//
// Uso: npm run migrate   (dentro de server/)

import 'dotenv/config'
import mysql from 'mysql2/promise'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SQL_DIR = join(__dirname, 'sql')

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'mercadeo',
  DB_PASSWORD = '',
  DB_NAME = 'mercadeo',
} = process.env

async function ensureDatabase() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  })
  // En entornos gestionados (Railway, docker-compose) la BD ya viene creada y el
  // usuario suele no tener privilegio global de CREATE DATABASE. Si falla por eso
  // pero la BD existe, seguimos: la conexion a DB_NAME de migrate() lo confirmara.
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci`,
    )
  } catch (err) {
    console.warn(`No se pudo asegurar la BD "${DB_NAME}" (${err.code || err.message}); se asume que ya existe.`)
  }
  await conn.end()
}

async function migrate() {
  await ensureDatabase()

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  })

  const archivos = readdirSync(SQL_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const archivo of archivos) {
    const [rows] = await conn
      .query('SELECT 1 FROM _migraciones WHERE archivo = ?', [archivo])
      .catch(() => [[]]) // primera corrida: _migraciones aun no existe

    if (rows.length) {
      console.log(`= ${archivo} (ya aplicada)`)
      continue
    }

    const sql = readFileSync(join(SQL_DIR, archivo), 'utf-8')
    console.log(`> Aplicando ${archivo} ...`)
    await conn.query(sql)
    await conn.query(
      'INSERT INTO _migraciones (archivo) VALUES (?) ON DUPLICATE KEY UPDATE archivo = archivo',
      [archivo],
    )
    console.log(`  OK`)
  }

  await conn.end()
  console.log('Migraciones al dia.')
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error ejecutando migraciones:', err)
    process.exit(1)
  })
