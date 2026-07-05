import { initials } from '../utils'
import { ROLE_LABELS } from '../constants'
import { NotificationBell } from './NotificationBell'

export function Topbar({ user, onToggleMenu, onLogout }) {
  const nombre = user?.nombre || 'Usuario'
  const rol = ROLE_LABELS[user?.rol] || 'Asesor'
  return (
    <header className="topbar">
      <button className="ghost-button" type="button" aria-label="Abrir menu principal" onClick={onToggleMenu}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="topbar-user">
        <NotificationBell />
        <div className="avatar" aria-hidden="true">{initials(nombre)}</div>
        <div>
          <strong>{nombre}</strong>
          <span>{rol}</span>
        </div>
        <button className="secondary-button compact-button" type="button" onClick={onLogout}>
          Salir
        </button>
      </div>
    </header>
  )
}
