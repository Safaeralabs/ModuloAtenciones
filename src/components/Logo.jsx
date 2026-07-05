import logoImg from '../assets/logo-comfaguajira.png'

// onDark: usar sobre fondos oscuros (ej. la pantalla de TV), donde el logo
// necesita una tarjeta blanca detras para verse bien (el PNG trae fondo
// blanco solido, sin transparencia).
export function Logo({ compact = false, onDark = false }) {
  return (
    <div className={`logo ${compact ? 'compact' : ''} ${onDark ? 'on-dark' : ''}`}>
      <img src={logoImg} alt="Comfaguajira - Familias felices" className="logo-img" />
    </div>
  )
}
