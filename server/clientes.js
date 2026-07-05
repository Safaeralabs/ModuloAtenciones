import { buscarCliente as buscarEnHistorial } from './store.js'
import { consultarClienteWebservice } from './webservice.js'

// Arma el objeto cliente que consume el frontend a partir del dato de SISU:
// campos de contacto "planos" (editables) + el bloque sisu completo (solo
// lectura, se muestra y se persiste como snapshot en la atencion).
function clienteDesdeSisu(sisu) {
  const t = sisu.trabajador || {}
  return {
    client: t.nombre || '',
    phone: t.celular || t.telefono || '',
    email: '', // SISU no provee email: se captura manualmente.
    address: t.direccion || '',
    city: t.ciudad || '',
    sisu, // { trabajador, empresa }
  }
}

// Orquesta la consulta del cliente por cedula:
//   1. Primero SISU (fuente autoritativa: afiliado + empresa).
//   2. Si no hay dato (o SISU falla), cae al historico local de atenciones.
// Siempre devuelve { encontrado, cliente, fuente } para que el frontend sepa
// si autollenar o pedir registro manual, y de donde salio el dato.
export async function consultarCliente(cedula) {
  const sisu = await consultarClienteWebservice(cedula)
  if (sisu) {
    return { encontrado: true, cliente: clienteDesdeSisu(sisu), fuente: 'sisu' }
  }

  const histCliente = await buscarEnHistorial(cedula)
  if (histCliente) {
    return { encontrado: true, cliente: histCliente, fuente: 'historial' }
  }

  return { encontrado: false, cliente: null, fuente: null }
}
