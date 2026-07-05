import { attentions, reportCards } from '../../mockData'
import { AttentionTable } from '../../components/AttentionTable'
import { ChartCard, DonutCard, LineCard } from '../../components/charts'
import { PageHeader } from '../../components/PageHeader'

export function Reports({ onSelect }) {
  return (
    <section className="page">
      <PageHeader
        breadcrumb="Inicio / Reportes"
        title="Reportes de atenciones"
        description="Analiza el comportamiento de las atenciones registradas."
        actions={
          <>
            <button className="secondary-button" type="button">Exportar Excel</button>
            <button className="primary-button" type="button">Actualizar</button>
          </>
        }
      />
      <div className="filter-row panel">
        <input type="date" defaultValue="2024-05-01" aria-label="Fecha desde" />
        <input type="date" defaultValue="2024-05-24" aria-label="Fecha hasta" />
        <select defaultValue="todos-asesores" aria-label="Filtrar por asesor">
          <option value="todos-asesores">Todos los asesores</option>
        </select>
        <select defaultValue="todos-servicios" aria-label="Filtrar por servicio">
          <option value="todos-servicios">Todos los servicios</option>
        </select>
      </div>
      <div className="metric-grid four">
        {reportCards.map((item) => (
          <article key={item.label} className={`metric-card ${item.tone}`}>
            <span className="metric-label">{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.helper}</small>
          </article>
        ))}
      </div>
      <div className="chart-grid">
        <ChartCard
          title="Atenciones por asesor"
          bars={[
            { value: 100, label: 'MF' },
            { value: 78, label: 'CA' },
            { value: 63, label: 'JR' },
            { value: 55, label: 'LP' },
            { value: 40, label: 'RG' },
            { value: 22, label: 'ST' },
          ]}
        />
        <ChartCard
          title="Atenciones por servicio"
          bars={[
            { value: 92, label: 'Sub' },
            { value: 68, label: 'Cre' },
            { value: 51, label: 'AI' },
            { value: 33, label: 'Afi' },
            { value: 18, label: 'Mkt' },
            { value: 9, label: 'PQ' },
          ]}
        />
        <DonutCard />
        <LineCard />
      </div>
      <section className="panel">
        <h3>Detalle de atenciones</h3>
        <AttentionTable rows={attentions} onSelect={onSelect} />
      </section>
    </section>
  )
}
