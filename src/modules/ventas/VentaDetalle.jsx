import { useEffect, useState } from 'react'
import { getVenta, anularVenta } from '../../api'
import { DetailCard, TextCard } from '../../components/DetailCard'
import { PageHeader } from '../../components/PageHeader'
import { formatCOP, dash } from '../../utils'

const esSupervisor = (user) => user?.rol === 'coordinador' || user?.rol === 'admin'

export function VentaDetalle({ ventaId, user, onBack }) {
  const [venta, setVenta] = useState(null)
  const [error, setError] = useState('')

  const cargar = () => {
    setError('')
    getVenta(ventaId)
      .then(setVenta)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventaId])

  const anular = async () => {
    const motivo = window.prompt('Motivo de anulacion:')
    if (!motivo) return
    try {
      await anularVenta(ventaId, motivo)
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  if (error) return <section className="page"><p className="turnero-error" role="alert">{error}</p></section>
  if (!venta) return <section className="page"><p>Cargando...</p></section>

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Ventas / Detalle"
        title={`Venta de ${venta.nombreCliente}`}
        description={`Registrada el ${venta.fechaRegistro}`}
        actions={
          <span className={`status-pill ${venta.estado === 'activa' ? 'Cerrada' : 'Escalada'}`}>
            {venta.estado === 'activa' ? 'Activa' : 'Anulada'}
          </span>
        }
      />
      <div className="detail-grid">
        <DetailCard
          title="Cliente"
          items={[
            ['Cedula', venta.cedulaCliente],
            ['Nombre', venta.nombreCliente],
            ['Telefono', dash(venta.telefono)],
            ['Correo', dash(venta.correo)],
            ['Categoria', venta.categoria],
          ]}
        />
        <DetailCard
          title="Detalle de la venta"
          items={[
            ['Servicio', venta.servicio],
            ['Actividad', venta.actividad],
            ['Lugar de prestacion', venta.lugarPrestacion],
            ['Fecha del servicio', venta.fechaServicio],
            ['Valor unitario', formatCOP(venta.valorUnitario)],
            ['Cantidad', venta.cantidad],
            ['Valor total', formatCOP(venta.valorTotal)],
            ['Tipo de pago', venta.tipoPago === 'contado' ? 'Contado' : 'Credito'],
            ['Vendedor', venta.vendedorNombre],
          ]}
        />
        <DetailCard
          title="Facturacion"
          items={[
            ['Numero de factura', dash(venta.numeroFactura)],
            ['Responsable', dash(venta.responsableFacturaNombre)],
            ['Numero de aprobado', dash(venta.numeroAprobado)],
          ]}
        />
        <TextCard title="Observaciones" text={venta.observacion || 'Sin observaciones.'} />
      </div>
      <div className="page-actions split">
        <button className="secondary-button" type="button" onClick={onBack}>
          &larr; Volver al historial
        </button>
        {esSupervisor(user) && venta.estado === 'activa' && (
          <button className="danger-button" type="button" onClick={anular}>
            Anular venta
          </button>
        )}
      </div>
    </section>
  )
}
