// Utilidades de formato/derivacion compartidas entre modulos.

export function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'US'
}

export const dash = (v) => (v == null || v === '' ? '—' : v)
export const siNo = (v) => (v ? 'Si' : 'No')
// Hay datos de mercadeo que valga la pena mostrar en el detalle.
export const tieneMercadeo = (a) =>
  Boolean(a.interes?.length || a.consentimiento || a.accionSeguimiento || a.notaMercadeo)
export const formatCOP = (n) =>
  n == null || n === ''
    ? '—'
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n))

export function slug(text) {
  return text.toLowerCase().replace(/\s+/g, '-')
}
