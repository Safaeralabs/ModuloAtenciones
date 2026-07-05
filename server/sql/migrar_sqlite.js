// Migra los datos del turnero.db (SQLite, version anterior a la Plataforma de
// Mercadeo) hacia la BD de Mercadeo en MySQL. Conserva los mismos IDs
// (autoincremental) para no romper las relaciones turno_id / turno_numero
// dentro de atenciones. Idempotente: usa INSERT IGNORE por PK explicita, asi
// que correrlo dos veces no duplica filas.
//
// Requisito previo: `npm run migrate` ya debe haber creado el esquema en MySQL.
//
// Uso: npm run migrate:sqlite
//      SQLITE_PATH=/ruta/a/turnero.db npm run migrate:sqlite   (ruta alterna)

import 'dotenv/config'
import Database from 'better-sqlite3'
import mysql from 'mysql2/promise'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { v4 as uuidv4 } from 'uuid'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SQLITE_PATH = process.env.SQLITE_PATH || join(__dirname, '..', 'data', 'turnero.db')

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'mercadeo',
  DB_PASSWORD = '',
  DB_NAME = 'mercadeo',
} = process.env

// Rol legado -> rol nuevo del Módulo de Mercadeo (seccion 5 del plan).
function migrarRol(rolViejo) {
  if (rolViejo === 'admin') return 'admin'
  return 'asesor_integral'
}

function parseJsonSafe(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function contar(conn, tabla) {
  const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM ${tabla}`)
  return n
}

async function migrarUsuarios(sqlite, conn) {
  const rows = sqlite.prepare('SELECT * FROM usuarios').all()
  for (const u of rows) {
    await conn.query(
      `INSERT IGNORE INTO usuarios (id, uuid, username, nombre, password_hash, rol, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u.id, uuidv4(), u.username, u.nombre, u.password_hash, migrarRol(u.rol), u.activo],
    )
  }
  return rows.length
}

async function migrarTurnos(sqlite, conn) {
  const rows = sqlite.prepare('SELECT * FROM turnos').all()
  for (const t of rows) {
    await conn.query(
      `INSERT IGNORE INTO turnos
        (id, fecha, numero, servicio, prefijo, cedula, prioritario, condicion, estado, modulo, created_at, called_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id, t.fecha, t.numero, t.servicio, t.prefijo, t.cedula,
        t.prioritario, t.condicion, t.estado, t.modulo, t.created_at, t.called_at,
      ],
    )
  }
  return rows.length
}

async function migrarAtenciones(sqlite, conn) {
  const rows = sqlite.prepare('SELECT * FROM atenciones').all()
  for (const a of rows) {
    await conn.query(
      `INSERT IGNORE INTO atenciones
        (id, codigo, fecha, created_at, document, client, phone, email, address, city,
         service, motive, status, advisor, channel, duration, management, observations, caso,
         turno_id, turno_numero, modulo, prioritario, espera_min, sisu_json,
         interes, consentimiento, accion_seguimiento, fecha_seguimiento, nota_mercadeo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        a.id, a.codigo, a.fecha, a.created_at, a.document, a.client, a.phone, a.email, a.address, a.city,
        a.service, a.motive, a.status, a.advisor, a.channel, a.duration, a.management, a.observations, a.caso,
        a.turno_id, a.turno_numero, a.modulo, a.prioritario, a.espera_min,
        parseJsonSafe(a.sisu_json), parseJsonSafe(a.interes),
        a.consentimiento, a.accion_seguimiento, a.fecha_seguimiento, a.nota_mercadeo,
      ],
    )
  }
  return rows.length
}

async function main() {
  if (!existsSync(SQLITE_PATH)) {
    console.log(`No se encontro ${SQLITE_PATH}. Nada que migrar (instalacion nueva).`)
    return
  }

  const sqlite = new Database(SQLITE_PATH, { readonly: true })
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  })

  console.log(`Migrando datos de ${SQLITE_PATH} -> MySQL (${DB_NAME}) ...`)

  // Orden importa: usuarios y turnos antes que atenciones (referencian ambos).
  const nUsuariosOrigen = await migrarUsuarios(sqlite, conn)
  const nTurnosOrigen = await migrarTurnos(sqlite, conn)
  const nAtencionesOrigen = await migrarAtenciones(sqlite, conn)

  const nUsuariosDestino = await contar(conn, 'usuarios')
  const nTurnosDestino = await contar(conn, 'turnos')
  const nAtencionesDestino = await contar(conn, 'atenciones')

  console.log('')
  console.log('Resumen de migracion (origen -> destino, destino puede ser mayor si ya habia datos):')
  console.log(`  usuarios:   ${nUsuariosOrigen} filas leidas, ${nUsuariosDestino} en destino`)
  console.log(`  turnos:     ${nTurnosOrigen} filas leidas, ${nTurnosDestino} en destino`)
  console.log(`  atenciones: ${nAtencionesOrigen} filas leidas, ${nAtencionesDestino} en destino`)

  sqlite.close()
  await conn.end()
}

main().catch((err) => {
  console.error('Error migrando datos:', err)
  process.exit(1)
})
