// Importa el historico de ventas desde el Excel "Analisis de Ventas" (el que
// este modulo reemplaza, seccion 5.1 y Fase 2 / F2-5 del plan) hacia la tabla
// `ventas` de MySQL. Valida fila a fila: las filas invalidas se reportan al
// final y NO abortan el resto del archivo.
//
// IMPORTANTE: el mapeo de columnas de abajo (COLUMNAS) es una plantilla basada
// en los campos que describe el plan. Ajusta los nombres de encabezado al
// Excel real de Comfaguajira cuando lo entreguen (son los que aparecen tal
// cual en la primera fila de la hoja).
//
// Uso:
//   EXCEL_PATH=/ruta/al/Analisis-de-Ventas.xlsx npm run import:ventas
//   EXCEL_PATH=... EXCEL_SHEET="Ventas 2025" npm run import:ventas   (hoja opcional)

import 'dotenv/config'
import ExcelJS from 'exceljs'
import mysql from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

const EXCEL_PATH = process.env.EXCEL_PATH
const EXCEL_SHEET = process.env.EXCEL_SHEET || null

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'mercadeo',
  DB_PASSWORD = '',
  DB_NAME = 'mercadeo',
} = process.env

// Encabezado esperado (fila 1 del Excel) -> campo interno. Ajustar aqui si el
// archivo real usa otros nombres de columna.
const COLUMNAS = {
  'Cedula': 'cedula',
  'Nombre': 'nombre',
  'Telefono': 'telefono',
  'Correo': 'correo',
  'Servicio': 'servicio',
  'Actividad': 'actividad',
  'Categoria': 'categoria',
  'Lugar de prestacion': 'lugar',
  'Fecha servicio': 'fechaServicio',
  'Valor unitario': 'valorUnitario',
  'Cantidad': 'cantidad',
  'Numero factura': 'numeroFactura',
  'Numero aprobado': 'numeroAprobado',
  'Tipo de pago': 'tipoPago',
  'Vendedor': 'vendedor',
  'Observacion': 'observacion',
}

const CATEGORIAS_VALIDAS = new Set(['A', 'B', 'C', 'D'])

function normalizarTexto(v) {
  return String(v ?? '').trim()
}

function normalizarTipoPago(v) {
  const t = normalizarTexto(v).toLowerCase()
  if (t.startsWith('cont')) return 'contado'
  if (t.startsWith('cred') || t.startsWith('créd')) return 'credito'
  return null
}

// Excel puede traer fechas como objeto Date, numero serial o texto.
function normalizarFecha(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const texto = normalizarTexto(v)
  if (!texto) return null
  const d = new Date(texto)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

async function cargarCatalogos(conn) {
  const [servicios] = await conn.query('SELECT id, codigo, nombre FROM servicios WHERE activo = 1')
  const [actividades] = await conn.query('SELECT id, id_servicio, codigo, nombre FROM actividades WHERE activo = 1')
  const [usuarios] = await conn.query('SELECT id, nombre FROM usuarios WHERE activo = 1')

  const porNombre = (arr) => new Map(arr.map((x) => [x.nombre.trim().toLowerCase(), x]))
  return {
    serviciosPorNombre: porNombre(servicios),
    actividadesPorNombre: porNombre(actividades),
    usuariosPorNombre: porNombre(usuarios),
  }
}

function leerFila(row, worksheet) {
  const encabezados = worksheet.getRow(1).values // array 1-indexado
  const registro = {}
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const encabezado = normalizarTexto(encabezados[colNumber])
    const campo = COLUMNAS[encabezado]
    if (campo) registro[campo] = cell.value
  })
  return registro
}

