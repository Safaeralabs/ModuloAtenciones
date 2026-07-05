import { serviceOptions, statusOptions } from '../../mockData'
import { AttentionTable } from '../../components/AttentionTable'

// Contenido de la pestana "Historial" dentro de Inicio (no es una pantalla
// propia: se embebe en Dashboard.jsx junto con Resumen y Ventas).
export function History({ atenciones, onSelect, onCreate }) {
  return (
    <>
      <div className="page-header">
        <p className="form-hint">Consulta y revisa las atenciones registradas.</p>
        <button className="primary-button" type="button" onClick={onCreate}>
          + Nueva atencion
        </button>
      </div>
      <div className="filter-row panel">
        <input placeholder="Buscar por codigo, cedula, nombre..." aria-label="Buscar atenciones" />
        <select defaultValue="todos-estados" aria-label="Filtrar por estado">
          <option value="todos-estados">Todos los estados</option>
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select defaultValue="todos-servicios" aria-label="Filtrar por servicio">
          <option value="todos-servicios">Todos los servicios</option>
          {serviceOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <button className="secondary-button" type="button">
          Limpiar
        </button>
      </div>
      <section className="panel">
        <AttentionTable rows={atenciones} onSelect={onSelect} />
      </section>
    </>
  )
}
