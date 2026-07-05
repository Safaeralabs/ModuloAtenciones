import { useEffect, useState } from 'react'
import { getCotizacion, cambiarEstadoCotizacion, convertirCotizacionEnVenta, getCatalogo } from '../../api'
import { DetailCard, TextCard } from '../../components/DetailCard'
import { PageHeader } from '../../components/PageHeader'
import { formatCOP, dash } from '../../utils'
import { rolesConVentas } from '../../constants'

const esSupervisor = (user) => user?.rol === 'coordinador' || user?.rol === 'admin'

const ESTADO_LABELS = {
  elaborada: 'Elaborada',
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  convertida: 'Convertida',
  vencida: 'Vencida',
}

export function CotizacionDetalle({ cotizacionId, user, onBack, onConvertir }) {
  const [cot, setCot] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mostrarRechazo, setMostrarRechazo] = useState(false)
  const [motivos, setMotivos] = useState([])
  const [motivoElegido, setMotivoElegido] = useState('')

  const cargar = () => {
    setError('')
    getCotizacion(cotizacionId)
      .then(setCot)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    cargar()
    getCatalogo('motivo_rechazo').then((d) => setMotivos(d.items || [])).catch(() => setMotivos([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotizacionId])

  const cambiarEstado = async (estado, motivoRechazo) => {
    setBusy(true)
    setError('')
    try {
      await cambiarEstadoCotizacion(cotizacionId, estado, motivoRechazo)
      setMostrarRechazo(false)
      cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const registrarVenta = async () => {
    setBusy(true)
    setError('')
    try {
      const prefill = await convertirCotizacionEnVenta(cotizacionId)
      onConvertir(prefill)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (error && !cot) return <section className="page"><p className="turnero-error" role="alert">{error}</p></section>
  if (!cot) return <section className="page"><p>Cargando...</p></section>

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Cotizaciones / Detalle"
        title={`Cotizacion de ${cot.nombreCliente}`}
        description={`Elaborada el ${cot.fechaCotizacion} · Ultima gestion: ${cot.fechaUltimaGestion}`}
        actions={
          <span className={`status-pill ${cot.estado === 'aprobada' || cot.estado === 'convertida' ? 'Cerrada' : cot.estado === 'pendiente' || cot.estado === 'elaborada' ? 'Pendiente' : 'Escalada'}`}>
            {ESTADO_LABELS[cot.estado]}
          </span>
        }
      />

      <div className="detail-grid">
        <DetailCard
          title="Cliente"
          items={[
            ['Cedula', cot.cedulaCliente],
            ['Nombre', cot.nombreCliente],
            ['Empresa', dash(cot.empresaCliente)],
            ['Telefono', dash(cot.telefono)],
            ['Correo', dash(cot.correo)],
          ]}
        />
        <DetailCard
          title="Detalle de la cotizacion"
          items={[
            ['Servicio', cot.servicio],
            ['Actividad', cot.actividad],
            ['Valor total', formatCOP(cot.valorTotal)],
            ['Tipo de pago', cot.tipoPago === 'contado' ? 'Contado' : 'Credito'],
            ['Fecha limite de confirmacion', cot.fechaLimiteConfirmacion],
            ['Fecha prevista del servicio', dash(cot.fechaServicio)],
            ['Numero de cotizacion externo', dash(cot.numeroCotizacionExterno)],
            ['Asesor', cot.asesorNombre],
          ]}
        />
        <TextCard title="Descripcion del servicio" text={cot.descripcionServicio} />
        <TextCard title="Observaciones" text={cot.observaciones || 'Sin observaciones.'} />
        {cot.estado === 'rechazada' && (
          <TextCard title="Motivo de rechazo" text={cot.motivoRechazo || 'Sin motivo registrado.'} />
        )}
      </div>

      {error && <p className="turnero-error" role="alert">{error}</p>}

      {mostrarRechazo && (
        <section className="panel form-card">
          <h3>Motivo de rechazo</h3>
          <div className="field-grid">
            <label>
              Motivo <span className="required-mark" aria-hidden="true">*</span>
              <select value={motivoElegido} onChange={(e) => setMotivoElegido(e.target.value)}>
                <option value="" disabled>Selecciona un motivo</option>
                {motivos.map((m) => (
                  <option key={m.codigo} value={m.nombre}>{m.nombre}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="page-actions">
            <button className="secondary-button" type="button" onClick={() => setMostrarRechazo(false)}>
              Cancelar
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={busy || !motivoElegido}
              onClick={() => cambiarEstado('rechazada', motivoElegido)}
            >
              Confirmar rechazo
            </button>
          </div>
        </section>
      )}

      <div className="page-actions split">
        <button className="secondary-button" type="button" onClick={onBack}>
          &larr; Volver a cotizaciones
        </button>
        <div className="button-row">
          {(cot.estado === 'pendiente' || cot.estado === 'elaborada') && (
            <>
              <button className="secondary-button warn" type="button" disabled={busy} onClick={() => setMostrarRechazo(true)}>
                Rechazar
              </button>
              <button className="success-button" type="button" disabled={busy} onClick={() => cambiarEstado('aprobada')}>
                Aprobar
              </button>
            </>
          )}
          {cot.estado === 'aprobada' && rolesConVentas.has(user?.rol) && (
            <button className="primary-button" type="button" disabled={busy} onClick={registrarVenta}>
              Registrar venta
            </button>
          )}
          {cot.estado === 'vencida' && esSupervisor(user) && (
            <button className="secondary-button" type="button" disabled={busy} onClick={() => cambiarEstado('pendiente')}>
              Reactivar
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
