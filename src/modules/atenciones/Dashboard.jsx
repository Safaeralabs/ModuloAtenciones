import { TurneroPanel } from '../turnero/TurneroPanel'
import { DashboardAsesor } from '../bi/DashboardAsesor'
import { History } from './History'
import { VentasHistorial } from '../ventas/VentasHistorial'
import { PageHeader } from '../../components/PageHeader'
import { rolesConVentas } from '../../constants'

const TABS_BASE = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'historial', label: 'Historial' },
]

// Inicio consolidado: Resumen, Historial y Ventas viven como pestanas de una
// sola pantalla en vez de pantallas separadas (pedido explicito del usuario:
// "que historial, ventas, inicio esten en el mismo espacio, bien estructurado").
export function Dashboard({
  user,
  atenciones,
  activeTab,
  onChangeTab,
  onNewAttention,
  onOpenDetail,
  onRegistrarTurno,
  onNewVenta,
  onOpenVentaDetail,
}) {
  const primerNombre = (user?.nombre || '').split(' ')[0] || 'asesor'
  const puedeVerVentas = rolesConVentas.has(user?.rol)
  const tabs = puedeVerVentas ? [...TABS_BASE, { key: 'ventas', label: 'Ventas' }] : TABS_BASE
  const tab = tabs.some((t) => t.key === activeTab) ? activeTab : 'resumen'

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Inicio"
        title={`Hola, ${primerNombre}!`}
        description={`Tu resumen, historial de atenciones${puedeVerVentas ? ' y ventas' : ''} en un solo lugar.`}
      />

      <div className="tab-row" role="tablist" aria-label="Secciones de inicio">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`tab-button ${tab === t.key ? 'active' : ''}`}
            type="button"
            onClick={() => onChangeTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <>
          <TurneroPanel onRegistrar={onRegistrarTurno} />
          <DashboardAsesor />
        </>
      )}

      {tab === 'historial' && (
        <History atenciones={atenciones} onCreate={onNewAttention} onSelect={onOpenDetail} />
      )}

      {tab === 'ventas' && puedeVerVentas && (
        <VentasHistorial user={user} onCreate={onNewVenta} onSelect={onOpenVentaDetail} />
      )}
    </section>
  )
}
