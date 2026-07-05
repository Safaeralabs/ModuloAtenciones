import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDb } from './db.js'
import { iniciarTareasProgramadas } from './cron.js'
import {
  snapshot,
  createTurno,
  llamarSiguiente,
  rellamarTurno,
  atenderTurno,
  marcarAusente,
  listServices,
  crearAtencion,
  listAtenciones,
} from './store.js'
import { consultarCliente } from './clientes.js'
import { login, requireAuth, requireRole, esSupervisor } from './auth.js'
import { listUsuarios, crearUsuario, actualizarUsuario, getUsuario, adminsActivos, listUsuariosOpciones } from './usuarios.js'
import {
  listServiciosConActividades,
  listCatalogoActivo,
  listCatalogoTodos,
  crearItemCatalogo,
  actualizarItemCatalogo,
  crearServicio,
  actualizarServicio,
  crearActividad,
  actualizarActividad,
  TIPOS_CATALOGO,
} from './catalogo.js'
import { listAuditoria } from './auditoria.js'
import { listVentas, getVenta, crearVenta, actualizarVenta, anularVenta } from './ventas.js'
import { biAsesor, biCoordinador } from './bi.js'
import { vistaExisteYPermitida, exportarVista } from './export.js'
import {
  listCotizaciones,
  getCotizacion,
  crearCotizacion,
  actualizarCotizacion,
  cambiarEstadoCotizacion,
  prefillConversion,
  alertasVencimiento,
} from './cotizaciones.js'
import { listNotificaciones, marcarLeida } from './notificaciones.js'
import {
  listFacturas,
  getFactura,
  crearFactura,
  asignarResponsable,
  actualizarFactura,
  anularFactura,
} from './facturaciones.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 4000
const isProd = process.env.NODE_ENV === 'production'

app.set('trust proxy', 1)

// Seguridad. En prod servimos el SPA desde el mismo origen, asi que no
// necesitamos CSP estricta para esto; desactivamos la CSP por defecto de helmet
// para no romper los estilos/inline del build.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))
// exposedHeaders: el navegador solo deja leer por JS los headers de respuesta
// que se declaren aqui; X-Refreshed-Token es el que renueva la sesion deslizante.
app.use(cors({ origin: process.env.CORS_ORIGIN || true, exposedHeaders: ['X-Refreshed-Token'] }))
app.use(express.json({ limit: '256kb' }))

// Limita el abuso en login y en la creacion de turnos (kiosko publico).
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 })
const turnoLimiter = rateLimit({ windowMs: 60 * 1000, max: 40 })

// Envuelve un handler async para que sus rechazos lleguen al error handler de Express.
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next)

// --- SSE: clientes conectados (TV, kiosko) ---
const clients = new Set()

async function broadcast(type) {
  const payload = JSON.stringify({ type, estado: await snapshot() })
  for (const res of clients) res.write(`data: ${payload}\n\n`)
}

app.get(
  '/api/stream',
  wrap(async (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.flushHeaders()
    res.write(`data: ${JSON.stringify({ type: 'snapshot', estado: await snapshot() })}\n\n`)
    clients.add(res)
    const ping = setInterval(() => res.write(': ping\n\n'), 25000)
    req.on('close', () => {
      clearInterval(ping)
      clients.delete(res)
    })
  }),
)

// --- Auth ---
app.post(
  '/api/auth/login',
  loginLimiter,
  wrap(async (req, res) => {
    const { username, password } = req.body || {}
    const result = await login(username, password)
    if (!result) return res.status(401).json({ error: 'Usuario o contrasena incorrectos' })
    res.json(result)
  }),
)

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// --- Publico (kiosko / TV) ---
app.get('/api/servicios', (_req, res) => {
  res.json({ servicios: listServices() })
})

app.get(
  '/api/estado',
  wrap(async (_req, res) => {
    res.json(await snapshot())
  }),
)

