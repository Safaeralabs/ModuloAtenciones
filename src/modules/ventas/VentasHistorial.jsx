import { useEffect, useMemo, useState } from 'react'
import { getVentas, getServiciosCatalogo, getUsuariosOpciones, descargarExportacion } from '../../api'
import { formatCOP } from '../../utils'

const esSupervisor = (user) => user?.rol === 'coordinador' || user?.rol === 'admin'

function inicioFinMesActual() {
  const now = new Date()
  const desde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { desde, hasta }
}

export function VentasHistorial({ user, onCreate, onSelect }) {
  const [ventas, setVentas] = useState([])
  const [servicios, setServicios] = useState([])
  const [asesores, setAsesores] = useState([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [filtros, setFiltros] = useState(() => ({ ...inicioFinMesActual(), servicio: '', asesor: '', q: '' }))

  useEffect(() => {
    getServiciosCatalogo().then((d) => setServicios(d.servicios || [])).catch(() => {})
    if (esSupervisor(user)) {
      getUsuariosOpciones().then((d) => setAsesores(d.usuarios || [])).catch(() => {})
    }
  }, [user])

  const cargar = () => {
    setCargando(true)
    setError('')
    getVentas(filtros)
      .then((d) => setVentas(d.ventas || []))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  const setFiltro = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }))

  const totalMesActual = useMemo(() => {
    const { desde, hasta } = inicioFinMesActual()
    return ventas
      .filter((v) => v.estado === 'activa' && v.fechaServicio >= desde && v.fechaServicio <= hasta)
      .reduce((sum, v) => sum + v.valorTotal, 0)
  }, [ventas])

  return (
    <>
      <div className="page-header">
        <p className="form-hint">Consulta y filtra las ventas registradas por el equipo comercial.</p>
        <div className="button-row">
          {esSupervisor(user) && (
            <button className="secondary-button" type="button" onClick={() => descargarExportacion('ventas', filtros)}>
              Exportar a Excel
            </button>
          )}
          <button className="primary-button" type="button" onClick={onCreate}>
            + Nueva venta
          </button>
        </div>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Total del mes en curso</span>
          <strong>{formatCOP(totalMesActual)}</strong>
          <small>Suma de ventas activas del periodo filtrado</small>
        </article>
      </div>

      <div className="filter-row panel">
        <input type="date" value={filtros.desde} onChange={setFiltro('desde')} aria-label="Fecha desde" />
        <input type="date" value={filtros.hasta} onChange={setFiltro('hasta')} aria-label="Fecha hasta" />
        <select value={filtros.servicio} onChange={setFiltro('servicio')} aria-label="Filtrar por servicio">
          <option value="">Todos los servicios</option>
          {servicios.map((s) => (
            <option key={s.codigo} value={s.codigo}>{s.nombre}</option>
          ))}
        </select>
        {esSupervisor(user) && (
          <select value={filtros.asesor} onChange={setFiltro('asesor')} aria-label="Filtrar por asesor">
            <option value="">Todos los asesores</option>
            {asesores.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        )}
        <input
          placeholder="Buscar por cedula o nombre..."
          value={filtros.q}
          onChange={setFiltro('q')}
          aria-label="Buscar ventas"
        />
      </div>

      {error && <p className="turnero-error" role="alert">{error}</p>}

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Fecha servicio</th>
                <th scope="col">Cliente</th>
                <th scope="col">Servicio</th>
                <th scope="col">Actividad</th>
                <th scope="col">Valor total</th>
                <th scope="col">Pago</th>
                {esSupervisor(user) && <th scope="col">Vendedor</th>}
                <th scope="col">Estado</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {!cargando && ventas.length === 0 && (
                <tr>
                  <td colSpan={esSupervisor(user) ? 9 : 8}>Sin ventas registradas en el periodo filtrado.</td>
                </tr>
              )}
              {ventas.map((v) => (
                <tr key={v.id} className={v.estado === 'anulada' ? 'row-inactivo' : ''}>
                  <td>{v.fechaServicio}</td>
                  <td>{v.nombreCliente}</td>
                  <td>{v.servicio}</td>
                  <td>{v.actividad}</td>
                  <td>{formatCOP(v.valorTotal)}</td>
                  <td>{v.tipoPago === 'contado' ? 'Contado' : 'Credito'}</td>
                  {esSupervisor(user) && <td>{v.vendedorNombre}</td>}
                  <td>
                    <span className={`status-pill ${v.estado === 'activa' ? 'Cerrada' : 'Escalada'}`}>
                      {v.estado === 'activa' ? 'Activa' : 'Anulada'}
                    </span>
                  </td>
                  <td>
                    <button className="icon-button action-link" type="button" onClick={() => onSelect(v.id)}>
                      Ver &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
