// Encabezado unico para todas las paginas: mismo alto, mismo espaciado,
// mismo lugar para acciones (arriba a la derecha), sin importar si la pagina
// es un listado, un formulario o un detalle.
export function PageHeader({ breadcrumb, title, description, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-title">
        {breadcrumb && <span className="breadcrumb">{breadcrumb}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}
