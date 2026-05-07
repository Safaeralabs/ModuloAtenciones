import { useEffect, useState } from 'react'
import { attentions, metrics, reportCards, serviceOptions, statusOptions } from './mockData'

const defaultPrivateScreen = 'dashboard'
const allowedScreens = new Set(['login', 'dashboard', 'register', 'history', 'detail', 'reports', 'turnero'])
const menu = [
  { key: 'dashboard', label: 'Inicio' },
  { key: 'register', label: 'Registrar atencion' },
  { key: 'history', label: 'Historial' },
  { key: 'reports', label: 'Reportes' },
  { key: 'turnero', label: 'Turnero' },
]

const serviceIcons = {
  Subsidio: 'Sb',
  Credito: 'Cr',
  'Asesor Integral': 'AI',
  Mercadeo: 'Mk',
  Afiliaciones: 'Af',
  PQRS: 'PQ',
}

function App() {
  const [screen, setScreen] = useState('login')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [selectedAttention, setSelectedAttention] = useState(attentions[2])

  useEffect(() => {
    const syncFromHash = () => {
      const savedAuth = window.sessionStorage.getItem('mock-auth') === 'true'
      setIsAuthenticated(savedAuth)

      const next = window.location.hash.replace('#', '')
      const normalized = allowedScreens.has(next)
        ? next
        : savedAuth
          ? defaultPrivateScreen
          : 'login'

      if (!savedAuth && normalized !== 'login' && normalized !== 'turnero') {
        window.location.hash = 'login'
        setScreen('login')
        return
      }

      if (!next || normalized !== next) {
        window.location.hash = normalized
      }

      setScreen(normalized)
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  const goTo = (next) => {
    const normalized = allowedScreens.has(next) ? next : defaultPrivateScreen
    const savedAuth = window.sessionStorage.getItem('mock-auth') === 'true'
    const target = !savedAuth && normalized !== 'login' && normalized !== 'turnero' ? 'login' : normalized
    window.location.hash = target
    setIsMobileMenuOpen(false)
    setScreen(target)
  }

  const handleLogin = () => {
    window.sessionStorage.setItem('mock-auth', 'true')
    setIsAuthenticated(true)
    window.location.hash = defaultPrivateScreen
    setScreen(defaultPrivateScreen)
  }

  const handleLogout = () => {
    window.sessionStorage.removeItem('mock-auth')
    setIsAuthenticated(false)
    setIsMobileMenuOpen(false)
    goTo('login')
  }

  const openAttentionDetail = (item) => {
    setSelectedAttention(item)
    goTo('detail')
  }

  if (!isAuthenticated && screen !== 'turnero') {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (screen === 'turnero') {
    return <PublicTurnero onBack={() => goTo(isAuthenticated ? 'dashboard' : 'login')} />
  }

  return (
    <div className="app-shell">
      <Sidebar current={screen} onNavigate={goTo} isMobileMenuOpen={isMobileMenuOpen} />
      <main className="content-area">
        <Topbar onToggleMenu={() => setIsMobileMenuOpen((value) => !value)} onLogout={handleLogout} />
        {screen === 'dashboard' && (
          <Dashboard
            onNewAttention={() => goTo('register')}
            onOpenHistory={() => goTo('history')}
            onOpenDetail={openAttentionDetail}
          />
        )}
        {screen === 'register' && <RegisterAttention onCancel={() => goTo('dashboard')} />}
        {screen === 'history' && <History onCreate={() => goTo('register')} onSelect={openAttentionDetail} />}
        {screen === 'detail' && <AttentionDetail attention={selectedAttention} onBack={() => goTo('history')} />}
        {screen === 'reports' && <Reports onSelect={openAttentionDetail} />}
      </main>
    </div>
  )
}

function LoginScreen({ onLogin }) {
  return (
    <div className="login-page">
      <div className="brand-header">
        <Logo />
      </div>
      <section className="login-card">
        <div className="login-avatar">US</div>
        <h1>Bienvenido de nuevo</h1>
        <p>Inicia sesion para continuar</p>
        <div className="field-grid single">
          <label>
            Usuario
            <input placeholder="Ingresa tu usuario" />
          </label>
          <label>
            Contrasena
            <input placeholder="Ingresa tu contrasena" type="password" />
          </label>
        </div>
        <div className="login-row">
          <label className="remember">
            <input type="checkbox" defaultChecked />
            Recordar usuario
          </label>
          <button className="link-button" type="button">
            Olvidaste tu contrasena?
          </button>
        </div>
        <button className="primary-button large" type="button" onClick={onLogin}>
          Iniciar sesion
        </button>
        <div className="separator">o</div>
        <div className="support-copy">Necesitas ayuda? Contacta al area de sistemas.</div>
      </section>
    </div>
  )
}

function Sidebar({ current, onNavigate, isMobileMenuOpen }) {
  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      <Logo compact />
      <nav className="sidebar-nav">
        {menu.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${current === item.key ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-icon">{item.label.slice(0, 1)}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="support-box">
        <strong>Necesitas ayuda?</strong>
        <span>Soporte tecnico</span>
      </div>
    </aside>
  )
}

function Topbar({ onToggleMenu, onLogout }) {
  return (
    <header className="topbar">
      <button className="ghost-button" type="button" aria-label="Abrir menu principal" onClick={onToggleMenu}>
        Menu
      </button>
      <div className="topbar-user">
        <span className="notification-dot">3</span>
        <div className="avatar">MF</div>
        <div>
          <strong>Maria Fernanda</strong>
          <span>Asesor Integral</span>
        </div>
        <button className="secondary-button compact-button" type="button" onClick={onLogout}>
          Salir
        </button>
      </div>
    </header>
  )
}

function Dashboard({ onNewAttention, onOpenHistory, onOpenDetail }) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h2>Hola, Maria Fernanda!</h2>
          <p>Aqui tienes un resumen de tus atenciones y actividades.</p>
        </div>
        <button className="primary-button" type="button" onClick={onNewAttention}>
          Nueva atencion
        </button>
      </div>
      <div className="metric-grid">
        {metrics.map((item) => (
          <article key={item.label} className={`metric-card ${item.tone}`}>
            <span className="metric-label">{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="panel-header">
          <h3>Atenciones recientes</h3>
          <button className="link-button" type="button" onClick={onOpenHistory}>
            Ver todas
          </button>
        </div>
        <AttentionTable rows={attentions} onSelect={onOpenDetail} />
      </section>
    </section>
  )
}

function RegisterAttention({ onCancel }) {
  return (
    <section className="page">
      <div className="page-title">
        <span className="breadcrumb">Inicio &gt; Registrar atencion</span>
        <h2>Registrar nueva atencion</h2>
        <p>Completa la informacion de la atencion brindada al usuario.</p>
      </div>
      <div className="form-stack">
        <FormCard title="Datos del cliente">
          <div className="field-grid">
            <label>
              Cedula
              <input placeholder="Ingresa la cedula" />
            </label>
            <label>
              Nombre completo
              <input placeholder="Ingresa el nombre completo" />
            </label>
            <label>
              Telefono
              <input placeholder="Ingresa el telefono" />
            </label>
          </div>
        </FormCard>
        <FormCard title="Informacion de la atencion">
          <div className="field-grid">
            <label>
              Servicio
              <select defaultValue="">
                <option value="" disabled>
                  Selecciona un servicio
                </option>
                {serviceOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Motivo de atencion
              <select defaultValue="">
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
              Estado
              <select defaultValue="">
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
              <textarea rows="5" placeholder="Describe la solicitud o necesidad del usuario..." />
            </label>
            <label>
              Gestion realizada
              <textarea rows="5" placeholder="Describe las acciones realizadas para atender el caso..." />
            </label>
          </div>
          <label>
            Observaciones
            <textarea rows="4" placeholder="Informacion adicional relevante..." />
          </label>
        </FormCard>
      </div>
      <div className="page-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-button" type="button">
          Guardar atencion
        </button>
      </div>
    </section>
  )
}

function History({ onSelect, onCreate }) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h2>Historial de atenciones</h2>
          <p>Consulta y revisa las atenciones registradas.</p>
        </div>
        <button className="primary-button" type="button" onClick={onCreate}>
          Nueva atencion
        </button>
      </div>
      <div className="filter-row panel">
        <input placeholder="Buscar por codigo, cedula, nombre..." />
        <select defaultValue="todos-estados">
          <option value="todos-estados">Todos los estados</option>
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select defaultValue="todos-servicios">
          <option value="todos-servicios">Todos los servicios</option>
          {serviceOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <button className="secondary-button" type="button">
          Limpiar filtros
        </button>
      </div>
      <section className="panel">
        <AttentionTable rows={attentions} onSelect={onSelect} />
      </section>
    </section>
  )
}

function Reports({ onSelect }) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h2>Reportes de atenciones</h2>
          <p>Analiza el comportamiento de las atenciones registradas.</p>
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button">
            Exportar a Excel
          </button>
          <button className="primary-button" type="button">
            Actualizar
          </button>
        </div>
      </div>
      <div className="filter-row panel">
        <input type="date" defaultValue="2024-05-01" />
        <input type="date" defaultValue="2024-05-24" />
        <select defaultValue="todos-asesores">
          <option value="todos-asesores">Todos los asesores</option>
        </select>
        <select defaultValue="todos-servicios">
          <option value="todos-servicios">Todos los servicios</option>
        </select>
      </div>
      <div className="metric-grid four">
        {reportCards.map((item) => (
          <article key={item.label} className={`metric-card ${item.tone}`}>
            <span className="metric-label">{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.helper}</small>
          </article>
        ))}
      </div>
      <div className="chart-grid">
        <ChartCard title="Atenciones por asesor" bars={[100, 78, 63, 55, 40, 22]} />
        <ChartCard title="Atenciones por servicio" bars={[92, 68, 51, 33, 18, 9]} />
        <DonutCard />
        <LineCard />
      </div>
      <section className="panel">
        <h3>Detalle de atenciones</h3>
        <AttentionTable rows={attentions} onSelect={onSelect} />
      </section>
    </section>
  )
}

function AttentionDetail({ attention, onBack }) {
  const escalation = attention.escalation

  return (
    <section className="page">
      <div className="page-title detail-header">
        <div>
          <span className="breadcrumb">Historial &gt; Detalle de atencion</span>
          <h2>{attention.id}</h2>
          <p>Fecha de registro: {attention.date}</p>
        </div>
        <div className="button-row">
          <span className={`status-pill ${attention.status}`}>{attention.status}</span>
          <button className="secondary-button" type="button">
            Editar
          </button>
          {attention.status !== 'Escalada' && (
            <button className="secondary-button warn" type="button">
              Escalar
            </button>
          )}
          {attention.status !== 'Cerrada' && (
            <button className="success-button" type="button">
              Cerrar caso
            </button>
          )}
        </div>
      </div>
      <div className="detail-grid">
        <DetailCard
          title="Informacion del cliente"
          items={[
            ['Cedula', attention.document],
            ['Nombre completo', attention.client],
            ['Telefono', attention.phone],
            ['Correo electronico', attention.email],
            ['Direccion', attention.address],
            ['Ciudad', attention.city],
          ]}
        />
        <DetailCard
          title="Informacion de la atencion"
          items={[
            ['Servicio', attention.service],
            ['Motivo de atencion', attention.motive],
            ['Medio de contacto', attention.channel],
            ['Fecha de atencion', attention.date],
            ['Asesor responsable', attention.advisor],
            ['Duracion de la atencion', attention.duration],
          ]}
        />
        <TextCard title="Gestion realizada" text={attention.management} />
        <TextCard title="Observaciones" text={attention.observations} />
        <DetailCard
          wide
          title="Estado del caso"
          items={[
            ['Estado actual', attention.status],
            ['Fecha de escalamiento', escalation?.date ?? 'No aplica'],
            ['Area destino', escalation?.area ?? 'No aplica'],
            ['Motivo de escalamiento', escalation?.reason ?? 'No aplica'],
            ['Responsable area destino', escalation?.manager ?? 'No aplica'],
            ['Fecha compromiso', escalation?.dueDate ?? 'No aplica'],
          ]}
        />
      </div>
      <div className="page-actions split">
        <button className="secondary-button" type="button" onClick={onBack}>
          Volver al historial
        </button>
        <button className="danger-button" type="button">
          Anular atencion
        </button>
      </div>
    </section>
  )
}

function PublicTurnero({ onBack }) {
  return (
    <div className="turnero-page">
      <div className="turnero-frame">
        <div className="turnero-header">
          <Logo compact />
          <div>
            <h1>Bienvenido al sistema de turnos</h1>
            <p>Por favor registra tus datos para generar tu turno</p>
          </div>
          <button className="secondary-button" type="button">
            Accesibilidad
          </button>
        </div>
        <div className="turnero-layout">
          <div className="service-rail">
            {serviceOptions.map((service) => (
              <div key={service} className="service-chip">
                <span>{serviceIcons[service]}</span>
                <strong>{service}</strong>
              </div>
            ))}
          </div>
          <div className="turnero-form">
            <FormCard title="Datos del cliente">
              <div className="field-grid">
                <label>
                  Cedula
                  <input placeholder="Ingresa tu numero de cedula" />
                </label>
                <label>
                  Nombre completo
                  <input placeholder="Ingresa tu nombre completo" />
                </label>
                <label>
                  Telefono
                  <input placeholder="Ingresa tu numero de telefono" />
                </label>
                <label>
                  Correo electronico
                  <input placeholder="ejemplo@correo.com" />
                </label>
              </div>
            </FormCard>
            <FormCard title="Informacion de la atencion">
              <div className="field-grid two-cols">
                <label>
                  Servicio
                  <select defaultValue="">
                    <option value="" disabled>
                      Selecciona el servicio
                    </option>
                    {serviceOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Motivo de atencion
                  <select defaultValue="">
                    <option value="" disabled>
                      Selecciona el motivo de atencion
                    </option>
                    <option>Informacion general</option>
                    <option>Subsidio monetario</option>
                    <option>Credito social</option>
                  </select>
                </label>
              </div>
              <label>
                Descripcion breve del caso
                <textarea rows="4" placeholder="Cuentanos brevemente el motivo de tu consulta" />
              </label>
            </FormCard>
            <FormCard title="Atencion prioritaria">
              <label className="checkbox-line">
                <input type="checkbox" />
                Presenta alguna discapacidad o condicion prioritaria?
              </label>
              <select defaultValue="">
                <option value="">Selecciona la condicion (si aplica)</option>
                <option>Adulto mayor</option>
                <option>Gestante</option>
                <option>Movilidad reducida</option>
              </select>
            </FormCard>
            <div className="page-actions">
              <button className="secondary-button" type="button" onClick={onBack}>
                Cancelar
              </button>
              <button className="primary-button" type="button">
                Generar turno
              </button>
            </div>
          </div>
          <aside className="turnero-side">
            <div className="queue-card">
              <span className="queue-icon">TE</span>
              <h3>Tiempo estimado de espera</h3>
              <strong>15</strong>
              <span>minutos</span>
              <p>El tiempo de espera puede variar segun la demanda.</p>
            </div>
            <div className="queue-card">
              <span className="queue-icon">EF</span>
              <h3>Estado de la fila</h3>
              <p>Personas en espera</p>
              <strong>23</strong>
              <p>Turnos atendidos hoy</p>
              <strong>156</strong>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function AttentionTable({ rows, onSelect }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Codigo</th>
            <th>Fecha y hora</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Asesor</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.date}</td>
              <td>{row.client}</td>
              <td>
                <span className={`tag ${slug(row.service)}`}>{row.service}</span>
              </td>
              <td>{row.motive}</td>
              <td>
                <span className={`status-pill ${row.status}`}>{row.status}</span>
              </td>
              <td>{row.advisor}</td>
              <td>
                <button className="icon-button action-link" type="button" onClick={() => onSelect?.(row)} disabled={!onSelect}>
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FormCard({ title, children }) {
  return (
    <section className="panel form-card">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function DetailCard({ title, items, wide = false }) {
  return (
    <section className={`panel detail-card ${wide ? 'wide' : ''}`}>
      <h3>{title}</h3>
      <div className="detail-list">
        {items.map(([label, value]) => (
          <div key={label} className="detail-item">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function TextCard({ title, text }) {
  return (
    <section className="panel detail-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  )
}

function ChartCard({ title, bars }) {
  return (
    <section className="panel chart-card">
      <h3>{title}</h3>
      <div className="bars">
        {bars.map((bar, index) => (
          <div key={bar + index} className="bar-group">
            <span style={{ height: `${bar}%` }} />
          </div>
        ))}
      </div>
    </section>
  )
}

function DonutCard() {
  return (
    <section className="panel chart-card">
      <h3>Estado de atenciones</h3>
      <div className="donut" />
      <div className="legend">
        <span><i className="blue" /> Cerradas</span>
        <span><i className="amber" /> Pendientes</span>
        <span><i className="red" /> Escaladas</span>
      </div>
    </section>
  )
}

function LineCard() {
  return (
    <section className="panel chart-card">
      <h3>Atenciones por dia</h3>
      <svg viewBox="0 0 240 120" className="line-chart" aria-hidden="true">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          points="10,90 60,65 110,48 160,25 210,58"
        />
        {[['10', '90'], ['60', '65'], ['110', '48'], ['160', '25'], ['210', '58']].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="currentColor" />
        ))}
      </svg>
    </section>
  )
}

function Logo({ compact = false }) {
  return (
    <div className={`logo ${compact ? 'compact' : ''}`}>
      <div className="logo-mark">
        <span className="sun" />
        <span className="wave wave-a" />
        <span className="wave wave-b" />
      </div>
      <div className="logo-copy">
        <strong>Comfaguajira</strong>
        <small>Familias felices</small>
      </div>
    </div>
  )
}

function slug(text) {
  return text.toLowerCase().replace(/\s+/g, '-')
}

export default App
