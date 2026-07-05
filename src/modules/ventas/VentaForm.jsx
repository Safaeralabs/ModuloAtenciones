import { useEffect, useMemo, useState } from 'react'
import { buscarCliente, crearVenta, getServiciosCatalogo, getUsuariosOpciones } from '../../api'
import { FormCard } from '../../components/FormCard'
import { PageHeader } from '../../components/PageHeader'

const CATEGORIAS = ['A', 'B', 'C', 'D']

const EMPTY_FORM = {
  cedulaCliente: '',
  nombreCliente: '',
  telefono: '',
  correo: '',
  servicio: '',
  actividad: '',
  categoria: '',
  lugarPrestacion: '',
  fechaServicio: '',
  valorUnitario: '',
  cantidad: '1',
  numeroFactura: '',
  responsableFactura: '',
  numeroAprobado: '',
  tipoPago: '',
  observacion: '',
}

const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0)

export function VentaForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    cedulaCliente: initial?.cedula || '',
    nombreCliente: initial?.nombre || '',
    telefono: initial?.telefono || '',
    correo: initial?.correo || '',
    servicio: initial?.servicio || '',
    actividad: initial?.actividad || '',
    // Si viene de una cotizacion Aprobada, se sugiere su valor total como valor unitario (cantidad 1).
    valorUnitario: initial?.valorSugerido != null ? String(initial.valorSugerido) : '',
    tipoPago: initial?.tipoPago || '',
  }))
  const [servicios, setServicios] = useState([])
  const [responsables, setResponsables] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [clienteInfo, setClienteInfo] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getServiciosCatalogo().then((d) => setServicios(d.servicios || [])).catch(() => setServicios([]))
    getUsuariosOpciones().then((d) => setResponsables(d.usuarios || [])).catch(() => setResponsables([]))
  }, [])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const actividadesDisponibles = useMemo(() => {
    const servicio = servicios.find((s) => s.codigo === form.servicio)
    return servicio?.actividades || []
  }, [servicios, form.servicio])

  // Al cambiar de servicio, limpia la actividad si ya no pertenece al nuevo servicio.
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
        const t = res.cliente.sisu?.trabajador
        setForm((f) => ({
          ...f,
          nombreCliente: f.nombreCliente || res.cliente.client || '',
          telefono: f.telefono || res.cliente.phone || '',
          correo: f.correo || res.cliente.email || '',
          categoria: f.categoria || (CATEGORIAS.includes(t?.categoria) ? t.categoria : ''),
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

  const valorTotal = (Number(form.valorUnitario) || 0) * (Number(form.cantidad) || 0)

  const guardar = async () => {
    setError('')
    if (!form.cedulaCliente || !form.nombreCliente || !form.servicio || !form.actividad || !form.categoria || !form.lugarPrestacion || !form.fechaServicio || !form.tipoPago) {
      setError('Completa cedula, nombre, servicio, actividad, categoria, lugar, fecha y tipo de pago.')
      return
    }
    if (!(Number(form.valorUnitario) > 0) || !(Number(form.cantidad) >= 1)) {
      setError('Valor unitario y cantidad deben ser mayores a cero.')
      return
    }
    setSaving(true)
    try {
      await crearVenta({
        codigoAtencion: initial?.codigoAtencion || null,
        idCotizacion: initial?.idCotizacion || null,
        cedulaCliente: form.cedulaCliente,
        nombreCliente: form.nombreCliente,
        telefono: form.telefono,
        correo: form.correo,
        servicio: form.servicio,
        actividad: form.actividad,
        categoria: form.categoria,
        lugarPrestacion: form.lugarPrestacion,
        fechaServicio: form.fechaServicio,
        valorUnitario: Number(form.valorUnitario),
        cantidad: Number(form.cantidad),
        numeroFactura: form.numeroFactura,
        responsableFactura: form.responsableFactura ? Number(form.responsableFactura) : null,
        numeroAprobado: form.numeroAprobado,
        tipoPago: form.tipoPago,
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
        breadcrumb="Ventas / Nueva venta"
        title="Registrar nueva venta"
        description="Reemplaza el registro manual en Excel. El valor total se calcula automaticamente."
      />
      <div className="form-stack">
        <FormCard title="Datos del cliente">
          <div className="field-grid">
            <label>
              Cedula <span className="required-mark" aria-hidden="true">*</span>
              <div className="input-with-action">
                <input
                  placeholder="Ingresa la cedula"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.cedulaCliente}
                  onChange={set('cedulaCliente')}
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
              <input value={form.nombreCliente} onChange={set('nombreCliente')} autoComplete="name" />
            </label>
            <label>
              Telefono
              <input value={form.telefono} onChange={set('telefono')} inputMode="tel" autoComplete="tel" />
            </label>
            <label>
              Correo
              <input type="email" value={form.correo} onChange={set('correo')} autoComplete="email" />
            </label>
            <label>
              Categoria <span className="required-mark" aria-hidden="true">*</span>
              <select value={form.categoria} onChange={set('categoria')}>
                <option value="" disabled>Selecciona la categoria</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          {clienteInfo && (
            <p className={`cliente-aviso cliente-aviso-${clienteInfo.tipo}`} role="status">
              {clienteInfo.texto}
            </p>
          )}
        </FormCard>

        <FormCard title="Detalle de la venta">
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
              Lugar de prestacion <span className="required-mark" aria-hidden="true">*</span>
              <input value={form.lugarPrestacion} onChange={set('lugarPrestacion')} placeholder="Ej. Maziruma" />
            </label>
            <label>
              Fecha del servicio <span className="required-mark" aria-hidden="true">*</span>
              <input type="date" value={form.fechaServicio} onChange={set('fechaServicio')} />
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
          <div className="field-grid">
            <label>
              Valor unitario <span className="required-mark" aria-hidden="true">*</span>
              <input type="number" min="0" step="1" value={form.valorUnitario} onChange={set('valorUnitario')} />
            </label>
            <label>
              Cantidad <span className="required-mark" aria-hidden="true">*</span>
              <input type="number" min="1" step="1" value={form.cantidad} onChange={set('cantidad')} />
            </label>
            <label>
              Valor total
              <input value={formatCOP(valorTotal)} disabled />
            </label>
          </div>
        </FormCard>

        <FormCard title="Facturacion (opcional)">
          <div className="field-grid">
            <label>
              Numero de factura
              <input value={form.numeroFactura} onChange={set('numeroFactura')} placeholder="Se puede agregar despues" />
            </label>
            <label>
              Responsable de la factura
              <select value={form.responsableFactura} onChange={set('responsableFactura')}>
                <option value="">Sin asignar</option>
                {responsables.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Numero de aprobado
              <input value={form.numeroAprobado} onChange={set('numeroAprobado')} />
            </label>
          </div>
          <label>
            Observaciones
            <textarea rows="3" value={form.observacion} onChange={set('observacion')} />
          </label>
        </FormCard>
      </div>
      {error && <p className="turnero-error" role="alert">{error}</p>}
      <div className="page-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-button" type="button" onClick={guardar} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar venta'}
        </button>
      </div>
    </section>
  )
}
