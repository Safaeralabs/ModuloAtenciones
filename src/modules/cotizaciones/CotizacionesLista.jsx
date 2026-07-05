import { useEffect, useState } from 'react'
import { getCotizaciones, getUsuariosOpciones, descargarExportacion } from '../../api'
import { formatCOP } from '../../utils'
import { PageHeader } from '../../components/PageHeader'

const esSupervisor = (user) => user?.rol === 'coordinador' || user?.rol === 'admin'

const ESTADO_LABELS = {
  elaborada: 'Elaborada',
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  convertida: 'Convertida',
  vencida: 'Vencida',
}
// Mapea el estado a las clases de pastilla ya definidas en styles.css (status-pill).
const ESTADO_PILL = {
  elaborada: 'Pendiente',
  pendiente: 'Pendiente',
  aprobada: 'Cerrada',
  rechazada: 'Escalada',
  convertida: 'Cerrada',
  vencida: 'Escalada',
}

export function CotizacionesLista({ user, onCreate, onSelect }) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [asesores, setAsesores] = useState([])
  const [error, setError] = useState('')
  const [filtros, setFiltros] = useState({ estado: '', asesor: '', q: '' })

  useEffect(() => {
    if (esSupervisor(user)) {
      getUsuariosOpciones().then((d) => setAsesores(d.usuarios || [])).catch(() => {})
    }
  }, [user])

  const cargar = () => {
    setError('')
    getCotizaciones(filtros)
      .then((d) => setCotizaciones(d.cotizaciones || []))
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  const setFiltro = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }))

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Inicio / Cotizaciones"
        title="Cotizaciones"
        description="Seguimiento del ciclo de vida de cada cotizacion."
        actions={
          <>
            {esSupervisor(user) && (
              <button className="secondary-button" type="button" onClick={() => descargarExportacion('cotizaciones', filtros)}>
                Exportar a Excel
              </button>
            )}
            <button className="primary-button" type="button" onClick={onCreate}>
              + Nueva cotizacion
            </button>
          </>
        }
      />

      <div className="filter-row panel">
        <select value={filtros.estado} onChange={setFiltro('estado')} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
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
          aria-label="Buscar cotizaciones"
        />
      </div>

      {error && <p className="turnero-error" role="alert">{error}</p>}

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Cliente</th>
                <th scope="col">Servicio</th>
                <th scope="col">Valor</th>
                <th scope="col">Fecha limite</th>
                {esSupervisor(user) && <th scope="col">Asesor</th>}
                <th scope="col">Estado</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.length === 0 && (
                <tr>
                  <td colSpan={esSupervisor(user) ? 8 : 7}>Sin cotizaciones registradas con estos filtros.</td>
                </tr>
              )}
              {cotizaciones.map((c) => (
                <tr key={c.id}>
                  <td>{c.fechaCotizacion}</td>
                  <td>{c.nombreCliente}</td>
                  <td>{c.servicio}</td>
                  <td>{formatCOP(c.valorTotal)}</td>
                  <td>{c.fechaLimiteConfirmacion}</td>
                  {esSupervisor(user) && <td>{c.asesorNombre}</td>}
                  <td>
                    <span className={`status-pill ${ESTADO_PILL[c.estado]}`}>{ESTADO_LABELS[c.estado]}</span>
                  </td>
                  <td>
                    <button className="icon-button action-link" type="button" onClick={() => onSelect(c.id)}>
                      Ver &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
