import { useEffect, useRef, useState } from 'react'
import { suscribir } from '../../api'
import { Logo } from '../../components/Logo'
import { serviceColor } from '../../constants'

// --- TV: pantalla de llamado ---
export function TvScreen({ onBack }) {
  const [estado, setEstado] = useState(null)
  const [now, setNow] = useState(new Date())
  const [sound, setSound] = useState(false)
  const soundRef = useRef(false)
  const audioCtxRef = useRef(null)

  const ensureCtx = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    return audioCtxRef.current
  }

  const beep = () => {
    if (!soundRef.current) return
    const ctx = ensureCtx()
    if (!ctx) return
    const tone = (freq, start, dur) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = ctx.currentTime + start
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      osc.start(t0)
      osc.stop(t0 + dur)
    }
    tone(880, 0, 0.18)
    tone(1175, 0.16, 0.28)
  }

  useEffect(() => suscribir((ev) => {
    setEstado(ev.estado)
    // Suena en cada llamado/rellamado; el snapshot inicial no dispara sonido.
    if (ev.type === 'llamado') beep()
  }), [])

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  const activarSonido = () => {
    soundRef.current = true
    setSound(true)
    const ctx = ensureCtx()
    if (ctx && ctx.state === 'suspended') ctx.resume()
  }

  const actual = estado?.ultimoLlamado
  const llamados = (estado?.llamados || []).filter((t) => !actual || t.id !== actual.id)

  return (
    <div className="tv-page">
      <header className="tv-header">
        <Logo onDark />
        <div className="tv-clock">
          <strong>{now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</strong>
          <span>{now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        <div className="tv-actions">
          {!sound && (
            <button className="tv-sound-btn" type="button" onClick={activarSonido}>
              🔊 Activar sonido
            </button>
          )}
          <button className="ghost-link tv-back" type="button" onClick={onBack}>
            Salir
          </button>
        </div>
      </header>

      <main className="tv-main">
        <section className={`tv-current ${actual?.prioritario ? 'prio' : ''}`}>
          {actual ? (
            <div className="tv-current-inner" key={actual.calledAt}>
              <div className="tv-current-head">
                <span className="tv-current-label">Turno</span>
                {actual.prioritario && (
                  <span className="tv-priority-badge">★ Prioritario · {actual.condicion}</span>
                )}
              </div>
              <strong className="tv-current-number">{actual.numero}</strong>
              <span className="tv-current-service" style={{ '--svc': serviceColor(actual.servicio) }}>
                <i aria-hidden="true" />
                {actual.servicio}
              </span>
              <div className="tv-modulo-box">
                <span className="tv-modulo-hint">Dirijase al</span>
                <div className="tv-modulo-row">
                  <svg className="tv-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="4" y1="12" x2="19" y2="12" />
                    <polyline points="13 6 19 12 13 18" />
                  </svg>
                  <span className="tv-modulo-word">Modulo</span>
                  <strong className="tv-modulo-num">{actual.modulo}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="tv-current-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 14" />
              </svg>
              <strong>En espera de llamado</strong>
              <span>El proximo turno aparecera aqui</span>
            </div>
          )}
        </section>

        <aside className="tv-list">
          <h2>Ultimos llamados</h2>
          <div className="tv-list-body">
            {llamados.length === 0 && <p className="tv-empty">Sin llamados aun</p>}
            {llamados.map((t) => (
              <div
                key={t.id}
                className={`tv-row ${t.estado === 'atendido' ? 'done' : ''} ${t.prioritario ? 'prioritario' : ''}`}
                style={{ '--svc': serviceColor(t.servicio) }}
              >
                <div className="tv-row-main">
                  <strong>{t.numero}</strong>
                  <span className="tv-row-service">{t.servicio}</span>
                </div>
                <span className="tv-row-modulo">Mod. {t.modulo}</span>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <footer className="tv-footer">
        <div className="tv-marquee">
          <span>
            Bienvenido a Comfaguajira · Conserva tu turno · Atencion prioritaria para adultos mayores, gestantes y personas con movilidad reducida ·
          </span>
        </div>
        <div className="tv-stats">
          <span>Atendidos hoy <strong>{estado?.atendidosHoy ?? 0}</strong></span>
          <span>En espera <strong>{estado?.enEspera ?? 0}</strong></span>
        </div>
      </footer>
    </div>
  )
}
