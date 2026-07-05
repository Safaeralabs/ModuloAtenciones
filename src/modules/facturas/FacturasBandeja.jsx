import { useEffect, useState } from 'react'
import { getFacturas, getCatalogo, getUsuariosOpciones, asignarResponsableFactura, actualizarFactura, descargarExportacion } from '../../api'
import { formatCOP } from '../../utils'
import { PageHeader } from '../../components/PageHeader'

const esSupervisor = (user) => user?.rol === 'coordinador' || user?.rol === 'admin'

export function FacturasBandeja({ user, onCreate }) {
  const [facturas, setFacturas] = useState([])
  const [estados, setEstados] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [error, setError] = useState('')

  const cargar = () => {
    setError('')
    getFacturas(filtroEstado ? { estadoGestion: filtroEstado } : {})
      .then((d) => setFacturas(d.facturas || []))
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    getCatalogo('estado_gestion_factura').then((d) => setEstados(d.items || [])).catch(() => {})
    if (esSupervisor(user)) {
      getUsuariosOpciones().then((d) => setUsuarios(d.usuarios || [])).catch(() => {})
    }
  }, [user])

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado])

  const asignar = async (id, idResponsable) => {
    if (!idResponsable) return
    setError('')
    try {
      await asignarResponsableFactura(id, Number(idResponsable))
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const cambiarEstadoGestion = async (id, estadoGestion) => {
    setError('')
    try {
      await actualizarFactura(id, { estadoGestion })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const sinAsignar = facturas.filter((f) => f.estadoGestion === 'sin_asignar').length
  const asignadasPendientes = facturas.filter((f) => f.estadoGestion === 'asignada').length

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Inicio / Facturas"
        title="Control de Facturaciones"
        description="Bandeja de facturas: quien responde por cada una y en que estado esta."
        actions={
          <>
            {esSupervisor(user) && (
              <button className="secondary-button" type="button" onClick={() => descargarExportacion('facturas', filtroEstado ? { estadoGestion: filtroEstado } : {})}>
                Exportar a Excel
              </button>
            )}
            <button className="primary-button" type="button" onClick={onCreate}>
              + Registrar factura
            </button>
          </>
        }
      />

      <div className="metric-grid">
        <article className="metric-card amber">
          <span className="metric-label">Sin asignar</span>
          <strong>{sinAsignar}</strong>
          <small>Necesitan responsable</small>
        </article>
        <article className="metric-card blue">
          <span className="metric-label">Asignadas pendientes</span>
          <strong>{asignadasPendientes}</strong>
          <small>En gestion</small>
        </article>
      </div>

      <div className="filter-row panel">
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar por estado de gestion">
          <option value="">Todos los estados</option>
          {estados.map((e) => (
            <option key={e.codigo} value={e.codigo}>{e.nombre}</option>
          ))}
        </select>
      </div>

      {error && <p className="turnero-error" role="alert">{error}</p>}

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Numero factura</th>
                <th scope="col">Cliente</th>
                <th scope="col">Valor</th>
                <th scope="col">Registrada por</th>
                <th scope="col">Responsable</th>
                <th scope="col">Estado de gestion</th>
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 && (
                <tr>
                  <td colSpan={6}>Sin facturas registradas con este filtro.</td>
                </tr>
              )}
              {facturas.map((f) => (
                <tr key={f.id}>
                  <td className="code-cell">{f.numeroFactura}</td>
                  <td>{f.cedulaCliente}</td>
                  <td>{formatCOP(f.valorFactura)}</td>
                  <td>{f.registradorNombre}</td>
                  <td>
                    {esSupervisor(user) ? (
                      <select
                        value={f.idResponsable || ''}
                        onChange={(e) => asignar(f.id, e.target.value)}
                        aria-label={`Responsable de factura ${f.numeroFactura}`}
                      >
                        <option value="">Sin asignar</option>
                        {usuarios.map((u) => (
                          <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      f.responsableNombre || 'Sin asignar'
                    )}
                  </td>
                  <td>
                    {esSupervisor(user) || f.idResponsable === user?.id ? (
                      <select
                        value={f.estadoGestion}
                        onChange={(e) => cambiarEstadoGestion(f.id, e.target.value)}
                        aria-label={`Estado de gestion de factura ${f.numeroFactura}`}
                      >
                        {estados.map((e) => (
                          <option key={e.codigo} value={e.codigo}>{e.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="status-pill Pendiente">{f.estadoGestion}</span>
                    )}
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
