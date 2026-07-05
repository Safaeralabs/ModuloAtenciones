import { slug } from '../utils'

export function AttentionTable({ rows, onSelect }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Codigo</th>
            <th scope="col">Fecha y hora</th>
            <th scope="col">Cliente</th>
            <th scope="col">Servicio</th>
            <th scope="col">Motivo</th>
            <th scope="col">Estado</th>
            <th scope="col">Asesor</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="code-cell">{row.id}</td>
              <td>{row.date}</td>
              <td>{row.client}</td>
              <td>
                <span className={`tag ${slug(row.service)}`}>{row.service}</span>
              </td>
              <td>{row.motive}</td>
              <td>
                <span className={`status-pill ${row.status}`}>{row.status}</span>
              </td>
              <td>{row.advisor}</td>
              <td>
                <button className="icon-button action-link" type="button" onClick={() => onSelect?.(row)} disabled={!onSelect}>
                  Ver &rarr;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
