import { useEffect, useState } from 'react'
import { getAuditoria } from '../../api'
import { PageHeader } from '../../components/PageHeader'

const TABLA_LABELS = {
  atenciones: 'Atenciones',
  ventas: 'Ventas',
  cotizaciones: 'Cotizaciones',
  facturaciones: 'Facturaciones',
  usuarios: 'Usuarios',
  catalogos: 'Catalogos',
  servicios: 'Servicios',
  actividades: 'Actividades',
}
const ACCION_LABELS = {
  crear: 'Creo',
  editar: 'Edito',
  anular: 'Anulo',
  reactivar: 'Reactivo',
  cambio_estado: 'Cambio estado de',
}

// Vista de auditoria (seccion 14 y F4-5 del plan). El backend ya restringe:
// el coordinador solo ve modulos de negocio, el administrador ve todo
// (incluida la tabla usuarios).
export function AuditoriaAdmin({ user }) {
  const [registros, setRegistros] = useState([])
  const [error, setError] = useState('')
  const [filtros, setFiltros] = useState({ tabla: '', desde: '', hasta: '' })

  const cargar = () => {
    setError('')
    getAuditoria(filtros)
      .then((d) => setRegistros(d.registros || []))
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  const setFiltro = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }))
  const tablasDisponibles = user?.rol === 'admin' ? Object.keys(TABLA_LABELS) : Object.keys(TABLA_LABELS).filter((t) => t !== 'usuarios')

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Inicio / Auditoria"
        title="Auditoria"
        description="Quien cambio que, y cual era el valor anterior."
      />

      <div className="filter-row panel">
        <select value={filtros.tabla} onChange={setFiltro('tabla')} aria-label="Filtrar por tabla">
          <option value="">Todos los modulos</option>
          {tablasDisponibles.map((t) => (
            <option key={t} value={t}>{TABLA_LABELS[t]}</option>
          ))}
        </select>
        <input type="date" value={filtros.desde} onChange={setFiltro('desde')} aria-label="Fecha desde" />
        <input type="date" value={filtros.hasta} onChange={setFiltro('hasta')} aria-label="Fecha hasta" />
      </div>

      {error && <p className="turnero-error" role="alert">{error}</p>}

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Usuario</th>
                <th scope="col">Accion</th>
                <th scope="col">Modulo</th>
                <th scope="col">Registro</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 && (
                <tr><td colSpan={5}>Sin registros de auditoria con estos filtros.</td></tr>
              )}
              {registros.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.createdAt).toLocaleString('es-CO')}</td>
                  <td>{r.usuarioNombre}</td>
                  <td>{ACCION_LABELS[r.accion] || r.accion}</td>
                  <td>{TABLA_LABELS[r.tabla] || r.tabla}</td>
                  <td className="code-cell">#{r.idRegistro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