app.post(
  '/api/turnos',
  turnoLimiter,
  wrap(async (req, res) => {
    try {
      const { servicio, cedula, prioritario, condicion } = req.body || {}
      const result = await createTurno({ servicio, cedula, prioritario, condicion })
      await broadcast('update')
      res.status(201).json({
        numero: result.turno.numero,
        servicio: result.turno.servicio,
        id: result.turno.id,
        prioritario: result.turno.prioritario,
        condicion: result.turno.condicion,
        posicion: result.posicion,
        enEspera: result.enEspera,
        esperaEstimadaMin: result.esperaEstimadaMin,
      })
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

// --- Protegido (asesor / admin) ---
app.post(
  '/api/turnos/llamar',
  requireAuth,
  wrap(async (req, res) => {
    const { modulo, servicio } = req.body || {}
    const turno = await llamarSiguiente({ modulo, servicio })
    if (!turno) return res.status(404).json({ error: 'No hay turnos en espera' })
    await broadcast('llamado')
    res.json(turno)
  }),
)

app.post(
  '/api/turnos/:id/rellamar',
  requireAuth,
  wrap(async (req, res) => {
    const turno = await rellamarTurno(req.params.id)
    if (!turno) return res.status(404).json({ error: 'No se puede rellamar este turno' })
    await broadcast('llamado')
    res.json(turno)
  }),
)

app.post(
  '/api/turnos/:id/atender',
  requireAuth,
  wrap(async (req, res) => {
    const turno = await atenderTurno(req.params.id)
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' })
    await broadcast('update')
    res.json(turno)
  }),
)

app.post(
  '/api/turnos/:id/ausente',
  requireAuth,
  wrap(async (req, res) => {
    const turno = await marcarAusente(req.params.id)
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' })
    await broadcast('update')
    res.json(turno)
  }),
)

app.get(
  '/api/clientes/:cedula',
  requireAuth,
  wrap(async (req, res) => {
    try {
      const result = await consultarCliente(req.params.cedula)
      res.json(result)
    } catch (err) {
      res.status(500).json({ error: 'No se pudo consultar el cliente' })
    }
  }),
)

// Catalogos parametrizables (ej. resultado_atencion, canal_atencion) para
// alimentar los selects del formulario de atencion.
app.get(
  '/api/catalogos/:tipo',
  requireAuth,
  wrap(async (req, res) => {
    res.json({ items: await listCatalogoActivo(req.params.tipo) })
  }),
)

app.get(
  '/api/atenciones',
  requireAuth,
  wrap(async (req, res) => {
    res.json({ atenciones: await listAtenciones(req.user) })
  }),
)

app.post(
  '/api/atenciones',
  requireAuth,
  wrap(async (req, res) => {
    try {
      // El asesor responsable se toma de la sesion, no del cliente.
      const record = await crearAtencion({
        ...(req.body || {}),
        advisor: req.user.nombre,
        idAsesor: req.user.id,
        sede: req.user.sede,
      })
      if (record.turnoNumero) await broadcast('update')

      // Prefill para encadenar el formulario de venta/cotizacion desde la atencion
      // (seccion 4.2 y 11 del plan). Los endpoints de venta/cotizacion llegan en
      // Fase 2/3; por ahora solo se informa al frontend que flujo abrir.
      const prefill = record.abrirFlujo
        ? {
            codigoAtencion: record.dbId,
            cedula: record.document,
            nombre: record.client,
            telefono: record.phone,
            correo: record.email,
            servicio: record.service,
          }
        : null

      res.status(201).json({ ...record, prefill })
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

// --- Catalogo de servicios/actividades ---
const supervisorOnly = [requireAuth, requireRole('coordinador', 'admin')]

app.get(
  '/api/servicios-catalogo',
  requireAuth,
  wrap(async (req, res) => {
    // ?todos=1 (solo coordinador/admin) incluye inactivos, para Parametrizacion.
    const incluirInactivos = req.query?.todos === '1' && esSupervisor(req.user)
    res.json({ servicios: await listServiciosConActividades(!incluirInactivos) })
  }),
)

app.post(
  '/api/servicios-catalogo',
  supervisorOnly,
  wrap(async (req, res) => {
    try {
      res.status(201).json(await crearServicio(req.body || {}, req.user.id))
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.patch(
  '/api/servicios-catalogo/:id',
  supervisorOnly,
  wrap(async (req, res) => {
    const servicio = await actualizarServicio(Number(req.params.id), req.body || {}, req.user.id)
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' })
    res.json(servicio)
  }),
)

app.post(
  '/api/servicios-catalogo/actividades',
  supervisorOnly,
  wrap(async (req, res) => {
    try {
      res.status(201).json(await crearActividad(req.body || {}, req.user.id))
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.patch(
  '/api/servicios-catalogo/actividades/:id',
  supervisorOnly,
  wrap(async (req, res) => {
    const actividad = await actualizarActividad(Number(req.params.id), req.body || {}, req.user.id)
    if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada' })
    res.json(actividad)
  }),
)

// --- Parametrizacion: catalogos genericos (Modulo de Parametrizacion, Fase 4) ---
app.get(
  '/api/parametros/tipos',
  supervisorOnly,
  (_req, res) => res.json({ tipos: TIPOS_CATALOGO }),
)

app.get(
  '/api/parametros/:tipo',
  supervisorOnly,
  wrap(async (req, res) => {
    res.json({ items: await listCatalogoTodos(req.params.tipo) })
  }),
)

// Las sedes son un catalogo especial: coordinador y admin pueden consultarlas,
// pero solo el administrador puede crearlas o editarlas (evita que se creen
// sedes nuevas sin control central de TI/administracion).
function soloAdminParaSede(req, res, next) {
  if (req.params.tipo === 'sede' && req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador puede crear o editar sedes' })
  }
  next()
}

app.post(
  '/api/parametros/:tipo',
  supervisorOnly,
  soloAdminParaSede,
  wrap(async (req, res) => {
    try {
      res.status(201).json(await crearItemCatalogo(req.params.tipo, req.body || {}, req.user.id))
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.patch(
  '/api/parametros/:tipo/:id',
  supervisorOnly,
  soloAdminParaSede,
  wrap(async (req, res) => {
    const item = await actualizarItemCatalogo(Number(req.params.id), req.body || {}, req.user.id)
    if (!item) return res.status(404).json({ error: 'Item de catalogo no encontrado' })
    res.json(item)
  }),
)

// --- Auditoria (seccion 14, F4-5 del plan) ---
// El coordinador solo consulta modulos de negocio (nunca la tabla 'usuarios');
// el administrador consulta todo.
const TABLAS_NEGOCIO = ['atenciones', 'ventas', 'cotizaciones', 'facturaciones', 'catalogos', 'servicios', 'actividades']
app.get(
  '/api/auditoria',
  supervisorOnly,
  wrap(async (req, res) => {
    const { tabla, idRegistro, idUsuario, desde, hasta } = req.query || {}
    if (req.user.rol === 'coordinador' && tabla && !TABLAS_NEGOCIO.includes(tabla)) {
      return res.status(403).json({ error: 'No tienes permiso para consultar esta tabla' })
    }
    const tablasPermitidas = req.user.rol === 'coordinador' ? TABLAS_NEGOCIO : null
    if (!tabla && tablasPermitidas) {
      // Sin tabla especifica: trae de todas las permitidas y las combina.
      const resultados = await Promise.all(
        tablasPermitidas.map((t) => listAuditoria({ tabla: t, idRegistro, idUsuario, desde, hasta })),
      )
      return res.json({ registros: resultados.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) })
    }
    res.json({ registros: await listAuditoria({ tabla, idRegistro, idUsuario, desde, hasta }) })
  }),
)

// Lista ligera de usuarios activos para selects (responsable de factura, filtros de coordinador).
app.get(
  '/api/usuarios/opciones',
  requireAuth,
  wrap(async (_req, res) => {
    res.json({ usuarios: await listUsuariosOpciones() })
  }),
)

// --- Ventas (Modulo 2 del plan de mercadeo) ---
// El Asesor Integral no registra ni consulta ventas (matriz de permisos,
// seccion 2.2 del plan): solo Asesor Comercial, Coordinador y Administrador.
const conVentas = [requireAuth, requireRole('asesor_comercial', 'coordinador', 'admin')]

app.get(
  '/api/ventas',
  conVentas,
  wrap(async (req, res) => {
    const { desde, hasta, servicio, actividad, asesor, estado, q } = req.query || {}
    const ventas = await listVentas(req.user, { desde, hasta, servicio, actividad, asesor, estado, q })
    res.json({ ventas })
  }),
)

app.post(
  '/api/ventas',
  conVentas,
  wrap(async (req, res) => {
    try {
      const venta = await crearVenta(req.body || {}, req.user)
      res.status(201).json(venta)
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.get(
  '/api/ventas/:id',
  conVentas,
  wrap(async (req, res) => {
    try {
      const venta = await getVenta(Number(req.params.id), req.user)
      if (!venta) return res.status(404).json({ error: 'Venta no encontrada' })
      res.json(venta)
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.patch(
  '/api/ventas/:id',
  conVentas,
  wrap(async (req, res) => {
    try {
      const venta = await actualizarVenta(Number(req.params.id), req.body || {}, req.user)
      if (!venta) return res.status(404).json({ error: 'Venta no encontrada' })
      res.json(venta)
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.post(
  '/api/ventas/:id/anular',
  requireAuth,
  requireRole('coordinador', 'admin'),
  wrap(async (req, res) => {
    const venta = await anularVenta(Number(req.params.id), req.body?.motivo, req.user)
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' })
    res.json(venta)
  }),
)

// --- Cotizaciones (Modulo 3 del plan de mercadeo) ---
app.get(
  '/api/cotizaciones/alertas',
  requireAuth,
  wrap(async (req, res) => {
    res.json({ cotizaciones: await alertasVencimiento(req.user) })
  }),
)

app.get(
  '/api/cotizaciones',
  requireAuth,
  wrap(async (req, res) => {
    const { estado, asesor, servicio, desde, hasta, q } = req.query || {}
    const cotizaciones = await listCotizaciones(req.user, { estado, asesor, servicio, desde, hasta, q })
    res.json({ cotizaciones })
  }),
)

app.post(
  '/api/cotizaciones',
  requireAuth,
  wrap(async (req, res) => {
    try {
      const cotizacion = await crearCotizacion(req.body || {}, req.user)
      res.status(201).json(cotizacion)
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.get(
  '/api/cotizaciones/:id',
  requireAuth,
  wrap(async (req, res) => {
    try {
      const cotizacion = await getCotizacion(Number(req.params.id), req.user)
      if (!cotizacion) return res.status(404).json({ error: 'Cotizacion no encontrada' })
      res.json(cotizacion)
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.patch(
  '/api/cotizaciones/:id',
  requireAuth,
  wrap(async (req, res) => {
    try {
      const cotizacion = await actualizarCotizacion(Number(req.params.id), req.body || {}, req.user)
      if (!cotizacion) return res.status(404).json({ error: 'Cotizacion no encontrada' })
      res.json(cotizacion)
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.post(
  '/api/cotizaciones/:id/estado',
  requireAuth,
  wrap(async (req, res) => {
    try {
      const cotizacion = await cambiarEstadoCotizacion(Number(req.params.id), req.body || {}, req.user)
      if (!cotizacion) return res.status(404).json({ error: 'Cotizacion no encontrada' })
      res.json(cotizacion)
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.post(
  '/api/cotizaciones/:id/convertir',
  requireAuth,
  wrap(async (req, res) => {
    try {
      const prefill = await prefillConversion(Number(req.params.id), req.user)
      if (!prefill) return res.status(404).json({ error: 'Cotizacion no encontrada' })
      res.json(prefill)
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

// --- Facturaciones (Modulo 4: bandeja de control, NO genera facturas) ---
app.get(
  '/api/facturas',
  requireAuth,
  wrap(async (req, res) => {
    const { estadoGestion, responsable, q } = req.query || {}
    res.json({ facturas: await listFacturas(req.user, { estadoGestion, responsable, q }) })
  }),
)

// Registrar factura: el Asesor Integral no puede (matriz de permisos, seccion
// 2.2 del plan). Consultar/gestionar una ya asignada si sigue permitido para
// todos via el scope de facturaciones.js ("si es responsable").
app.post(
  '/api/facturas',
  requireAuth,
  requireRole('asesor_comercial', 'coordinador', 'admin'),
  wrap(async (req, res) => {
    try {
      const factura = await crearFactura(req.body || {}, req.user)
      res.status(201).json(factura)
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.get(
  '/api/facturas/:id',
  requireAuth,
  wrap(async (req, res) => {
    try {
      const factura = await getFactura(Number(req.params.id), req.user)
      if (!factura) return res.status(404).json({ error: 'Factura no encontrada' })
      res.json(factura)
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.patch(
  '/api/facturas/:id',
  requireAuth,
  wrap(async (req, res) => {
    try {
      const factura = await actualizarFactura(Number(req.params.id), req.body || {}, req.user)
      if (!factura) return res.status(404).json({ error: 'Factura no encontrada' })
      res.json(factura)
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.post(
  '/api/facturas/:id/asignar',
  requireAuth,
  requireRole('coordinador', 'admin'),
  wrap(async (req, res) => {
    const factura = await asignarResponsable(Number(req.params.id), req.body?.idResponsable, req.user)
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' })
    res.json(factura)
  }),
)

app.post(
  '/api/facturas/:id/anular',
  requireAuth,
  requireRole('coordinador', 'admin'),
  wrap(async (req, res) => {
    const factura = await anularFactura(Number(req.params.id), req.user)
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' })
    res.json(factura)
  }),
)

// --- Notificaciones internas (campana en el Topbar) ---
app.get(
  '/api/notificaciones',
  requireAuth,
  wrap(async (req, res) => {
    res.json({ notificaciones: await listNotificaciones(req.user.id) })
  }),
)

app.post(
  '/api/notificaciones/:id/leer',
  requireAuth,
  wrap(async (req, res) => {
    await marcarLeida(Number(req.params.id), req.user.id)
    res.json({ ok: true })
  }),
)

// --- BI: dashboard individual del asesor (seccion 9.1 del plan) ---
app.get(
  '/api/bi/asesor',
  requireAuth,
  wrap(async (req, res) => {
    res.json(await biAsesor(req.user.id))
  }),
)

// --- BI: dashboard consolidado del coordinador (seccion 9.2 del plan) ---
app.get(
  '/api/bi/coordinador',
  requireAuth,
  requireRole('coordinador', 'admin'),
  wrap(async (req, res) => {
    const { asesor, servicio, actividad, desde, hasta, sede } = req.query || {}
    res.json(await biCoordinador({ asesor, servicio, actividad, desde, hasta, sede }))
  }),
)

// --- Exportacion a Excel (F4-3 del plan): misma vista, mismos filtros ---
app.get(
  '/api/bi/export/:vista',
  requireAuth,
  wrap(async (req, res) => {
    const { vista } = req.params
    if (!vistaExisteYPermitida(vista, req.user)) {
      return res.status(404).json({ error: 'Vista de exportacion no disponible' })
    }
    const { asesor, servicio, actividad, desde, hasta, sede, estado, estadoGestion, q } = req.query || {}
    const workbook = await exportarVista(
      vista,
      { asesor, servicio, actividad, desde, hasta, sede, estado, estadoGestion, q },
      req.user,
    )
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${vista}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    })
    await workbook.xlsx.write(res)
    res.end()
  }),
)

// --- Usuarios (solo admin) ---
const adminOnly = [requireAuth, requireRole('admin')]

app.get(
  '/api/usuarios',
  adminOnly,
  wrap(async (_req, res) => {
    res.json({ usuarios: await listUsuarios() })
  }),
)

app.post(
  '/api/usuarios',
  adminOnly,
  wrap(async (req, res) => {
    try {
      res.status(201).json(await crearUsuario(req.body || {}, req.user.id))
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message })
    }
  }),
)

app.patch(
  '/api/usuarios/:id',
  adminOnly,
  wrap(async (req, res) => {
    const id = Number(req.params.id)
    const body = req.body || {}
    const target = await getUsuario(id)
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' })

    // Protecciones: no desactivarse a si mismo ni dejar el sistema sin admins.
    if (id === req.user.id && body.activo === false) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' })
    }
    const dejaDeSerAdminActivo =
      target.rol === 'admin' && target.activo && (body.activo === false || (body.rol && body.rol !== 'admin'))
    if (dejaDeSerAdminActivo && (await adminsActivos()) <= 1) {
      return res.status(400).json({ error: 'Debe quedar al menos un administrador activo' })
    }

    const updated = await actualizarUsuario(id, body, req.user.id)
    res.json(updated)
  }),
)

// --- Frontend (SPA) en produccion ---
const distDir = join(__dirname, '..', 'dist')
if (isProd && existsSync(distDir)) {
  app.use(express.static(distDir))
  // Fallback SPA: cualquier ruta no-API devuelve index.html.
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(distDir, 'index.html'))
  })
}

// Error handler final: cualquier rechazo no manejado en un wrap() cae aqui.
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' })
})

async function main() {
  await initDb()
  iniciarTareasProgramadas()
  app.listen(PORT, () => {
    console.log(`Turnero backend escuchando en http://localhost:${PORT} (${isProd ? 'produccion' : 'dev'})`)
  })
}

main().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err)
  process.exit(1)
})
