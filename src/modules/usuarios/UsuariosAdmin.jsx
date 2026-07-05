import { useEffect, useState } from 'react'
import { getUsuarios, crearUsuario, actualizarUsuario, getParametros } from '../../api'
import { FormCard } from '../../components/FormCard'
import { PageHeader } from '../../components/PageHeader'
import { ROLE_LABELS } from '../../constants'

export function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([])
  const [sedes, setSedes] = useState([])
  const [form, setForm] = useState({
    username: '',
    nombre: '',
    correo: '',
    password: '',
    rol: 'asesor_integral',
    sede: '',
  })
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    getUsuarios()
      .then((d) => setUsuarios(d.usuarios || []))
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
    getParametros('sede')
      .then((d) => setSedes(d.items?.filter((s) => s.activo) || []))
      .catch(() => setSedes([]))
  }, [])

  // Primera sede activa como valor por defecto del formulario, en cuanto llega el catalogo.
  useEffect(() => {
    if (sedes.length && !form.sede) setForm((f) => ({ ...f, sede: sedes[0].nombre }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedes])

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const crear = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')
    setBusy(true)
    try {
      const creado = await crearUsuario(form)
      setForm({ username: '', nombre: '', correo: '', password: '', rol: 'asesor_integral', sede: sedes[0]?.nombre || '' })
      setMensaje(`Usuario "${creado.username}" creado correctamente.`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const cambiar = async (id, data) => {
    setError('')
    setMensaje('')
    try {
      await actualizarUsuario(id, data)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const resetPass = async (u) => {
    const nueva = window.prompt(`Nueva contrasena para ${u.username}:`)
    if (!nueva) return
    try {
      await actualizarUsuario(u.id, { password: nueva })
      window.alert('Contrasena actualizada.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Inicio / Usuarios"
        title="Usuarios"
        description="Gestiona los asesores y administradores del sistema."
      />

      <FormCard title="Crear usuario">
        <form className="field-grid" onSubmit={crear}>
          <label>
            Usuario <span className="required-mark" aria-hidden="true">*</span>
            <input placeholder="ej. jperez" value={form.username} onChange={setField('username')} autoComplete="off" />
          </label>
          <label>
            Nombre completo <span className="required-mark" aria-hidden="true">*</span>
            <input placeholder="ej. Juan Perez" value={form.nombre} onChange={setField('nombre')} />
          </label>
          <label>
            Correo <span className="field-hint">(para alertas por email)</span>
            <input type="email" placeholder="ej. jperez@comfaguajira.co" value={form.correo} onChange={setField('correo')} autoComplete="off" />
          </label>
          <label>
            Contrasena <span className="required-mark" aria-hidden="true">*</span>
            <input type="password" placeholder="Contrasena inicial" value={form.password} onChange={setField('password')} autoComplete="new-password" />
          </label>
          <label>
            Rol
            <select value={form.rol} onChange={setField('rol')}>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Sede <span className="required-mark" aria-hidden="true">*</span>
            <select value={form.sede} onChange={setField('sede')}>
              {sedes.length === 0 && <option value="">Sin sedes creadas</option>}
              {sedes.map((s) => (
                <option key={s.codigo} value={s.nombre}>{s.nombre}</option>
              ))}
            </select>
          </label>
          <div className="page-actions" style={{ gridColumn: '1 / -1' }}>
            <button className="primary-button" type="submit" disabled={busy || !sedes.length}>
              {busy ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </FormCard>

      {mensaje && <p className="cliente-aviso cliente-aviso-found" role="status">{mensaje}</p>}
      {error && <p className="turnero-error" role="alert">{error}</p>}

      <section className="panel">
        <h3>Usuarios registrados</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">Sede</th>
                <th scope="col">Estado</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={u.activo ? '' : 'row-inactivo'}>
                  <td className="code-cell">{u.username}</td>
                  <td>{u.nombre}</td>
                  <td>
                    <input
                      type="email"
                      defaultValue={u.correo}
                      placeholder="Sin correo"
                      aria-label={`Correo de ${u.username}`}
                      onBlur={(e) => e.target.value !== u.correo && cambiar(u.id, { correo: e.target.value })}
                    />
                  </td>
                  <td>
                    <select value={u.rol} onChange={(e) => cambiar(u.id, { rol: e.target.value })} aria-label={`Rol de ${u.username}`}>
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select value={u.sede} onChange={(e) => cambiar(u.id, { sede: e.target.value })} aria-label={`Sede de ${u.username}`}>
                      {!sedes.some((s) => s.nombre === u.sede) && <option value={u.sede}>{u.sede}</option>}
                      {sedes.map((s) => (
                        <option key={s.codigo} value={s.nombre}>{s.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`status-pill ${u.activo ? 'Cerrada' : 'Escalada'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="acciones-cell">
                    <button className="link-button" type="button" onClick={() => resetPass(u)}>
                      Cambiar clave
                    </button>
                    <button className="link-button" type="button" onClick={() => cambiar(u.id, { activo: !u.activo })}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
