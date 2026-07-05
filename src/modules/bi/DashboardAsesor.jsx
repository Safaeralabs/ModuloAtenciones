import { useEffect, useState } from 'react'
import { getBiAsesor } from '../../api'
import { formatCOP } from '../../utils'
import { RESULTADO_LABELS } from '../../constants'

const SERVICIO_LABELS = { recreacion: 'Recreación', educacion: 'Educación', turismo: 'Turismo' }

// Dashboard individual del asesor (seccion 9.1 del plan). Cada asesor ve solo
// sus propios indicadores, sin importar su tipo (Integral o Comercial).
export function DashboardAsesor() {
  const [bi, setBi] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getBiAsesor()
      .then(setBi)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return null
  if (!bi) return null

  const deltaVentas = bi.ventasMesActual - bi.ventasMesAnterior
  const maxServicio = Math.max(1, ...bi.ventasPorServicio.map((s) => s.total))

  return (
    <>
      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Atenciones hoy</span>
          <strong>{bi.atencionesHoy}</strong>
          <small>Registradas hoy</small>
        </article>
        <article className="metric-card">
          <span className="metric-label">Atenciones esta semana</span>
          <strong>{bi.atencionesSemana}</strong>
          <small>Semana en curso</small>
        </article>
        <article className="metric-card">
          <span className="metric-label">Atenciones este mes</span>
          <strong>{bi.atencionesMes}</strong>
          <small>Mes en curso</small>
        </article>
        <article className={`metric-card ${deltaVentas >= 0 ? 'green' : 'red'}`}>
          <span className="metric-label">Mis ventas del mes</span>
          <strong>{formatCOP(bi.ventasMesActual)}</strong>
          <small>{deltaVentas >= 0 ? '+' : ''}{formatCOP(deltaVentas)} vs mes anterior</small>
        </article>
      </div>

      {(bi.ventasPorServicio.length > 0 || bi.resultadoAtenciones.length > 0) && (
        <div className="chart-grid">
          {bi.ventasPorServicio.length > 0 && (
            <section className="panel chart-card">
              <h3>Mis ventas por servicio</h3>
              <div className="bars">
                {bi.ventasPorServicio.map((s) => (
                  <div key={s.servicio} className="bar-group">
                    <span className="bar-value">{formatCOP(s.total)}</span>
                    <div className="bar-track">
                      <span className="bar-fill" style={{ height: `${(s.total / maxServicio) * 100}%` }} />
                    </div>
                    <span className="bar-axis-label">{SERVICIO_LABELS[s.servicio] || s.servicio}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {bi.resultadoAtenciones.length > 0 && (
            <section className="panel chart-card">
              <h3>Resultado de mis atenciones</h3>
              <div className="detail-list">
                {bi.resultadoAtenciones.map((r) => (
                  <div key={r.resultado} className="detail-item">
                    <span>{RESULTADO_LABELS[r.resultado] || r.resultado}</span>
                    <strong>{r.total}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}
