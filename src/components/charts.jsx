export function ChartCard({ title, bars }) {
  const max = Math.max(...bars.map((b) => b.value))
  return (
    <section className="panel chart-card">
      <h3>{title}</h3>
      <div className="bars">
        {bars.map((bar, index) => (
          <div key={index} className="bar-group">
            <span className="bar-value">{bar.value}</span>
            <div className="bar-track">
              <span className="bar-fill" style={{ height: `${(bar.value / max) * 100}%` }} />
            </div>
            <span className="bar-axis-label">{bar.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function DonutCard() {
  return (
    <section className="panel chart-card">
      <h3>Estado de atenciones</h3>
      <div className="donut-wrap">
        <div className="donut" role="img" aria-label="Distribucion: 71.5% cerradas, 20.5% pendientes, 8% escaladas" />
        <div className="donut-center">
          <strong>358</strong>
          <span>total</span>
        </div>
      </div>
      <div className="legend">
        <span><i className="blue" aria-hidden="true" /> Cerradas <strong>256</strong></span>
        <span><i className="amber" aria-hidden="true" /> Pendientes <strong>73</strong></span>
        <span><i className="red" aria-hidden="true" /> Escaladas <strong>29</strong></span>
      </div>
    </section>
  )
}

export function LineCard() {
  const points = [
    { x: 24, y: 85, label: 'L', value: 12 },
    { x: 65, y: 60, label: 'M', value: 18 },
    { x: 106, y: 44, label: 'X', value: 22 },
    { x: 147, y: 22, label: 'J', value: 28 },
    { x: 188, y: 55, label: 'V', value: 19 },
    { x: 224, y: 70, label: 'S', value: 15 },
  ]
  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ')
  const areaStr = `${points[0].x},104 ${polylineStr} ${points[points.length - 1].x},104`

  return (
    <section className="panel chart-card">
      <h3>Atenciones por dia</h3>
      <svg viewBox="0 0 248 120" className="line-chart" role="img" aria-label="Grafico de atenciones por dia de la semana">
        {[25, 50, 75].map((y) => (
          <line key={y} x1="10" y1={y} x2="238" y2={y} stroke="#e8eefc" strokeWidth="1" />
        ))}
        <polygon points={areaStr} fill="rgba(22,100,234,0.07)" />
        <polyline fill="none" stroke="#1664ea" strokeWidth="2.5" strokeLinejoin="round" points={polylineStr} />
        {points.map((p) => (
          <g key={p.x}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="#1664ea" strokeWidth="2.5" />
            <text x={p.x} y="116" textAnchor="middle" fontSize="9" fill="#6d789a" fontFamily="inherit">{p.label}</text>
            <title>{p.label}: {p.value} atenciones</title>
          </g>
        ))}
      </svg>
    </section>
  )
}
