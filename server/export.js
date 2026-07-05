import ExcelJS from 'exceljs'
import { listVentas } from './ventas.js'
import { listCotizaciones } from './cotizaciones.js'
import { listFacturas } from './facturaciones.js'
import { listAtenciones } from './store.js'
import { biCoordinador } from './bi.js'

// Exportacion a Excel (seccion 9.2 y F4-3 del plan): cada vista de reportes
// puede descargarse en .xlsx con los mismos filtros aplicados en pantalla.
// Reutiliza las mismas funciones de listado que usa la API (mismo scope por
// rol: un asesor solo exporta lo que puede ver).

function agregarHoja(workbook, nombre, columnas, filas) {
  const hoja = workbook.addWorksheet(nombre.slice(0, 31)) // limite de Excel para nombres de hoja
  hoja.columns = columnas
  hoja.addRows(filas)
  hoja.getRow(1).font = { bold: true }
  return hoja
}

async function exportarVentas(filtros, user) {
  const ventas = await listVentas(user, filtros)
  const workbook = new ExcelJS.Workbook()
  agregarHoja(
    workbook,
    'Ventas',
    [
      { header: 'Fecha servicio', key: 'fechaServicio', width: 14 },
      { header: 'Cliente', key: 'nombreCliente', width: 26 },
      { header: 'Cedula', key: 'cedulaCliente', width: 14 },
      { header: 'Servicio', key: 'servicio', width: 16 },
      { header: 'Actividad', key: 'actividad', width: 18 },
      { header: 'Valor unitario', key: 'valorUnitario', width: 14 },
      { header: 'Cantidad', key: 'cantidad', width: 10 },
      { header: 'Valor total', key: 'valorTotal', width: 14 },
      { header: 'Tipo de pago', key: 'tipoPago', width: 12 },
      { header: 'Vendedor', key: 'vendedorNombre', width: 22 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Fecha de registro', key: 'fechaRegistro', width: 20 },
    ],
    ventas,
  )
  return workbook
}

async function exportarCotizaciones(filtros, user) {
  const cotizaciones = await listCotizaciones(user, filtros)
  const workbook = new ExcelJS.Workbook()
  agregarHoja(
    workbook,
    'Cotizaciones',
    [
      { header: 'Fecha cotizacion', key: 'fechaCotizacion', width: 14 },
      { header: 'Cliente', key: 'nombreCliente', width: 26 },
      { header: 'Cedula', key: 'cedulaCliente', width: 14 },
      { header: 'Servicio', key: 'servicio', width: 16 },
      { header: 'Actividad', key: 'actividad', width: 18 },
      { header: 'Valor total', key: 'valorTotal', width: 14 },
      { header: 'Fecha limite', key: 'fechaLimiteConfirmacion', width: 14 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Motivo rechazo', key: 'motivoRechazo', width: 20 },
      { header: 'Asesor', key: 'asesorNombre', width: 22 },
    ],
    cotizaciones,
  )
  return workbook
}

async function exportarFacturas(filtros, user) {
  const facturas = await listFacturas(user, filtros)
  const workbook = new ExcelJS.Workbook()
  agregarHoja(
    workbook,
    'Facturas',
    [
      { header: 'Numero de factura', key: 'numeroFactura', width: 18 },
      { header: 'Cedula cliente', key: 'cedulaCliente', width: 14 },
      { header: 'Valor', key: 'valorFactura', width: 14 },
      { header: 'Registrada por', key: 'registradorNombre', width: 22 },
      { header: 'Responsable', key: 'responsableNombre', width: 22 },
      { header: 'Estado de gestion', key: 'estadoGestion', width: 16 },
      { header: 'Fecha asignacion', key: 'fechaAsignacion', width: 18 },
    ],
    facturas,
  )
  return workbook
}

async function exportarAtenciones(_filtros, user) {
  const atenciones = await listAtenciones(user)
  const workbook = new ExcelJS.Workbook()
  agregarHoja(
    workbook,
    'Atenciones',
    [
      { header: 'Codigo', key: 'id', width: 16 },
      { header: 'Fecha', key: 'date', width: 20 },
      { header: 'Cliente', key: 'client', width: 26 },
      { header: 'Cedula', key: 'document', width: 14 },
      { header: 'Servicio', key: 'service', width: 16 },
      { header: 'Motivo', key: 'motive', width: 20 },
      { header: 'Resultado', key: 'resultado', width: 20 },
      { header: 'Asesor', key: 'advisor', width: 22 },
      { header: 'Estado', key: 'status', width: 12 },
    ],
    atenciones,
  )
  return workbook
}

async function exportarBiCoordinador(filtros) {
  const bi = await biCoordinador(filtros)
  const workbook = new ExcelJS.Workbook()
  agregarHoja(workbook, 'Ranking asesores', [
    { header: 'Asesor', key: 'asesor', width: 24 },
    { header: 'Total atenciones', key: 'total', width: 16 },
  ], bi.rankingAtenciones)
  agregarHoja(workbook, 'Pipeline cotizaciones', [
    { header: 'Estado', key: 'estado', width: 16 },
    { header: 'Cantidad', key: 'total', width: 12 },
    { header: 'Valor', key: 'valor', width: 16 },
  ], bi.pipelineCotizaciones)
  agregarHoja(workbook, 'Conversion por asesor', [
    { header: 'Asesor', key: 'asesor', width: 24 },
    { header: 'Elaboradas', key: 'totalElaboradas', width: 14 },
    { header: 'Convertidas', key: 'totalConvertidas', width: 14 },
    { header: 'Tasa', key: 'tasa', width: 10 },
  ], bi.conversionPorAsesor)
  agregarHoja(workbook, 'Ventas por servicio', [
    { header: 'Servicio', key: 'servicio', width: 16 },
    { header: 'Actividad', key: 'actividad', width: 20 },
    { header: 'Total', key: 'total', width: 16 },
  ], bi.ventasPorServicioActividad)
  agregarHoja(workbook, 'Ticket promedio', [
    { header: 'Asesor', key: 'asesor', width: 24 },
    { header: 'Servicio', key: 'servicio', width: 16 },
    { header: 'Promedio', key: 'promedio', width: 14 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
  ], bi.ticketPromedio)
  agregarHoja(workbook, 'Rechazos por motivo', [
    { header: 'Motivo', key: 'motivo', width: 24 },
    { header: 'Cantidad', key: 'total', width: 12 },
    { header: 'Valor perdido', key: 'valorPerdido', width: 16 },
  ], bi.rechazosPorMotivo)
  agregarHoja(workbook, 'Vencidas sin gestion', [
    { header: 'Cliente', key: 'nombreCliente', width: 26 },
    { header: 'Valor', key: 'valorTotal', width: 14 },
    { header: 'Fecha limite', key: 'fechaLimiteConfirmacion', width: 14 },
    { header: 'Asesor', key: 'asesor', width: 22 },
  ], bi.vencidasSinGestion)
  return workbook
}

const EXPORTADORES = {
  ventas: exportarVentas,
  cotizaciones: exportarCotizaciones,
  facturas: exportarFacturas,
  atenciones: exportarAtenciones,
  'bi-coordinador': exportarBiCoordinador,
}

// "Exportar a Excel" es una funcionalidad exclusiva de Coordinador/Admin
// (matriz de permisos, seccion 2.2 del plan): ningun asesor puede exportar,
// ni siquiera sus propios registros.
export function vistaExisteYPermitida(vista, user) {
  if (!EXPORTADORES[vista]) return false
  return user.rol === 'coordinador' || user.rol === 'admin'
}

export async function exportarVista(vista, filtros, user) {
  return EXPORTADORES[vista](filtros, user)
}
