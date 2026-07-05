export function DetailCard({ title, items, wide = false }) {
  return (
    <section className={`panel detail-card ${wide ? 'wide' : ''}`}>
      <h3>{title}</h3>
      <div className="detail-list">
        {items.map(([label, value]) => (
          <div key={label} className="detail-item">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

export function TextCard({ title, text }) {
  return (
    <section className="panel detail-card">
      <h3>{title}</h3>
      <p className="text-card-body">{text}</p>
    </section>
  )
}
