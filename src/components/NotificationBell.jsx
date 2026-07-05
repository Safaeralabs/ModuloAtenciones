import { useEffect, useRef, useState } from 'react'
import { getNotificaciones, marcarNotificacionLeida } from '../api'

// Campana de notificaciones (seccion 6.4 y F3-4 del plan): alertas de
// cotizaciones por vencer y facturas asignadas. Se actualiza cada 60s.
export function NotificationBell() {
  const [abierto, setAbierto] = useState(false)
  const [notificaciones, setNotificaciones] = useState([])
  const ref = useRef(null)

  const cargar = () => {
    getNotificaciones()
      .then((d) => setNotificaciones(d.notificaciones || []))
      .catch(() => {})
  }

  useEffect(() => {
    cargar()
    const i = setInterval(cargar, 60000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    if (!abierto) return undefined
    const onClickFuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', onClickFuera)
    return () => document.removeEventListener('mousedown', onClickFuera)
  }, [abierto])

  const noLeidas = notificaciones.filter((n) => !n.leida).length

  const leer = async (n) => {
    if (!n.leida) {
      await marcarNotificacionLeida(n.id).catch(() => {})
      cargar()
    }
  }

  return (
    <div className="notification-bell" ref={ref}>
      <button
        className="ghost-button"
        type="button"
        aria-label={`Notificaciones${noLeidas ? ` (${noLeidas} sin leer)` : ''}`}
        onClick={() => setAbierto((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true">
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {noLeidas > 0 && <span className="notification-dot">{noLeidas > 9 ? '9+' : noLeidas}</span>}
      </button>
      {abierto && (
        <div className="notification-dropdown" role="menu">
          <div className="notification-dropdown-head">
            <strong>Notificaciones</strong>
          </div>
          <div className="notification-dropdown-body">
            {notificaciones.length === 0 && <p className="notification-empty">Sin notificaciones.</p>}
            {notificaciones.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`notification-item ${n.leida ? '' : 'no-leida'}`}
                onClick={() => leer(n)}
              >
                <span>{n.mensaje}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
