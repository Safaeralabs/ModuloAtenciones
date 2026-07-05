import { useState } from 'react'
import { crearFactura } from '../../api'
import { FormCard } from '../../components/FormCard'
import { PageHeader } from '../../components/PageHeader'

const EMPTY_FORM = {
  numeroFactura: '',
  idVenta: '',
  cedulaCliente: '',
  valorFactura: '',
  observacion: '',
}

export function FacturaForm({ onCancel, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const guardar = async () => {
    setError('')
    if (!form.numeroFactura) {
      setError('El numero de factura es obligatorio.')
      return
    }
    if (!form.idVenta && (!form.cedulaCliente || !(Number(form.valorFactura) > 0))) {
      setError('Si no vinculas una venta, ingresa cedula del cliente y valor de la factura.')
      return
    }
    setSaving(true)
    try {
      await crearFactura({
        numeroFactura: form.numeroFactura,
        idVenta: form.idVenta ? Number(form.idVenta) : null,
        cedulaCliente: form.cedulaCliente || null,
        valorFactura: form.valorFactura ? Number(form.valorFactura) : null,
        observacion: form.observacion,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Facturas / Nueva factura"
        title="Registrar factura"
        description="Solo control y asignacion de responsable: no genera ni integra facturacion contable."
      />
      <FormCard title="Datos de la factura">
        <div className="field-grid">
          <label>
            Numero de factura <span className="required-mark" aria-hidden="true">*</span>
            <input value={form.numeroFactura} onChange={set('numeroFactura')} />
          </label>
          <label>
            ID de venta (opcional)
            <input value={form.idVenta} onChange={set('idVenta')} inputMode="numeric" placeholder="Vincula una venta existente" />
          </label>
          <label>
            Cedula del cliente {!form.idVenta && <span className="required-mark" aria-hidden="true">*</span>}
            <input value={form.cedulaCliente} onChange={set('cedulaCliente')} placeholder="Se toma de la venta si la vinculas" />
          </label>
          <label>
            Valor de la factura {!form.idVenta && <span className="required-mark" aria-hidden="true">*</span>}
            <input type="number" min="0" step="1" value={form.valorFactura} onChange={set('valorFactura')} placeholder="Se toma de la venta si la vinculas" />
          </label>
        </div>
        <label>
          Observaciones
          <textarea rows="3" value={form.observacion} onChange={set('observacion')} />
        </label>
      </FormCard>
      {error && <p className="turnero-error" role="alert">{error}</p>}
      <div className="page-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-button" type="button" onClick={guardar} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar factura'}
        </button>
      </div>
    </section>
  )
}
