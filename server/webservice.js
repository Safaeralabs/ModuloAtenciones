// Adaptador del webservice SISU (sistema de subsidios de Comfaguajira).
//
// Consulta por cedula y devuelve los datos del AFILIADO (trabajador) y de su
// EMPRESA afiliadora. El protocolo real aun no esta definido: este modulo aisla
// esa decision. El resto del backend solo llama a consultarClienteWebservice()
// y recibe SIEMPRE la misma estructura normalizada { trabajador, empresa } o null.
//
// Para conectar SISU real, completa la rama correspondiente y cambia WS_PROVIDER:
//   WS_PROVIDER=mock  -> datos simulados (desarrollo, por defecto)
//   WS_PROVIDER=rest  -> consume un endpoint HTTP/JSON (completar mapeo)
//   WS_PROVIDER=soap  -> consume un servicio SOAP/XML (requiere implementarlo)
//   WS_PROVIDER=off   -> deshabilita SISU (solo historico local)

const PROVIDER = (process.env.WS_PROVIDER || 'mock').toLowerCase()
const WS_URL = process.env.WS_URL || ''
const WS_API_KEY = process.env.WS_API_KEY || ''
const WS_TIMEOUT_MS = Number(process.env.WS_TIMEOUT_MS || 5000)

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function toBool(value) {
  if (typeof value === 'boolean') return value
  const v = String(value || '').trim().toLowerCase()
  return v === 'true' || v === 's' || v === 'si' || v === 'sí' || v === '1' || v === 'x'
}

// Calcula la edad a partir de la fecha de nacimiento (YYYY-MM-DD).
function edadDesde(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const nac = new Date(fechaNacimiento)
  if (Number.isNaN(nac.getTime())) return null
  const hoy = new Date()
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad >= 0 && edad < 130 ? edad : null
}

// ─── Normalizacion (acepta naming es/en para no atarnos al SISU real) ──
function normalizarTrabajador(raw) {
  if (!raw) return null
  const fechaNacimiento = raw.fechaNacimiento || raw.fecha_nacimiento || ''
  return {
    cedula: onlyDigits(raw.cedula || raw.documento || ''),
    nombre: raw.nombre || raw.nombreCompleto || raw.nombre_completo || '',
    estado: raw.estado || '', // Activo / Retirado
    fechaAfiliacion: raw.fechaAfiliacion || raw.fecha_afiliacion || '',
    fechaRetiro: raw.fechaRetiro || raw.fecha_retiro || '',
    salario: raw.salario != null ? Number(raw.salario) : null,
    nivelEducativo: raw.nivelEducativo || raw.nivel_educativo || '',
    profesion: raw.profesion || '',
    categoria: raw.categoria || '', // A / B / C
    tipoCotizante: raw.tipoCotizante || raw.tipo_cotizante || '', // Dependiente / Independiente
    sexo: raw.sexo || '',
    estadoCivil: raw.estadoCivil || raw.estado_civil || '',
    fechaNacimiento,
    edad: edadDesde(fechaNacimiento),
    direccion: raw.direccion || '',
    ciudad: raw.ciudad || '',
    telefono: raw.telefono || '',
    celular: raw.celular || '',
    autorizaCompartir: toBool(raw.autorizaCompartir ?? raw.autoriza_compartir),
    beneficiarios: toBool(raw.beneficiarios),
  }
}

function normalizarEmpresa(raw) {
  if (!raw) return null
  return {
    nit: raw.nit || '',
    razonSocial: raw.razonSocial || raw.razon_social || '',
    sucursal: raw.sucursal || '',
    zona: raw.zona || '',
    estado: raw.estado || '', // Activo / Inactivo
    fechaEstado: raw.fechaEstado || raw.fecha_estado || '',
    numeroTrabajadores: raw.numeroTrabajadores ?? raw.numero_trabajadores ?? null,
    actividadEconomica: raw.actividadEconomica || raw.actividad_economica || '',
    autorizaCompartir: toBool(raw.autorizaCompartir ?? raw.autoriza_compartir),
  }
}

// Estructura final que consume el backend. null si no hay trabajador.
function normalizar(raw) {
  const trabajador = normalizarTrabajador(raw?.trabajador || raw?.afiliado)
  if (!trabajador || (!trabajador.nombre && !trabajador.cedula)) return null
  const empresa = normalizarEmpresa(raw?.empresa || raw?.afiliador)
  return { trabajador, empresa }
}

