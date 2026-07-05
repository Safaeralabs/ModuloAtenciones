import { useEffect, useState } from 'react'
import { llamarSiguiente, rellamarTurno, marcarAusente, suscribir } from '../../api'
import { MODULOS } from '../../constants'

// --- Turnero: panel del asesor dentro del dashboard ---
export function TurneroPanel({ onRegistrar }) {
  const [estado, setEstado] = useState(null)
  const [modulo, setModulo] = useState(() => window.localStorage.getItem('turnero-modulo') || '1')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => suscribir((ev) => setEstado(ev.estado)), [])

  const cambiarModulo = (value) => {
    setModulo(value)
    window.localStorage.setItem('turnero-modulo', value)
  }

  const miTurno = (estado?.turns || [])
    .filter((t) => t.estado === 'llamado' && String(t.modulo) === String(modulo))
    .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0))[0]

  const onLlamar = async () => {
    setError('')
    setBusy(true)
    try {
      await llamarSiguiente({ modulo: Number(modulo) })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const runAccion = async (accion) => {
    if (!miTurno) return
    setError('')
    setBusy(true)
    try {
      await accion(miTurno.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const enEspera = estado?.enEspera ?? 0
  const prioritariosEnEspera = (estado?.turns || []).filter(
    (t) => t.estado === 'espera' && t.prioritario,
  ).length

  return (
    <section className="panel turnero-panel">
      <div className="panel-header">
        <h3>Turnero</h3>
        <div className="espera-chips">
          {prioritariosEnEspera > 0 && (
            <span className="espera-chip prioridad">{prioritariosEnEspera} prioritario{prioritariosEnEspera > 1 ? 's' : ''}</span>
          )}
          <span className={`espera-chip ${enEspera > 0 ? 'active' : ''}`}>
            {enEspera} en espera
          </span>
        </div>
      </div>
      <div className="turnero-control">
        <label className="modulo-select">
          Mi modulo
          <select value={modulo} onChange={(e) => cambiarModulo(e.target.value)}>
            {MODULOS.map((m) => (
              <option key={m} value={m}>
                Modulo {m}
              </option>
            ))}
          </select>
        </label>
        <button
          className="primary-button"
          type="button"
          onClick={onLlamar}
          disabled={busy || enEspera === 0}
        >
          Llamar siguiente
        </button>
        {miTurno ? (
          <div className={`atendiendo ${miTurno.prioritario ? 'prioritario' : ''}`}>
            <div className="atendiendo-info">
              <span>En atencion {miTurno.prioritario ? `· ${miTurno.condicion}` : ''}</span>
              <strong>{miTurno.numero}</strong>
              <small>{miTurno.servicio}</small>
            </div>
            <div className="atendiendo-acciones">
              <button className="secondary-button compact-button" type="button" onClick={() => runAccion(rellamarTurno)} disabled={busy}>
                Rellamar
              </button>
              <button className="secondary-button compact-button" type="button" onClick={() => runAccion(marcarAusente)} disabled={busy}>
                Ausente
              </button>
              <button
                className="primary-button compact-button"
                type="button"
                disabled={busy}
                onClick={() => onRegistrar({
                  turnoId: miTurno.id,
                  numero: miTurno.numero,
                  modulo: miTurno.modulo,
                  document: miTurno.cedula,
                  service: miTurno.servicio,
                  prioritario: miTurno.prioritario,
                  condicion: miTurno.condicion,
                })}
              >
                Registrar atencion
              </button>
            </div>
          </div>
        ) : (
          <div className="atendiendo vacio">
            <span>Sin turno en tu modulo</span>
          </div>
        )}
      </div>
      {error && <p className="turnero-error" role="alert">{error}</p>}
    </section>
  )
}
