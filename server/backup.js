// Respaldo automatico de la BD de Mercadeo (RNF Backup, seccion 12 del documento
// de arquitectura). Ejecuta `mysqldump` y guarda un .sql.gz por dia.
//
// El plan pide que la copia quede en una ubicacion DISTINTA al servidor principal:
// configura BACKUP_DIR con una ruta en otro disco/recurso de red montado.
//
// Variables de entorno (todas opcionales; heredan la config de la BD):
//   BACKUP_DIR              carpeta destino (por defecto <proyecto>/backups)
//   BACKUP_RETENTION_DAYS   dias de retencion; borra copias mas viejas (def. 14)
//   MYSQLDUMP_PATH          ruta al binario mysqldump (por defecto 'mysqldump' del PATH)
//
// Uso: automatico cada dia via server/cron.js, o manual con `npm run backup`.

import { spawn } from 'node:child_process'
import { createGzip } from 'node:zlib'
import { createWriteStream } from 'node:fs'
import { mkdir, readdir, stat, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function config() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'mercadeo',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mercadeo',
    // Por defecto <proyecto>/backups; en produccion apunta a otro disco/servidor.
    dir: process.env.BACKUP_DIR || join(__dirname, '..', 'backups'),
    retentionDays: Number(process.env.BACKUP_RETENTION_DAYS || 14),
    mysqldump: process.env.MYSQLDUMP_PATH || 'mysqldump',
  }
}

// Marca de tiempo local apta para nombre de archivo: 2026-07-05_0200.
function sello() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}

// Borra copias .sql.gz mas antiguas que retentionDays.
async function limpiarAntiguas(dir, retentionDays) {
  if (!(retentionDays > 0)) return 0
  const limite = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  let borradas = 0
  const archivos = await readdir(dir)
  for (const nombre of archivos) {
    if (!nombre.startsWith('mercadeo-') || !nombre.endsWith('.sql.gz')) continue
    const ruta = join(dir, nombre)
    const info = await stat(ruta)
    if (info.mtimeMs < limite) {
      await unlink(ruta)
      borradas++
    }
  }
  return borradas
}

export async function respaldarBaseDatos() {
  const cfg = config()
  await mkdir(cfg.dir, { recursive: true })
  const destino = join(cfg.dir, `mercadeo-${sello()}.sql.gz`)

  const args = [
    `--host=${cfg.host}`,
    `--port=${cfg.port}`,
    `--user=${cfg.user}`,
    '--single-transaction', // dump consistente sin bloquear las tablas InnoDB
    '--routines',
    '--events',
    '--default-character-set=utf8mb4',
    cfg.database,
  ]

  await new Promise((resolve, reject) => {
    // La contrasena se pasa por MYSQL_PWD (no en argv) para que no aparezca en la
    // lista de procesos del sistema.
    const dump = spawn(cfg.mysqldump, args, {
      env: { ...process.env, MYSQL_PWD: cfg.password },
    })
    const gzip = createGzip()
    const salida = createWriteStream(destino)
    let stderr = ''

    dump.on('error', (err) =>
      reject(new Error(`No se pudo ejecutar mysqldump ("${cfg.mysqldump}"): ${err.message}. Ajusta MYSQLDUMP_PATH.`)),
    )
    dump.stderr.on('data', (d) => (stderr += d.toString()))
    dump.on('close', (code) => {
      if (code !== 0) reject(new Error(`mysqldump termino con codigo ${code}: ${stderr.trim()}`))
    })
    salida.on('error', reject)
    salida.on('finish', resolve)

    dump.stdout.pipe(gzip).pipe(salida)
  })

  const borradas = await limpiarAntiguas(cfg.dir, cfg.retentionDays)
  return { destino, borradas }
}

// Ejecucion directa: `node backup.js` (o `npm run backup`). pathToFileURL
// normaliza la ruta de forma portable (Windows usa file:///C:/...).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await import('dotenv/config')
  try {
    const { destino, borradas } = await respaldarBaseDatos()
    console.log(`Respaldo creado: ${destino}` + (borradas ? ` (${borradas} copias antiguas eliminadas)` : ''))
    process.exit(0)
  } catch (err) {
    console.error('Fallo el respaldo:', err.message)
    process.exit(1)
  }
}
