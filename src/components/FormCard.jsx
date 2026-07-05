export function FormCard({ title, children }) {
  return (
    <section className="panel form-card">
      <h3>{title}</h3>
      {children}
    </section>
  )
}
