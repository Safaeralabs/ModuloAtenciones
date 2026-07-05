// Constantes compartidas entre modulos. Ver docs/PLAN-IMPLEMENTACION-PLATAFORMA-MERCADEO.md.

export const defaultPrivateScreen = 'dashboard'
// 'history' y 'ventas' ya no son pantallas propias: viven como pestanas
// dentro de 'dashboard' (Inicio). Se mantienen 'ventas-nueva'/'ventas-detalle'
// porque el formulario y el detalle si son pantallas independientes.
export const allowedScreens = new Set([
  'login', 'dashboard', 'register', 'detail', 'reports', 'turnero', 'kiosko', 'tv', 'usuarios',
  'ventas-nueva', 'ventas-detalle',
  'cotizaciones', 'cotizaciones-nueva', 'cotizaciones-detalle',
  'facturas', 'facturas-nueva',
  'bi-coordinador', 'parametrizacion', 'auditoria',
])
// Pantallas accesibles sin iniciar sesion (kiosko en iPad, TV de llamado, turnero).
export const publicScreens = new Set(['turnero', 'kiosko', 'tv'])

export const menu = [
  { key: 'dashboard', label: 'Inicio' },
  { key: 'register', label: 'Registrar atencion' },
  // Cotizaciones: todos los roles registran/ven las propias (matriz de permisos, seccion 5 del plan).
  { key: 'cotizaciones', label: 'Cotizaciones' },
  { key: 'reports', label: 'Reportes' },
  { key: 'turnero', label: 'Turnero' },
]
// Solo Asesor Comercial, Coordinador y Administrador ven Facturas (Ventas
// ahora es una pestana de Inicio, visible para los mismos roles).
export const facturasMenuItem = { key: 'facturas', label: 'Facturas' }
export const rolesConVentas = new Set(['asesor_comercial', 'coordinador', 'admin'])

// Solo Coordinador y Administrador ven el BI consolidado, parametrizan
// catalogos y consultan auditoria (el coordinador ve solo modulos de negocio).
export const biCoordinadorMenuItem = { key: 'bi-coordinador', label: 'BI Consolidado' }
export const parametrizacionMenuItem = { key: 'parametrizacion', label: 'Parametrizacion' }
export const auditoriaMenuItem = { key: 'auditoria', label: 'Auditoria' }
export const rolesSupervisor = new Set(['coordinador', 'admin'])
export const screenLinks = [
  { key: 'kiosko', label: 'Kiosko (iPad)' },
  { key: 'tv', label: 'Pantalla TV' },
]

export const MODULOS = [1, 2, 3, 4, 5, 6]
export const CONDICIONES_PRIORITARIAS = ['Adulto mayor', 'Gestante', 'Movilidad reducida', 'Discapacidad']

// Mercadeo: productos/servicios sobre los que se detecta interes comercial.
export const PRODUCTOS_INTERES = ['Credito', 'Vivienda', 'Educacion', 'Recreacion y turismo', 'Salud', 'Supermercados', 'Seguros', 'Convenios']
export const ACCIONES_SEGUIMIENTO = ['Llamar', 'Enviar informacion', 'Agendar cita', 'Visita comercial', 'Ninguna']

// Etiquetas de respaldo para 'resultado' (catalogo 'resultado_atencion'; ver seeds en server/sql).
export const RESULTADO_LABELS = {
  venta_directa: 'Venta directa',
  cotizacion_generada: 'Cotización generada',
  informacion_brindada: 'Información brindada',
  afiliacion: 'Afiliación',
  escalada: 'Escalada',
  sin_resolucion: 'Sin resolución / Otro',
}

// Etiquetas de los catalogos parametrizables (seccion 8.2 del plan).
export const TIPO_CATALOGO_LABELS = {
  motivo_atencion: 'Motivos de atención',
  resultado_atencion: 'Resultados de atención',
  motivo_rechazo: 'Motivos de rechazo',
  tipo_evento: 'Tipos de evento',
  lugar_prestacion: 'Lugares de prestación',
  categoria_afiliado: 'Categorías de afiliado',
  tipo_seguimiento: 'Tipos de seguimiento',
  canal_atencion: 'Canales de atención',
  estado_gestion_factura: 'Estados de gestión de factura',
  sede: 'Sedes',
}

// Roles del Módulo de Mercadeo (seccion 5 del plan de implementacion).
export const ROLE_LABELS = {
  asesor_integral: 'Asesor Integral (Atención al Cliente)',
  asesor_comercial: 'Asesor Comercial (Ventas)',
  coordinador: 'Coordinador',
  admin: 'Administrador',
}

export const SERVICE_COLORS = {
  Subsidio: '#3b82f6',
  Credito: '#22c55e',
  'Asesor Integral': '#a855f7',
  Mercadeo: '#f59e0b',
  Afiliaciones: '#06b6d4',
  PQRS: '#ef4444',
}
export const serviceColor = (service) => SERVICE_COLORS[service] || '#64748b'

export const EMPTY_FORM = {
  document: '',
  client: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  service: '',
  motive: '',
  status: '',
  caso: '',
  management: '',
  observations: '',
  // Resultado de la atencion (Módulo de Mercadeo)
  resultado: '',
  // Mercadeo (oportunidad comercial)
  interes: [],
  consentimiento: false,
  accionSeguimiento: '',
  fechaSeguimiento: '',
  notaMercadeo: '',
}
