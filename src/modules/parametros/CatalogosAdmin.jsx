import { useEffect, useState } from 'react'
import {
  getParametros, crearParametro, actualizarParametro,
  getServiciosCatalogo, crearServicio, actualizarServicio, crearActividad, actualizarActividad,
} from '../../api'
import { FormCard } from '../../components/FormCard'
import { PageHeader } from '../../components/PageHeader'
import { TIPO_CATALOGO_LABELS } from '../../constants'

// Catalogo generico (motivos, resultados, lugares, etc.): tabla + form de alta.
function CatalogoGenerico({ tipo }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ codigo: '', nombre: '', orden: '0' })
  const [error, setError] = useState('')

  const cargar = () => {
    setError('')
    getParametros(tipo).then((d) => setItems(d.items || [])).catch((e) => setError(e.message))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  const crear = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await crearParametro(tipo, { ...form, orden: Number(form.orden) || 0 })
      setForm({ codigo: '', nombre: '', orden: '0' })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const cambiar = async (id, data) => {
    setError('')
    try {
      await actualizarParametro(tipo, id, data)
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <FormCard title={`Nuevo item: ${TIPO_CATALOGO_LABELS[tipo] || tipo}`}>
        <form className="field-grid" onSubmit={crear}>
          <label>
            Codigo <span className="required-mark" aria-hidden="true">*</span>
            <input value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="ej. nuevo_motivo" />
          </label>
          <label>
            Nombre <span className="required-mark" aria-hidden="true">*</span>
            <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
          </label>
          <label>
            Orden
            <input type="number" value={form.orden} onChange={(e) => setForm((f) => ({ ...f, orden: e.target.value }))} />
          </label>
          <div className="page-actions" style={{ gridColumn: '1 / -1' }}>
            <button className="primary-button" type="submit">Agregar</button>
          </div>
        </form>
      </FormCard>
      {error && <p className="turnero-error" role="alert">{error}</p>}
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Codigo</th>
                <th scope="col">Nombre</th>
                <th scope="col">Orden</th>
                <th scope="col">Estado</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className={it.activo ? '' : 'row-inactivo'}>
                  <td className="code-cell">{it.codigo}</td>
                  <td>
                    <input
                      defaultValue={it.nombre}
                      onBlur={(e) => e.target.value !== it.nombre && cambiar(it.id, { nombre: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      defaultValue={it.orden}
                      style={{ width: '4.5rem' }}
                      onBlur={(e) => Number(e.target.value) !== it.orden && cambiar(it.id, { orden: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <span className={`status-pill ${it.activo ? 'Cerrada' : 'Escalada'}`}>
                      {it.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="link-button" type="button" onClick={() => cambiar(it.id, { activo: !it.activo })}>
                      {it.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

// Servicios y actividades (catalogo comercial de Ventas/Cotizaciones).
function ServiciosAdmin() {
  const [servicios, setServicios] = useState([])
  const [formServicio, setFormServicio] = useState({ codigo: '', nombre: '' })
  const [formActividad, setFormActividad] = useState({})
  const [error, setError] = useState('')

  const cargar = () => {
    setError('')
    getServiciosCatalogo(true).then((d) => setServicios(d.servicios || [])).catch((e) => setError(e.message))
  }

  useEffect(() => {
    cargar()
  }, [])

  const crearServicioNuevo = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await crearServicio(formServicio)
      setFormServicio({ codigo: '', nombre: '' })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleServicio = async (s) => {
    try {
      await actualizarServicio(s.id, { activo: !s.activo })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const crearActividadNueva = async (idServicio, e) => {
    e.preventDefault()
    setError('')
    const datos = formActividad[idServicio] || { codigo: '', nombre: '' }
    try {
      await crearActividad({ idServicio, ...datos })
      setFormActividad((f) => ({ ...f, [idServicio]: { codigo: '', nombre: '' } }))
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleActividad = async (a) => {
    try {
      await actualizarActividad(a.id, { activo: !a.activo })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const setActividadForm = (idServicio, campo) => (e) =>
    setFormActividad((f) => ({
      ...f,
      [idServicio]: { ...(f[idServicio] || { codigo: '', nombre: '' }), [campo]: e.target.value },
    }))

  return (
    <>
      <FormCard title="Nuevo servicio">
        <form className="field-grid" onSubmit={crearServicioNuevo}>
          <label>
            Codigo <span className="required-mark" aria-hidden="true">*</span>
            <input value={formServicio.codigo} onChange={(e) => setFormServicio((f) => ({ ...f, codigo: e.target.value }))} placeholder="ej. eventos" />
          </label>
          <label>
            Nombre <span className="required-mark" aria-hidden="true">*</span>
            <input value={formServicio.nombre} onChange={(e) => setFormServicio((f) => ({ ...f, nombre: e.target.value }))} />
          </label>
          <div className="page-actions" style={{ gridColumn: '1 / -1' }}>
            <button className="primary-button" type="submit">Agregar servicio</button>
          </div>
        </form>
      </FormCard>

      {error && <p className="turnero-error" role="alert">{error}</p>}

      {servicios.map((s) => (
        <section key={s.id} className="panel">
          <div className="panel-header">
            <h3>{s.nombre} <span className={`status-pill ${s.activo ? 'Cerrada' : 'Escalada'}`}>{s.activo ? 'Activo' : 'Inactivo'}</span></h3>
            <button className="link-button" type="button" onClick={() => toggleServicio(s)}>
              {s.activo ? 'Desactivar servicio' : 'Activar servicio'}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Codigo</th>
                  <th scope="col">Actividad</th>
                  <th scope="col">Estado</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {s.actividades.map((a) => (
                  <tr key={a.id} className={a.activo ? '' : 'row-inactivo'}>
                    <td className="code-cell">{a.codigo}</td>
                    <td>{a.nombre}</td>
                    <td>
                      <span className={`status-pill ${a.activo ? 'Cerrada' : 'Escalada'}`}>{a.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td>
                      <button className="link-button" type="button" onClick={() => toggleActividad(a)}>
                        {a.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="field-grid" onSubmit={(e) => crearActividadNueva(s.id, e)}>
            <label>
              Codigo de actividad
              <input value={formActividad[s.id]?.codigo || ''} onChange={setActividadForm(s.id, 'codigo')} placeholder="ej. nueva_actividad" />
            </label>
            <label>
              Nombre de actividad
              <input value={formActividad[s.id]?.nombre || ''} onChange={setActividadForm(s.id, 'nombre')} />
            </label>
            <div className="page-actions" style={{ gridColumn: '1 / -1' }}>
              <button className="secondary-button" type="submit">+ Agregar actividad</button>
            </div>
          </form>
        </section>
      ))}
    </>
  )
}

export function CatalogosAdmin({ user }) {
  const [tab, setTab] = useState('servicios')
  // Las sedes solo las crea/edita el administrador (seccion 5 del plan); un
  // coordinador ni siquiera ve la opcion en este selector.
  const catalogosVisibles = Object.entries(TIPO_CATALOGO_LABELS).filter(
    ([tipo]) => tipo !== 'sede' || user?.rol === 'admin',
  )

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Inicio / Parametrizacion"
        title="Parametrizacion"
        description="Gestiona los catalogos del sistema. Los items nunca se eliminan, solo se activan o desactivan."
      />
      <div className="filter-row panel">
        <select value={tab} onChange={(e) => setTab(e.target.value)} aria-label="Catalogo a gestionar">
          <option value="servicios">Servicios y actividades</option>
          {catalogosVisibles.map(([tipo, label]) => (
            <option key={tipo} value={tipo}>{label}</option>
          ))}
        </select>
      </div>
      {tab === 'servicios' ? <ServiciosAdmin /> : <CatalogoGenerico tipo={tab} />}
    </section>
  )
}
