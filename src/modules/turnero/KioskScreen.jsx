import { useEffect, useState } from 'react'
import { crearTurno } from '../../api'
import { serviceOptions } from '../../mockData'
import { Logo } from '../../components/Logo'
import { ServiceSvgIcon } from '../../components/icons'
import { CONDICIONES_PRIORITARIAS } from '../../constants'

// --- Kiosko (iPad): el cliente saca su turno ---
export function KioskScreen({ onBack }) {
  const [step, setStep] = useState('servicio')
  const [servicio, setServicio] = useState(null)
  const [cedula, setCedula] = useState('')
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setStep('servicio')
    setServicio(null)
    setCedula('')
    setTicket(null)
    setError('')
  }

  // Tras mostrar el ticket, vuelve solo al inicio para el siguiente cliente.
  useEffect(() => {
    if (step !== 'ticket') return undefined
    const timer = setTimeout(reset, 10000)
    return () => clearTimeout(timer)
  }, [step])

  const pressKey = (key) => {
    setError('')
    if (key === 'del') {
      setCedula((c) => c.slice(0, -1))
    } else if (cedula.length < 12) {
      setCedula((c) => c + key)
    }
  }

  const sacarTurno = async ({ prioritario = false, condicion = null } = {}) => {
    setError('')
    setBusy(true)
    try {
      const t = await crearTurno({ servicio, cedula, prioritario, condicion })
      setTicket(t)
      setStep('ticket')
    } catch (err) {
      setError(err.message)
      setStep('cedula')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="kiosko-page">
      <header className="kiosko-top">
        <Logo />
        <button className="ghost-link" type="button" onClick={onBack}>
          Salir
        </button>
      </header>

      {step === 'servicio' && (
        <div className="kiosko-stage">
          <h1>Bienvenido</h1>
          <p>Selecciona el servicio que necesitas</p>
          <div className="kiosko-grid">
            {serviceOptions.map((s) => (
              <button key={s} className="kiosko-tile" type="button" onClick={() => { setServicio(s); setStep('cedula') }}>
                <span className="kiosko-tile-icon">
                  <ServiceSvgIcon service={s} />
                </span>
                <strong>{s}</strong>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'cedula' && (
        <div className="kiosko-stage">
          <h1>{servicio}</h1>
          <p>Ingresa tu numero de cedula</p>
          <div className="cedula-display" aria-live="polite">
            {cedula || <span className="cedula-placeholder">0000000000</span>}
          </div>
          <div className="keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].map((key) => {
              if (key === 'ok') {
                return (
                  <button
                    key={key}
                    className="key key-ok"
                    type="button"
                    onClick={() => setStep('prioridad')}
                    disabled={busy || cedula.length < 4}
                  >
                    Continuar
                  </button>
                )
              }
              if (key === 'del') {
                return (
                  <button key={key} className="key key-del" type="button" onClick={() => pressKey('del')} aria-label="Borrar">
                    ⌫
                  </button>
                )
              }
              return (
                <button key={key} className="key" type="button" onClick={() => pressKey(key)}>
                  {key}
                </button>
              )
            })}
          </div>
          {error && <p className="turnero-error" role="alert">{error}</p>}
          <button className="ghost-link" type="button" onClick={reset}>
            Cambiar servicio
          </button>
        </div>
      )}

      {step === 'prioridad' && (
        <div className="kiosko-stage">
          <h1>Atencion prioritaria</h1>
          <p>Si aplica, selecciona tu condicion para darte prioridad</p>
          <div className="prioridad-grid">
            {CONDICIONES_PRIORITARIAS.map((c) => (
              <button
                key={c}
                className="prioridad-tile"
                type="button"
                disabled={busy}
                onClick={() => sacarTurno({ prioritario: true, condicion: c })}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            className="primary-button large"
            type="button"
            disabled={busy}
            onClick={() => sacarTurno()}
          >
            No requiero prioridad · Sacar turno
          </button>
          <p className="kiosko-consent">
            Al generar tu turno autorizas el tratamiento de tus datos personales por
            Comfaguajira conforme a la Ley 1581 de 2012 y su politica de privacidad.
          </p>
          {error && <p className="turnero-error" role="alert">{error}</p>}
        </div>
      )}

      {step === 'ticket' && ticket && (
        <div className="kiosko-stage">
          <div className="ticket-card">
            {ticket.condicion && <span className="ticket-priority">Prioritario · {ticket.condicion}</span>}
            <span className="ticket-label">Tu turno es</span>
            <strong className="ticket-number">{ticket.numero}</strong>
            <span className="ticket-service">{ticket.servicio}</span>
            <div className="ticket-meta">
              <div>
                <span>Personas antes que tu</span>
                <strong>{Math.max(0, ticket.posicion - 1)}</strong>
              </div>
              <div>
                <span>Espera estimada</span>
                <strong>{ticket.esperaEstimadaMin} min</strong>
              </div>
            </div>
            <p>Observa la pantalla, pronto te llamaremos.</p>
          </div>
          <button className="primary-button large" type="button" onClick={reset}>
            Listo
          </button>
        </div>
      )}

      <footer className="kiosko-aviso">
        <strong>Proteccion de datos.</strong> Comfaguajira trata tus datos personales
        unicamente para gestionar tu atencion, conforme a la Ley 1581 de 2012 (Habeas Data).
        Consulta la politica de privacidad en nuestros canales oficiales.
      </footer>
    </div>
  )
}
