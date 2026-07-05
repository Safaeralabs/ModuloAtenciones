import { NavIcon } from './icons'
import { Logo } from './Logo'
import {
  menu, screenLinks, facturasMenuItem, rolesConVentas,
  biCoordinadorMenuItem, parametrizacionMenuItem, auditoriaMenuItem, rolesSupervisor,
} from '../constants'

export function Sidebar({ current, onNavigate, isMobileMenuOpen, user }) {
  // Facturas se inserta despues de "Registrar atencion" solo para los roles
  // habilitados (Asesor Comercial, Coordinador, Administrador) — Ventas ya no
  // es un item propio: es una pestana dentro de Inicio para esos mismos roles.
  // BI Consolidado y Parametrizacion solo para Coordinador/Administrador;
  // Usuarios y Auditoria solo para Administrador.
  const registerIndex = menu.findIndex((item) => item.key === 'register')
  let items = rolesConVentas.has(user?.rol)
    ? [...menu.slice(0, registerIndex + 1), facturasMenuItem, ...menu.slice(registerIndex + 1)]
    : menu
  // Auditoria: coordinador ve solo modulos de negocio, admin ve todo (seccion 5 del plan).
  if (rolesSupervisor.has(user?.rol)) items = [...items, biCoordinadorMenuItem, parametrizacionMenuItem, auditoriaMenuItem]
  if (user?.rol === 'admin') items = [...items, { key: 'usuarios', label: 'Usuarios' }]
  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      <Logo compact />
      <nav className="sidebar-nav" aria-label="Navegacion principal">
        {items.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${current === item.key ? 'active' : ''}`}
            type="button"
            aria-current={current === item.key ? 'page' : undefined}
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-icon">
              <NavIcon name={item.key} />
            </span>
            {item.label}
          </button>
        ))}
      </nav>
      {user?.rol === 'admin' && (
        <div className="sidebar-section">
          <span className="sidebar-section-title">Pantallas</span>
          {screenLinks.map((item) => (
            <button
              key={item.key}
              className={`nav-item subtle ${current === item.key ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate(item.key)}
            >
              <span className="nav-icon">
                <NavIcon name="turnero" />
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}
      <div className="support-box">
        <strong>Necesitas ayuda?</strong>
        <span>Soporte tecnico</span>
      </div>
    </aside>
  )
}
