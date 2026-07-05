import { useEffect, useState } from 'react'
import { getBiCoordinador, getServiciosCatalogo, getUsuariosOpciones, descargarExportacion } from '../../api'
import { formatCOP } from '../../utils'
import { RESULTADO_LABELS } from '../../constants'
import { ChartCard } from '../../components/charts'
import { PageHeader } from '../../components/PageHeader'

const ESTADO_LABELS = {
  elaborada: 'Elaborada',
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  convertida: 'Convertida',
  vencida: 'Vencida',
}
// Orden narrativo del embudo (CO-01): elaboradas -> pendientes -> aprobadas -> convertidas.
const ORDEN_FUNNEL = ['elaborada', 'pendiente', 'aprobada', 'convertida']

export function DashboardCoordinador() {
  const [bi, setBi] = useState(null)
  const [servicios, setServicios] = useState([])
  const [asesores, setAsesores] = useState([])
  const [error, setError] = useState('')
  const [filtros, setFiltros] = useState({ asesor: '', servicio: '', actividad: '', desde: '', hasta: '', sede: '' })

  useEffect(() => {
    getServiciosCatalogo().then((d) => setServicios(d.servicios || [])).catch(() => {})
    getUsuariosOpciones().then((d) => setAsesores(d.usuarios || [])).catch(() => {})
  }, [])

  const cargar = () => {
    setError('')
    getBiCoordinador(filtros)
      .then(setBi)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  const setFiltro = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }))

  const actividadesDisponibles = servicios.find((s) => s.codigo === filtros.servicio)?.actividades || []

  if (error) return <section className="page"><p className="turnero-error" role="alert">{error}</p></section>
  if (!bi) return <section className="page"><p>Cargando...</p></section>

  const totalAtenciones = bi.rankingAtenciones.reduce((sum, r) => sum + r.total, 0)
  const maxFunnel = Math.max(1, ...ORDEN_FUNNEL.map((e) => bi.pipelineCotizaciones.find((p) => p.estado === e)?.total || 0))
  const maxRanking = Math.max(1, ...bi.rankingAtenciones.map((r) => r.total))

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Inicio / BI Consolidado"
        title="Dashboard consolidado"
        description="Indicadores de todo el equipo de Mercadeo Estrategico."
        actions={
          <button className="secondary-button" type="button" onClick={() => descargarExportacion('bi-coordinador', filtros)}>
            Exportar a Excel
          </button>
        }
      />

      <div className="filter-row panel">
        <select value={filtros.asesor} onChange={setFiltro('asesor')} aria-label="Filtrar por asesor">
          <option value="">Todos los asesores</option>
          {asesores.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        <select
          value={filtros.servicio}
          onChange={(e) => setFiltros((f) => ({ ...f, servicio: e.target.value, actividad: '' }))}
          aria-label="Filtrar por servicio"
        >
          <option value="">Todos los servicios</option>
          {servicios.map((s) => (
            <option key={s.codigo} value={s.codigo}>{s.nombre}</option>
          ))}
        </select>
        <select value={filtros.actividad} onChange={setFiltro('actividad')} disabled={!filtros.servicio} aria-label="Filtrar por actividad">
          <option value="">Todas las actividades</option>
          {actividadesDisponibles.map((a) => (
            <option key={a.codigo} value={a.codigo}>{a.nombre}</option>
          ))}
        </select>
        <input type="date" value={filtros.desde} onChange={setFiltro('desde')} aria-label="Fecha desde" />
        <input type="date" value={filtros.hasta} onChange={setFiltro('hasta')} aria-label="Fecha hasta" />
      </div>

      <div className="metric-grid">
        <article className="metric-card blue">
          <span className="metric-label">Total atenciones</span>
          <strong>{totalAtenciones}</strong>
          <small>En el periodo filtrado</small>
        </article>
        <article className="metric-card green">
          <span className="metric-label">Ventas totales</span>
          <strong>{formatCOP(bi.ventasTotales)}</strong>
          <small>En el periodo filtrado</small>
        </article>
        <article className="metric-card amber">
          <span className="metric-label">Cotizaciones vencidas sin gestion</span>
          <strong>{bi.vencidasSinGestion.length}</strong>
          <small>Requieren seguimiento</small>
        </article>
      </div>

      <div className="chart-grid">
        {bi.rankingAtenciones.length > 0 && (
          <ChartCard
            title="Ranking de atenciones por asesor"
            bars={bi.rankingAtenciones.slice(0, 8).map((r) => ({ value: r.total, label: r.asesor.split(' ')[0] }))}
          />
        )}

        <section className="panel chart-card">
          <h3>Pipeline de cotizaciones</h3>
          <div className="detail-list">
            {ORDEN_FUNNEL.map((estado) => {
              const item = bi.pipelineCotizaciones.find((p) => p.estado === estado)
              const total = item?.total || 0
              return (
                <div key={estado} className="detail-item">
                  <span>{ESTADO_LABELS[estado]}</span>
                  <strong>
                    {total} · {formatCOP(item?.valor || 0)}
                  </strong>
                  <div className="funnel-bar-track">
                    <span className="funnel-bar-fill" style={{ width: `${(total / maxFunnel) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <section className="panel">
        <h3>Tasa de conversion por asesor</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Asesor</th>
                <th scope="col">Cotizaciones elaboradas</th>
                <th scope="col">Convertidas</th>
                <th scope="col">Tasa de conversion</th>
              </tr>
            </thead>
            <tbody>
              {bi.conversionPorAsesor.length === 0 && (
                <tr><td colSpan={4}>Sin cotizaciones en el periodo filtrado.</td></tr>
              )}
              {bi.conversionPorAsesor.map((c) => (
                <tr key={c.asesor}>
                  <td>{c.asesor}</td>
                  <td>{c.totalElaboradas}</td>
                  <td>{c.totalConvertidas}</td>
                  <td>{(c.tasa * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Ventas por servicio y actividad</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Servicio</th>
                <th scope="col">Actividad</th>
                <th scope="col">Total vendido</th>
              </tr>
            </thead>
            <tbody>
              {bi.ventasPorServicioActividad.length === 0 && (
                <tr><td colSpan={3}>Sin ventas en el periodo filtrado.</td></tr>
              )}
              {bi.ventasPorServicioActividad.map((v) => (
                <tr key={`${v.servicio}-${v.actividad}`}>
                  <td>{v.servicio}</td>
                  <td>{v.actividad}</td>
                  <td>{formatCOP(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Ticket promedio por asesor y servicio</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Asesor</th>
                <th scope="col">Servicio</th>
                <th scope="col">Ticket promedio</th>
                <th scope="col">Cantidad de ventas</th>
              </tr>
            </thead>
            <tbody>
              {bi.ticketPromedio.length === 0 && (
                <tr><td colSpan={4}>Sin ventas en el periodo filtrado.</td></tr>
              )}
              {bi.ticketPromedio.map((t) => (
                <tr key={`${t.asesor}-${t.servicio}`}>
                  <td>{t.asesor}</td>
                  <td>{t.servicio}</td>
                  <td>{formatCOP(t.promedio)}</td>
                  <td>{t.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Cotizaciones rechazadas y motivos (analisis de perdida)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Motivo</th>
                <th scope="col">Cantidad</th>
                <th scope="col">Valor perdido</th>
              </tr>
            </thead>
            <tbody>
              {bi.rechazosPorMotivo.length === 0 && (
                <tr><td colSpan={3}>Sin cotizaciones rechazadas en el periodo filtrado.</td></tr>
              )}
              {bi.rechazosPorMotivo.map((r) => (
                <tr key={r.motivo}>
                  <td>{r.motivo}</td>
                  <td>{r.total}</td>
                  <td>{formatCOP(r.valorPerdido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Alertas: cotizaciones vencidas sin gestion</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Valor</th>
                <th scope="col">Fecha limite</th>
                <th scope="col">Asesor</th>
              </tr>
            </thead>
            <tbody>
              {bi.vencidasSinGestion.length === 0 && (
                <tr><td colSpan={4}>Sin cotizaciones vencidas pendientes de gestion.</td></tr>
              )}
              {bi.vencidasSinGestion.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombreCliente}</td>
                  <td>{formatCOP(c.valorTotal)}</td>
                  <td>{c.fechaLimiteConfirmacion}</td>
                  <td>{c.asesor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Atenciones por servicio y resultado</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Servicio (ventanilla)</th>
                <th scope="col">Resultado</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {bi.atencionesPorServicioResultado.length === 0 && (
                <tr><td colSpan={3}>Sin atenciones con resultado registrado en el periodo filtrado.</td></tr>
              )}
              {bi.atencionesPorServicioResultado.map((r) => (
                <tr key={`${r.servicio}-${r.resultado}`}>
                  <td>{r.servicio}</td>
                  <td>{RESULTADO_LABELS[r.resultado] || r.resultado}</td>
                  <td>{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
