// Cliente del backend del turnero.
// Base vacia => rutas relativas (usa el proxy de Vite en dev; en produccion el
// backend sirve el SPA desde el mismo origen). Configurable con VITE_API_URL.
const BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'turnero-token'

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token)
  else window.localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  // Ventana deslizante de 30 min: el backend renueva el token en cada peticion
  // autenticada. Guardamos el nuevo para que la sesion solo caduque por inactividad.
  const refreshed = res.headers.get('X-Refreshed-Token')
  if (refreshed) setToken(refreshed)
  if (res.status === 401) {
    setToken(null)
    throw Object.assign(new Error('Sesion expirada'), { status: 401 })
  }
  if (!res.ok) {
    let message = `Error ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* sin cuerpo json */
    }
    throw new Error(message)
  }
  return res.json()
}

export async function login(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    let message = 'Usuario o contrasena incorrectos'
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* sin cuerpo */
    }
    throw new Error(message)
  }
  const data = await res.json()
  setToken(data.token)
  return data.user
}

export function logout() {
  setToken(null)
}

export function getEstado() {
  return request('/api/estado')
}

export function crearTurno({ servicio, cedula, prioritario, condicion }) {
  return request('/api/turnos', {
    method: 'POST',
    body: JSON.stringify({ servicio, cedula, prioritario, condicion }),
  })
}

export function llamarSiguiente({ modulo, servicio } = {}) {
  return request('/api/turnos/llamar', {
    method: 'POST',
    body: JSON.stringify({ modulo, servicio }),
  })
}

export function rellamarTurno(id) {
  return request(`/api/turnos/${id}/rellamar`, { method: 'POST' })
}

export function atenderActual(id) {
  return request(`/api/turnos/${id}/atender`, { method: 'POST' })
}

export function marcarAusente(id) {
  return request(`/api/turnos/${id}/ausente`, { method: 'POST' })
}

export function buscarCliente(cedula) {
  return request(`/api/clientes/${encodeURIComponent(cedula)}`)
}

export function getAtenciones() {
  return request('/api/atenciones')
}

// Catalogo parametrizable (ej. 'resultado_atencion'): { items: [{codigo, nombre, orden}] }
export function getCatalogo(tipo) {
  return request(`/api/catalogos/${encodeURIComponent(tipo)}`)
}

export function crearAtencion(data) {
  return request('/api/atenciones', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getUsuarios() {
  return request('/api/usuarios')
}

export function crearUsuario(data) {
  return request('/api/usuarios', { method: 'POST', body: JSON.stringify(data) })
}

export function actualizarUsuario(id, data) {
  return request(`/api/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

// Catalogo de servicios con sus actividades anidadas (para selects dependientes).
// incluirInactivos: solo coordinador/admin, para el gestor de Parametrizacion.
export function getServiciosCatalogo(incluirInactivos = false) {
  return request(`/api/servicios-catalogo${incluirInactivos ? '?todos=1' : ''}`)
}

export function crearServicio(data) {
  return request('/api/servicios-catalogo', { method: 'POST', body: JSON.stringify(data) })
}

export function actualizarServicio(id, data) {
  return request(`/api/servicios-catalogo/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function crearActividad(data) {
  return request('/api/servicios-catalogo/actividades', { method: 'POST', body: JSON.stringify(data) })
}

export function actualizarActividad(id, data) {
  return request(`/api/servicios-catalogo/actividades/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

// --- Parametrizacion (catalogos genericos) ---
export function getTiposCatalogo() {
  return request('/api/parametros/tipos')
}

export function getParametros(tipo) {
  return request(`/api/parametros/${tipo}`)
}

export function crearParametro(tipo, data) {
  return request(`/api/parametros/${tipo}`, { method: 'POST', body: JSON.stringify(data) })
}

export function actualizarParametro(tipo, id, data) {
  return request(`/api/parametros/${tipo}/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

// --- Auditoria ---
export function getAuditoria(filtros = {}) {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== '' && v != null),
  ).toString()
  return request(`/api/auditoria${params ? `?${params}` : ''}`)
}

// Usuarios activos (lista ligera) para selects: responsable de factura, filtro por asesor.
export function getUsuariosOpciones() {
  return request('/api/usuarios/opciones')
}

export function getVentas(filtros = {}) {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== '' && v != null),
  ).toString()
  return request(`/api/ventas${params ? `?${params}` : ''}`)
}

export function getVenta(id) {
  return request(`/api/ventas/${id}`)
}

export function crearVenta(data) {
  return request('/api/ventas', { method: 'POST', body: JSON.stringify(data) })
}

export function actualizarVenta(id, data) {
  return request(`/api/ventas/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function anularVenta(id, motivo) {
  return request(`/api/ventas/${id}/anular`, { method: 'POST', body: JSON.stringify({ motivo }) })
}

export function getBiAsesor() {
  return request('/api/bi/asesor')
}

export function getBiCoordinador(filtros = {}) {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== '' && v != null),
  ).toString()
  return request(`/api/bi/coordinador${params ? `?${params}` : ''}`)
}

// --- Cotizaciones ---
export function getCotizaciones(filtros = {}) {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== '' && v != null),
  ).toString()
  return request(`/api/cotizaciones${params ? `?${params}` : ''}`)
}

export function getAlertasCotizaciones() {
  return request('/api/cotizaciones/alertas')
}

export function getCotizacion(id) {
  return request(`/api/cotizaciones/${id}`)
}

export function crearCotizacion(data) {
  return request('/api/cotizaciones', { method: 'POST', body: JSON.stringify(data) })
}

export function actualizarCotizacion(id, data) {
  return request(`/api/cotizaciones/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function cambiarEstadoCotizacion(id, estado, motivoRechazo) {
  return request(`/api/cotizaciones/${id}/estado`, {
    method: 'POST',
    body: JSON.stringify({ estado, motivoRechazo }),
  })
}

export function convertirCotizacionEnVenta(id) {
  return request(`/api/cotizaciones/${id}/convertir`, { method: 'POST' })
}

// --- Facturaciones ---
export function getFacturas(filtros = {}) {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== '' && v != null),
  ).toString()
  return request(`/api/facturas${params ? `?${params}` : ''}`)
}

export function getFactura(id) {
  return request(`/api/facturas/${id}`)
}

export function crearFactura(data) {
  return request('/api/facturas', { method: 'POST', body: JSON.stringify(data) })
}

export function actualizarFactura(id, data) {
  return request(`/api/facturas/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function asignarResponsableFactura(id, idResponsable) {
  return request(`/api/facturas/${id}/asignar`, { method: 'POST', body: JSON.stringify({ idResponsable }) })
}

export function anularFactura(id) {
  return request(`/api/facturas/${id}/anular`, { method: 'POST' })
}

// Descarga una vista como .xlsx (F4-3). El navegador dispara la descarga
// directamente; no pasa por request() porque la respuesta no es JSON.
export async function descargarExportacion(vista, filtros = {}) {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== '' && v != null),
  ).toString()
  const token = getToken()
  const res = await fetch(`${BASE}/api/bi/export/${vista}${params ? `?${params}` : ''}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('No se pudo generar el archivo Excel')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${vista}-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// --- Notificaciones ---
export function getNotificaciones() {
  return request('/api/notificaciones')
}

export function marcarNotificacionLeida(id) {
  return request(`/api/notificaciones/${id}/leer`, { method: 'POST' })
}

// Suscripcion en vivo via SSE. Devuelve una funcion para cerrar la conexion.
// onEvent recibe { type, estado }.
export function suscribir(onEvent) {
  const source = new EventSource(`${BASE}/api/stream`)
  source.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data))
    } catch {
      /* ignora pings/lineas no-json */
    }
  }
  return () => source.close()
}