async function main() {
  if (!EXCEL_PATH) {
    console.error('Falta EXCEL_PATH. Uso: EXCEL_PATH=/ruta/archivo.xlsx npm run import:ventas')
    process.exit(1)
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(EXCEL_PATH)
  const worksheet = EXCEL_SHEET ? workbook.getWorksheet(EXCEL_SHEET) : workbook.worksheets[0]
  if (!worksheet) {
    console.error(`No se encontro la hoja${EXCEL_SHEET ? ` "${EXCEL_SHEET}"` : ''} en ${EXCEL_PATH}`)
    process.exit(1)
  }

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  })
  const { serviciosPorNombre, actividadesPorNombre, usuariosPorNombre } = await cargarCatalogos(conn)

  const rechazadas = []
  let importadas = 0

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i)
    if (row.cellCount === 0 || row.values.every((v) => v == null || v === '')) continue

    const r = leerFila(row, worksheet)
    const motivos = []

    const cedula = normalizarTexto(r.cedula)
    const nombre = normalizarTexto(r.nombre)
    const servicio = serviciosPorNombre.get(normalizarTexto(r.servicio).toLowerCase())
    const actividad = actividadesPorNombre.get(normalizarTexto(r.actividad).toLowerCase())
    const categoria = normalizarTexto(r.categoria).toUpperCase()
    const lugar = normalizarTexto(r.lugar)
    const fechaServicio = normalizarFecha(r.fechaServicio)
    const valorUnitario = Number(r.valorUnitario)
    const cantidad = Number(r.cantidad)
    const tipoPago = normalizarTipoPago(r.tipoPago)
    const vendedor = usuariosPorNombre.get(normalizarTexto(r.vendedor).toLowerCase())

    if (!cedula) motivos.push('cedula vacia')
    if (!nombre) motivos.push('nombre vacio')
    if (!servicio) motivos.push(`servicio "${r.servicio}" no existe en el catalogo`)
    if (!actividad) motivos.push(`actividad "${r.actividad}" no existe en el catalogo`)
    if (actividad && servicio && actividad.id_servicio !== servicio.id) motivos.push('la actividad no pertenece al servicio')
    if (!CATEGORIAS_VALIDAS.has(categoria)) motivos.push(`categoria "${r.categoria}" invalida (debe ser A, B, C o D)`)
    if (!lugar) motivos.push('lugar de prestacion vacio')
    if (!fechaServicio) motivos.push(`fecha de servicio invalida ("${r.fechaServicio}")`)
    if (!(valorUnitario > 0)) motivos.push('valor unitario invalido')
    if (!(cantidad >= 1)) motivos.push('cantidad invalida')
    if (!tipoPago) motivos.push(`tipo de pago "${r.tipoPago}" invalido (contado/credito)`)
    if (!vendedor) motivos.push(`vendedor "${r.vendedor}" no coincide con ningun usuario activo`)

    if (motivos.length) {
      rechazadas.push({ fila: i, motivos })
      continue
    }

    await conn.query(
      `INSERT INTO ventas
        (uuid, cedula_cliente, nombre_cliente, telefono, correo, servicio, actividad, categoria,
         lugar_prestacion, fecha_servicio, valor_unitario, cantidad, valor_total, numero_factura,
         numero_aprobado, tipo_pago, id_vendedor, observacion, sede, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Riohacha', 'activa')`,
      [
        uuidv4(), cedula, nombre, normalizarTexto(r.telefono) || null, normalizarTexto(r.correo) || null,
        servicio.codigo, actividad.codigo, categoria, lugar, fechaServicio, valorUnitario, cantidad,
        valorUnitario * cantidad, normalizarTexto(r.numeroFactura) || null, normalizarTexto(r.numeroAprobado) || null,
        tipoPago, vendedor.id, normalizarTexto(r.observacion) || null,
      ],
    )
    importadas++
  }

  await conn.end()

  console.log(`Importadas: ${importadas}`)
  console.log(`Rechazadas: ${rechazadas.length}`)
  if (rechazadas.length) {
    console.log('\nDetalle de filas rechazadas:')
    for (const { fila, motivos } of rechazadas) {
      console.log(`  Fila ${fila}: ${motivos.join('; ')}`)
    }
  }
}

main().catch((err) => {
  console.error('Error importando ventas:', err)
  process.exit(1)
})
