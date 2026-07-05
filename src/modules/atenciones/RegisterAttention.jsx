import { useEffect, useState } from 'react'
import { buscarCliente, crearAtencion, getCatalogo } from '../../api'
import { serviceOptions, statusOptions } from '../../mockData'
import { FormCard } from '../../components/FormCard'
import { PageHeader } from '../../components/PageHeader'
import { SisuReadOnly } from '../../components/SisuReadOnly'
import { EMPTY_FORM, PRODUCTOS_INTERES, ACCIONES_SEGUIMIENTO } from '../../constants'

export function RegisterAttention({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    document: initial?.document || '',
    service: initial?.service || '',
  }))
  // clienteInfo: { tipo: 'found' | 'notfound', texto }
  const [clienteInfo, setClienteInfo] = useState(null)
  // Snapshot de SISU (afiliado + empresa), solo lectura. Se persiste al guardar.
  const [sisu, setSisu] = useState(initial?.sisu || null)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [resultadoOptions, setResultadoOptions] = useState([])

  useEffect(() => {
    getCatalogo('resultado_atencion')
      .then((d) => setResultadoOptions(d.items || []))
      .catch(() => setResultadoOptions([]))
  }, [])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  // Filtro legal: solo se puede hacer seguimiento de mercadeo si el afiliado
  // (y su empresa) autorizan compartir datos. Sin SISU, no hay bloqueo conocido.
  const sisuAutoriza =
    !sisu ||
    (Boolean(sisu.trabajador?.autorizaCompartir) && (sisu.empresa ? Boolean(sisu.empresa.autorizaCompartir) : true))

  const toggleInteres = (producto) =>
    setForm((f) => ({
      ...f,
      interes: f.interes.includes(producto)
        ? f.interes.filter((x) => x !== producto)
        : [...f.interes, producto],
    }))

  // Vuelca los datos del cliente en el formulario (sin pisar lo ya escrito).
  const aplicarCliente = (cliente) =>
    setForm((f) => ({
      ...f,
      client: f.client || cliente.client || '',
      phone: f.phone || cliente.phone || '',
      email: f.email || cliente.email || '',
      address: f.address || cliente.address || '',
      city: f.city || cliente.city || '',
    }))

  // Consulta el cliente por cedula (webservice -> historico) y autollena.
  const buscarPorCedula = async (doc) => {
    const cedula = String(doc ?? form.document).trim()
    if (!cedula) {
      setClienteInfo({ tipo: 'notfound', texto: 'Ingresa una cedula para buscar.' })
      return
    }
    setBuscando(true)
    setClienteInfo(null)
    try {
      const res = await buscarCliente(cedula)
      if (res.encontrado && res.cliente) {
        aplicarCliente(res.cliente)
        setSisu(res.cliente.sisu || null)
        const origen = res.fuente === 'sisu' ? 'SISU' : 'atenciones previas'
        setClienteInfo({ tipo: 'found', texto: `Cliente encontrado en ${origen}. Verifica y completa los datos.` })
      } else {
        setSisu(null)
        setClienteInfo({ tipo: 'notfound', texto: 'Cliente no registrado en SISU. Completa los datos manualmente.' })
      }
    } catch {
      setSisu(null)
      setClienteInfo({ tipo: 'notfound', texto: 'No se pudo consultar SISU. Completa los datos manualmente.' })
    } finally {
      setBuscando(false)
    }
  }

  // Si el turno trae cedula, busca al cliente automaticamente al abrir el form.
  useEffect(() => {
    if (initial?.document) buscarPorCedula(initial.document)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  const guardar = async () => {
    setError('')
    if (!form.document || !form.client || !form.service || !form.status) {
      setError('Completa cedula, nombre, servicio y estado.')
      return
    }
    if (!form.resultado) {
      setError('Selecciona el resultado de la atencion.')
      return
    }
    if (form.resultado === 'sin_resolucion' && !form.observations.trim()) {
      setError('Las observaciones son obligatorias cuando el resultado es "Sin resolucion / Otro".')
      return
    }
    setSaving(true)
    try {
      const record = await crearAtencion({
        turnoId: initial?.turnoId || null,
        modulo: initial?.modulo ?? null,
        document: form.document,
        client: form.client,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        service: form.service,
        motive: form.motive,
        status: form.status,
        caso: form.caso,
        management: form.management,
        observations: form.observations,
        resultado: form.resultado,
        sisu, // snapshot SISU (null si fue registro manual)
        // Mercadeo: el consentimiento se anula si SISU no autoriza.
        interes: form.interes,
        consentimiento: form.consentimiento && sisuAutoriza,
        accionSeguimiento: form.accionSeguimiento,
        fechaSeguimiento: form.fechaSeguimiento,
        notaMercadeo: form.notaMercadeo,
      })
      // Si el resultado fue 'Venta directa' o 'Cotizacion generada', se encadena
      // al formulario correspondiente prellenado (seccion 4.2 y 11 del plan).
      onSaved(record)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Inicio / Registrar atencion"
        title="Registrar nueva atencion"
        description="Completa la informacion de la atencion brindada al usuario."
      />
      {initial?.numero && (
        <div className="turno-banner">
          <span className="turno-banner-badge">Turno {initial.numero}</span>
          {initial.modulo != null && <span>Modulo {initial.modulo}</span>}
          {initial.prioritario && <span className="turno-banner-prio">Prioritario · {initial.condicion}</span>}
          {clienteInfo?.tipo === 'found' && (
            <span className="turno-banner-cliente">{form.client ? `Cliente: ${form.client}` : 'Cliente encontrado'}</span>
          )}
        </div>
      )}
      <div className="form-stack">
        <FormCard title="Datos del cliente">
          <p className="form-hint">Ingresa la cedula y pulsa <strong>Buscar</strong> para traer los datos del cliente. Si no existe, registralo manualmente.</p>
          <div className="field-grid">
            <label>
              Cedula <span className="required-mark" aria-hidden="true">*</span>
              <div className="input-with-action">
                <input
                  placeholder="Ingresa la cedula"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.document}
                  onChange={set('document')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      buscarPorCedula()
                    }
                  }}
                />
                <button type="button" className="secondary-button" onClick={() => buscarPorCedula()} disabled={buscando}>
                  {buscando ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </label>
            <label>
              Nombre completo <span className="required-mark" aria-hidden="true">*</span>
              <input placeholder="Ingresa el nombre completo" autoComplete="name" value={form.client} onChange={set('client')} />
            </label>
            <label>
              Telefono
              <input placeholder="Ingresa el telefono" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
            </label>
            <label>
              Email
              <input type="email" placeholder="correo@ejemplo.com" autoComplete="email" value={form.email} onChange={set('email')} />
            </label>
            <label>
              Direccion
              <input placeholder="Direccion de residencia" autoComplete="street-address" value={form.address} onChange={set('address')} />
            </label>
            <label>
              Ciudad
              <input placeholder="Ciudad / municipio" autoComplete="address-level2" value={form.city} onChange={set('city')} />
            </label>
          </div>
          {clienteInfo && (
            <p className={`cliente-aviso cliente-aviso-${clienteInfo.tipo}`} role="status">
              {clienteInfo.texto}
            </p>
          )}
        </FormCard>
        {sisu && <SisuReadOnly sisu={sisu} />}
        <FormCard title="Informacion de la atencion">
          <div className="field-grid">
            <label>
              Servicio <span className="required-mark" aria-hidden="true">*</span>
              <select value={form.service} onChange={set('service')}>
                <option value="" disabled>
                  Selecciona un servicio
                </option>
                {serviceOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Motivo de atencion <span className="required-mark" aria-hidden="true">*</span>
              <select value={form.motive} onChange={set('motive')}>
                <option value="" disabled>
                  Selecciona un motivo
                </option>
                <option>Informacion general</option>
                <option>No pago</option>
                <option>Certificado estudiantil</option>
                <option>Kit escolar</option>
              </select>
            </label>
            <label>
              Estado <span className="required-mark" aria-hidden="true">*</span>
              <select value={form.status} onChange={set('status')}>
                <option value="" disabled>
                  Selecciona un estado
                </option>
                {statusOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="field-grid two-cols">
            <label>
              Descripcion del caso
              <textarea rows="5" placeholder="Describe la solicitud o necesidad del usuario..." value={form.caso} onChange={set('caso')} />
            </label>
            <label>
              Gestion realizada
              <textarea rows="5" placeholder="Describe las acciones realizadas para atender el caso..." value={form.management} onChange={set('management')} />
            </label>
          </div>
          <label>
            Observaciones {form.resultado === 'sin_resolucion' && <span className="required-mark" aria-hidden="true">*</span>}
            <textarea rows="4" placeholder="Informacion adicional relevante..." value={form.observations} onChange={set('observations')} />
          </label>
          <label>
            Resultado de la atencion <span className="required-mark" aria-hidden="true">*</span>
            <select value={form.resultado} onChange={set('resultado')}>
              <option value="" disabled>
                Selecciona el resultado
              </option>
              {resultadoOptions.map((option) => (
                <option key={option.codigo} value={option.codigo}>{option.nombre}</option>
              ))}
            </select>
          </label>
        </FormCard>
        <FormCard title="Oportunidad de mercadeo">
          <p className="form-hint">Registra el interes comercial detectado. El seguimiento solo es valido si el afiliado autoriza el tratamiento de datos.</p>
          <div className="field-block">
            <span className="field-label">Productos / servicios de interes</span>
            <div className="chip-toggle-row">
              {PRODUCTOS_INTERES.map((producto) => (
                <button
                  key={producto}
                  type="button"
                  className={`chip-toggle ${form.interes.includes(producto) ? 'active' : ''}`}
                  aria-pressed={form.interes.includes(producto)}
                  onClick={() => toggleInteres(producto)}
                >
                  {producto}
                </button>
              ))}
            </div>
          </div>
          {sisu && !sisuAutoriza && (
            <p className="cliente-aviso cliente-aviso-notfound" role="status">
              El afiliado no autoriza compartir datos a terceros: no se puede registrar seguimiento de mercadeo.
            </p>
          )}
          <div className="field-grid">
            <label className={`consent-field ${!sisuAutoriza ? 'is-disabled' : ''}`}>
              <span className="field-label">Consentimiento de seguimiento</span>
              <span className="consent-row">
                <input
                  type="checkbox"
                  checked={form.consentimiento && sisuAutoriza}
                  disabled={!sisuAutoriza}
                  onChange={(e) => setForm((f) => ({ ...f, consentimiento: e.target.checked }))}
                />
                <span>El usuario acepta ser contactado para seguimiento comercial.</span>
              </span>
            </label>
            <label>
              Accion de seguimiento
              <select value={form.accionSeguimiento} onChange={set('accionSeguimiento')} disabled={!sisuAutoriza}>
                <option value="">Sin accion</option>
                {ACCIONES_SEGUIMIENTO.map((accion) => (
                  <option key={accion}>{accion}</option>
                ))}
              </select>
            </label>
            <label>
              Fecha de seguimiento
              <input type="date" value={form.fechaSeguimiento} onChange={set('fechaSeguimiento')} disabled={!sisuAutoriza} />
            </label>
          </div>
          <label>
            Nota de mercadeo
            <textarea rows="3" placeholder="Detalle del interes o de la oportunidad detectada..." value={form.notaMercadeo} onChange={set('notaMercadeo')} disabled={!sisuAutoriza} />
          </label>
        </FormCard>
      </div>
      {error && <p className="turnero-error" role="alert">{error}</p>}
      <div className="page-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-button" type="button" onClick={guardar} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar atencion'}
        </button>
      </div>
    </section>
  )
}