// fetch con timeout (aborta si SISU tarda demasiado).
async function fetchConTimeout(url, options = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), WS_TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal })
    if (!res.ok) throw new Error(`SISU respondio ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

// ─── Mock (desarrollo) ───────────────────────────────────────────
const MOCK_SISU = {
  '12345678': {
    trabajador: {
      cedula: '12345678',
      nombre: 'Maria Gomez Pacheco',
      estado: 'Activo',
      fechaAfiliacion: '2019-03-15',
      salario: 2200000,
      nivelEducativo: 'Tecnologo',
      profesion: 'Auxiliar contable',
      categoria: 'B',
      tipoCotizante: 'Dependiente',
      sexo: 'Femenino',
      estadoCivil: 'Casada',
      fechaNacimiento: '1990-07-22',
      direccion: 'Calle 12 # 5-30',
      ciudad: 'Riohacha',
      telefono: '6055551020',
      celular: '3104567890',
      autorizaCompartir: true,
      beneficiarios: true,
    },
    empresa: {
      nit: '900111222-3',
      razonSocial: 'Comercializadora La Guajira S.A.S',
      sucursal: 'Principal',
      zona: 'Riohacha',
      estado: 'Activo',
      fechaEstado: '2015-01-10',
      numeroTrabajadores: 48,
      actividadEconomica: 'Comercio al por mayor',
      autorizaCompartir: true,
    },
  },
  '1004567890': {
    trabajador: {
      cedula: '1004567890',
      nombre: 'Andres Felipe Mendoza',
      estado: 'Retirado',
      fechaAfiliacion: '2021-06-01',
      fechaRetiro: '2025-11-30',
      salario: 1300000,
      nivelEducativo: 'Bachiller',
      profesion: 'Operario',
      categoria: 'A',
      tipoCotizante: 'Dependiente',
      sexo: 'Masculino',
      estadoCivil: 'Soltero',
      fechaNacimiento: '2001-02-14',
      direccion: 'Av. Los Estudiantes # 3-15',
      ciudad: 'Riohacha',
      celular: '3001112233',
      autorizaCompartir: false,
      beneficiarios: false,
    },
    empresa: {
      nit: '901222333-4',
      razonSocial: 'Agroindustrias del Norte Ltda',
      sucursal: 'Maicao',
      zona: 'Riohacha',
      estado: 'Activo',
      fechaEstado: '2018-09-05',
      numeroTrabajadores: 120,
      actividadEconomica: 'Agroindustria',
      autorizaCompartir: true,
    },
  },
}

async function consultarMock(doc) {
  return normalizar(MOCK_SISU[doc])
}

// ─── REST/JSON (completar cuando este el endpoint real de SISU) ──
async function consultarRest(doc) {
  if (!WS_URL) throw new Error('WS_URL no configurada')
  const url = WS_URL.replace('{cedula}', encodeURIComponent(doc))
  const raw = await fetchConTimeout(url, {
    headers: {
      Accept: 'application/json',
      ...(WS_API_KEY ? { Authorization: `Bearer ${WS_API_KEY}` } : {}),
    },
  })
  // Ajusta el desempaquetado segun el contrato real (p. ej. raw.data).
  return normalizar(raw?.data || raw)
}

// ─── SOAP/XML (pendiente: requiere el WSDL real de SISU) ─────────
async function consultarSoap(_doc) {
  // Cuando tengas el WSDL: arma el sobre SOAP, llama con fetchConTimeout
  // (POST, headers SOAPAction/Content-Type text/xml), parsea el XML a un
  // objeto { trabajador, empresa } y pasalo por normalizar().
  throw new Error('Proveedor SOAP aun no implementado: define el WSDL y completa consultarSoap()')
}

// Consulta el afiliado por cedula en SISU. Devuelve { trabajador, empresa } o
// null. Un fallo de SISU nunca debe romper la atencion: se loguea y el
// orquestador cae al historico local.
export async function consultarClienteWebservice(cedula) {
  const doc = onlyDigits(cedula)
  if (!doc) return null
  try {
    switch (PROVIDER) {
      case 'off':
        return null
      case 'rest':
        return await consultarRest(doc)
      case 'soap':
        return await consultarSoap(doc)
      case 'mock':
      default:
        return await consultarMock(doc)
    }
  } catch (err) {
    console.error(`[sisu:${PROVIDER}] error consultando ${doc}:`, err.message)
    return null
  }
}

export const webserviceProvider = PROVIDER
