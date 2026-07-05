import { useEffect, useMemo, useState } from 'react'
import { buscarCliente, crearCotizacion, getServiciosCatalogo } from '../../api'
import { FormCard } from '../../components/FormCard'
import { PageHeader } from '../../components/PageHeader'

const EMPTY_FORM = {
  numeroCotizacionExterno: '',
  cedulaCliente: '',
  nombreCliente: '',
  empresaCliente: '',
  telefono: '',
  correo: '',
  servicio: '',
  actividad: '',
  descripcionServicio: '',
  fechaLimiteConfirmacion: '',
  fechaServicio: '',
  valorTotal: '',
  tipoPago: '',
  observaciones: '',
}

export function CotizacionForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    cedulaCliente: initial?.cedula || '',
    nombreCliente: initial?.nombre || '',
    telefono: initial?.telefono || '',
    correo: initial?.correo || '',
    servicio: initial?.servicio || '',
  }))
  const [servicios, setServicios] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [clienteInfo, setClienteInfo] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getServiciosCatalogo().then((d) => setServicios(d.servicios || [])).catch(() => setServicios([]))
  }, [])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const actividadesDisponibles = useMemo(() => {
    const servicio = servicios.find((s) => s.codigo === form.servicio)
    return servicio?.actividades || []
  }, [servicios, form.servicio])

  const setServicio = (e) => {
    const servicio = e.target.value
    setForm((f) => ({
      ...f,
      servicio,
      actividad: servicios.find((s) => s.codigo === servicio)?.actividades.some((a) => a.codigo === f.actividad)
        ? f.actividad
        : '',
    }))
  }

  const buscarPorCedula = async () => {
    const cedula = form.cedulaCliente.trim()
    if (!cedula) {
      setClienteInfo({ tipo: 'notfound', texto: 'Ingresa una cedula para buscar.' })
      return
    }
    setBuscando(true)
    setClienteInfo(null)
    try {
      const res = await buscarCliente(cedula)
      if (res.encontrado && res.cliente) {
        setForm((f) => ({
          ...f,
          nombreCliente: f.nombreCliente || res.cliente.client || '',
          telefono: f.telefono || res.cliente.phone || '',
          correo: f.correo || res.cliente.email || '',
        }))
        const origen = res.fuente === 'sisu' ? 'SISU' : 'atenciones previas'
        setClienteInfo({ tipo: 'found', texto: `Cliente encontrado en ${origen}. Verifica los datos.` })
      } else {
        setClienteInfo({ tipo: 'notfound', texto: 'Cliente no registrado en SISU. Completa los datos manualmente.' })
      }
    } catch {
      setClienteInfo({ tipo: 'notfound', texto: 'No se pudo consultar SISU. Completa los datos manualmente.' })
    } finally {
      setBuscando(false)
    }
  }

  const guardar = async () => {
    setError('')
    if (!form.cedulaCliente || !form.nombreCliente || !form.servicio || !form.actividad || !form.descripcionServicio || !form.fechaLimiteConfirmacion || !form.tipoPago) {
      setError('Completa cedula, nombre, servicio, actividad, descripcion, fecha limite y tipo de pago.')
      return
    }
    if (!(Number(form.valorTotal) > 0)) {
      setError('El valor total debe ser mayor a cero.')
      return
    }
    setSaving(true)
    try {
      await crearCotizacion({
        codigoAtencion: initial?.codigoAtencion || null,
        numeroCotizacionExterno: form.numeroCotizacionExterno,
        cedulaCliente: form.cedulaCliente,
        nombreCliente: form.nombreCliente,
        empresaCliente: form.empresaCliente,
        telefono: form.telefono,
        correo: form.correo,
        servicio: form.servicio,
        actividad: form.actividad,
        descripcionServicio: form.descripcionServicio,
        fechaLimiteConfirmacion: form.fechaLimiteConfirmacion,
        fechaServicio: form.fechaServicio || null,
        valorTotal: Number(form.valorTotal),
        tipoPago: form.tipoPago,
        observaciones: form.observaciones,
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
        breadcrumb="Cotizaciones / Nueva cotizacion"
        title="Registrar nueva cotizacion"
        description="Queda con seguimiento automatico hasta que se apruebe, rechace o venza."
      />
      <div className="form-stack">
        <FormCard title="Datos del cliente">
          <div className="field-grid">
            <label>
              Cedula <span className="required-mark" aria-hidden="true">*</span>
              <div className="input-with-action">
                <input
                  value={form.cedulaCliente}
                  onChange={set('cedulaCliente')}
                  inputMode="numeric"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      buscarPorCedula()
                    }
                  }}
                />
                <button type="button" className="secondary-button" onClick={buscarPorCedula} disabled={buscando}>
                  {buscando ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </label>
            <label>
              Nombre completo <span className="required-mark" aria-hidden="true">*</span>
              <input value={form.nombreCliente} onChange={set('nombreCliente')} />
            </label>
            <label>
              Empresa (si aplica)
              <input value={form.empresaCliente} onChange={set('empresaCliente')} placeholder="Ej. cotizacion empresarial" />
            </label>
            <label>
              Telefono
              <input value={form.telefono} onChange={set('telefono')} inputMode="tel" />
            </label>
            <label>
              Correo
              <input type="email" value={form.correo} onChange={set('correo')} />
            </label>
          </div>
          {clienteInfo && (
            <p className={`cliente-aviso cliente-aviso-${clienteInfo.tipo}`} role="status">
              {clienteInfo.texto}
            </p>
          )}
        </FormCard>

        <FormCard title="Detalle de la cotizacion">
          <div className="field-grid">
            <label>
              Servicio <span className="required-mark" aria-hidden="true">*</span>
              <select value={form.servicio} onChange={setServicio}>
                <option value="" disabled>Selecciona un servicio</option>
                {servicios.map((s) => (
                  <option key={s.codigo} value={s.codigo}>{s.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Actividad <span className="required-mark" aria-hidden="true">*</span>
              <select value={form.actividad} onChange={set('actividad')} disabled={!form.servicio}>
                <option value="" disabled>Selecciona una actividad</option>
                {actividadesDisponibles.map((a) => (
                  <option key={a.codigo} value={a.codigo}>{a.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Numero de cotizacion externo
              <input value={form.numeroCotizacionExterno} onChange={set('numeroCotizacionExterno')} placeholder="Si aplica, para cruce" />
            </label>
            <label>
              Fecha limite de confirmacion <span className="required-mark" aria-hidden="true">*</span>
              <input type="date" value={form.fechaLimiteConfirmacion} onChange={set('fechaLimiteConfirmacion')} />
            </label>
            <label>
              Fecha prevista del servicio
              <input type="date" value={form.fechaServicio} onChange={set('fechaServicio')} />
            </label>
            <label>
              Valor total <span className="required-mark" aria-hidden="true">*</span>
              <input type="number" min="0" step="1" value={form.valorTotal} onChange={set('valorTotal')} />
            </label>
            <label>
              Tipo de pago <span className="required-mark" aria-hidden="true">*</span>
              <select value={form.tipoPago} onChange={set('tipoPago')}>
                <option value="" disabled>Selecciona el tipo de pago</option>
                <option value="contado">Contado</option>
                <option value="credito">Credito</option>
              </select>
            </label>
          </div>
          <label>
            Descripcion del servicio o evento <span className="required-mark" aria-hidden="true">*</span>
            <textarea rows="4" value={form.descripcionServicio} onChange={set('descripcionServicio')} />
          </label>
          <label>
            Observaciones
            <textarea rows="3" value={form.observaciones} onChange={set('observaciones')} />
          </label>
        </FormCard>
      </div>
      {error && <p className="turnero-error" role="alert">{error}</p>}
      <div className="page-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-button" type="button" onClick={guardar} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cotizacion'}
        </button>
      </div>
    </section>
  )
}
