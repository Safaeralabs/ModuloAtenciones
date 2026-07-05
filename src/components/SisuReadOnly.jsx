import { DetailCard, TextCard } from './DetailCard'
import { dash, siNo, formatCOP } from '../utils'

// Bloque de solo lectura con los datos que trae SISU (afiliado + empresa).
// Incluye el filtro legal: si el afiliado o la empresa no autorizan, no se
// puede hacer mercadeo a tercero.
export function SisuReadOnly({ sisu }) {
  const t = sisu.trabajador || {}
  const e = sisu.empresa || null
  const autoriza = Boolean(t.autorizaCompartir) && (e ? Boolean(e.autorizaCompartir) : true)

  const trabajadorItems = [
    ['Estado', dash(t.estado)],
    ['Categoria', dash(t.categoria)],
    ['Tipo cotizante', dash(t.tipoCotizante)],
    ['Salario', formatCOP(t.salario)],
    ['Nivel educativo', dash(t.nivelEducativo)],
    ['Profesion', dash(t.profesion)],
    ['Sexo', dash(t.sexo)],
    ['Estado civil', dash(t.estadoCivil)],
    ['Edad', t.edad != null ? `${t.edad} anios` : '—'],
    ['Afiliacion', dash(t.fechaAfiliacion)],
    ['Beneficiarios', siNo(t.beneficiarios)],
  ]
  if (t.fechaRetiro) trabajadorItems.push(['Retiro', t.fechaRetiro])

  const empresaItems = e && [
    ['NIT', dash(e.nit)],
    ['Sucursal', dash(e.sucursal)],
    ['Zona', dash(e.zona)],
    ['Estado', dash(e.estado)],
    ['Trabajadores', dash(e.numeroTrabajadores)],
    ['Actividad', dash(e.actividadEconomica)],
  ]

  return (
    <section className="sisu-block">
      <div className="sisu-head">
        <h3>Datos de SISU <span className="sisu-tag">solo lectura</span></h3>
        <span className={`sisu-consent ${autoriza ? 'ok' : 'no'}`}>
          {autoriza ? 'Autoriza compartir a terceros' : 'No autoriza mercadeo'}
        </span>
      </div>
      <div className="field-grid two-cols">
        <DetailCard title="Afiliado" items={trabajadorItems} />
        {empresaItems ? (
          <DetailCard title={`Empresa · ${e.razonSocial || 'Sin razon social'}`} items={empresaItems} />
        ) : (
          <TextCard title="Empresa afiliadora" text="Sin empresa afiliadora asociada." />
        )}
      </div>
    </section>
  )
}
