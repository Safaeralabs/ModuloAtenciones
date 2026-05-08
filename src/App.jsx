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
      {isMobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
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

function NavIcon({ name }) {
  return (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === 'dashboard' && <>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>}
      {name === 'register' && <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </>}
      {name === 'history' && <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>}
      {name === 'reports' && <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </>}
      {name === 'turnero' && <>
        <path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </>}
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function ServiceSvgIcon({ service }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="service-svg" aria-hidden="true">
      {service === 'Subsidio' && <>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>}
      {service === 'Credito' && <>
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </>}
      {service === 'Asesor Integral' && <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>}
      {service === 'Mercadeo' && <>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </>}
      {service === 'Afiliaciones' && <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </>}
      {service === 'PQRS' && <>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </>}
    </svg>
  )
}

function LoginScreen({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="login-page">
      <div className="brand-header">
        <Logo />
      </div>
      <section className="login-card">
        <div className="login-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.7rem', height: '1.7rem', color: 'var(--blue)' }} aria-hidden="true">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h1>Bienvenido de nuevo</h1>
        <p>Inicia sesion para continuar</p>
        <div className="field-grid single">
          <label>
            Usuario
            <input placeholder="Ingresa tu usuario" autoComplete="username" />
          </label>
          <label>
            Contrasena
            <div className="password-field">
              <input
                placeholder="Ingresa tu contrasena"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
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
      <nav className="sidebar-nav" aria-label="Navegacion principal">
        {menu.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${current === item.key ? 'active' : ''}`}
            type="button"
            aria-current={current === item.key ? 'page' : undefined}
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-icon">
              <NavIcon name={item.key} />
            </span>
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="topbar-user">
        <span className="notification-dot" aria-label="3 notificaciones">3</span>
        <div className="avatar" aria-hidden="true">MF</div>
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
          + Nueva atencion
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
            Ver todas &rarr;
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
        <span className="breadcrumb">Inicio / Registrar atencion</span>
        <h2>Registrar nueva atencion</h2>
        <p>Completa la informacion de la atencion brindada al usuario.</p>
      </div>
      <div className="form-stack">
        <FormCard title="Datos del cliente">
          <div className="field-grid">
            <label>
              Cedula <span className="required-mark" aria-hidden="true">*</span>
              <input placeholder="Ingresa la cedula" inputMode="numeric" autoComplete="off" />
            </label>
            <label>
              Nombre completo <span className="required-mark" aria-hidden="true">*</span>
              <input placeholder="Ingresa el nombre completo" autoComplete="name" />
            </label>
            <label>
              Telefono
              <input placeholder="Ingresa el telefono" inputMode="tel" autoComplete="tel" />
            </label>
          </div>
        </FormCard>
        <FormCard title="Informacion de la atencion">
          <div className="field-grid">
            <label>
              Servicio <span className="required-mark" aria-hidden="true">*</span>
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
              Motivo de atencion <span className="required-mark" aria-hidden="true">*</span>
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
              Estado <span className="required-mark" aria-hidden="true">*</span>
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
          + Nueva atencion
        </button>
      </div>
      <div className="filter-row panel">
        <input placeholder="Buscar por codigo, cedula, nombre..." aria-label="Buscar atenciones" />
        <select defaultValue="todos-estados" aria-label="Filtrar por estado">
          <option value="todos-estados">Todos los estados</option>
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select defaultValue="todos-servicios" aria-label="Filtrar por servicio">
          <option value="todos-servicios">Todos los servicios</option>
          {serviceOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <button className="secondary-button" type="button">
          Limpiar
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
            Exportar Excel
          </button>
          <button className="primary-button" type="button">
            Actualizar
          </button>
        </div>
      </div>
      <div className="filter-row panel">
        <input type="date" defaultValue="2024-05-01" aria-label="Fecha desde" />
        <input type="date" defaultValue="2024-05-24" aria-label="Fecha hasta" />
        <select defaultValue="todos-asesores" aria-label="Filtrar por asesor">
          <option value="todos-asesores">Todos los asesores</option>
        </select>
        <select defaultValue="todos-servicios" aria-label="Filtrar por servicio">
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
        <ChartCard
          title="Atenciones por asesor"
          bars={[
            { value: 100, label: 'MF' },
            { value: 78, label: 'CA' },
            { value: 63, label: 'JR' },
            { value: 55, label: 'LP' },
            { value: 40, label: 'RG' },
            { value: 22, label: 'ST' },
          ]}
        />
        <ChartCard
          title="Atenciones por servicio"
          bars={[
            { value: 92, label: 'Sub' },
            { value: 68, label: 'Cre' },
            { value: 51, label: 'AI' },
            { value: 33, label: 'Afi' },
            { value: 18, label: 'Mkt' },
            { value: 9, label: 'PQ' },
          ]}
        />
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
          <span className="breadcrumb">Historial / Detalle de atencion</span>
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
          &larr; Volver al historial
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
              <div key={service} className="service-chip" role="listitem">
                <span className="service-chip-icon">
                  <ServiceSvgIcon service={service} />
                </span>
                <strong>{service}</strong>
              </div>
            ))}
          </div>
          <div className="turnero-form">
            <FormCard title="Datos del cliente">
              <div className="field-grid">
                <label>
                  Cedula <span className="required-mark" aria-hidden="true">*</span>
                  <input placeholder="Ingresa tu numero de cedula" inputMode="numeric" />
                </label>
                <label>
                  Nombre completo <span className="required-mark" aria-hidden="true">*</span>
                  <input placeholder="Ingresa tu nombre completo" autoComplete="name" />
                </label>
                <label>
                  Telefono
                  <input placeholder="Ingresa tu numero de telefono" inputMode="tel" autoComplete="tel" />
                </label>
                <label>
                  Correo electronico
                  <input placeholder="ejemplo@correo.com" type="email" autoComplete="email" />
                </label>
              </div>
            </FormCard>
            <FormCard title="Informacion de la atencion">
              <div className="field-grid two-cols">
                <label>
                  Servicio <span className="required-mark" aria-hidden="true">*</span>
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
              <span className="queue-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.6rem', height: '1.6rem', color: 'var(--blue)' }} aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <h3>Tiempo estimado de espera</h3>
              <strong>15</strong>
              <span>minutos</span>
              <p>El tiempo de espera puede variar segun la demanda.</p>
            </div>
            <div className="queue-card">
              <span className="queue-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.6rem', height: '1.6rem', color: 'var(--blue)' }} aria-hidden="true">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </span>
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
            <th scope="col">Codigo</th>
            <th scope="col">Fecha y hora</th>
            <th scope="col">Cliente</th>
            <th scope="col">Servicio</th>
            <th scope="col">Motivo</th>
            <th scope="col">Estado</th>
            <th scope="col">Asesor</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="code-cell">{row.id}</td>
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
                  Ver &rarr;
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
      <p className="text-card-body">{text}</p>
    </section>
  )
}

function ChartCard({ title, bars }) {
  const max = Math.max(...bars.map((b) => b.value))
  return (
    <section className="panel chart-card">
      <h3>{title}</h3>
      <div className="bars">
        {bars.map((bar, index) => (
          <div key={index} className="bar-group">
            <span className="bar-value">{bar.value}</span>
            <div className="bar-track">
              <span className="bar-fill" style={{ height: `${(bar.value / max) * 100}%` }} />
            </div>
            <span className="bar-axis-label">{bar.label}</span>
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
      <div className="donut-wrap">
        <div className="donut" role="img" aria-label="Distribucion: 71.5% cerradas, 20.5% pendientes, 8% escaladas" />
        <div className="donut-center">
          <strong>358</strong>
          <span>total</span>
        </div>
      </div>
      <div className="legend">
        <span><i className="blue" aria-hidden="true" /> Cerradas <strong>256</strong></span>
        <span><i className="amber" aria-hidden="true" /> Pendientes <strong>73</strong></span>
        <span><i className="red" aria-hidden="true" /> Escaladas <strong>29</strong></span>
      </div>
    </section>
  )
}

function LineCard() {
  const points = [
    { x: 24, y: 85, label: 'L', value: 12 },
    { x: 65, y: 60, label: 'M', value: 18 },
    { x: 106, y: 44, label: 'X', value: 22 },
    { x: 147, y: 22, label: 'J', value: 28 },
    { x: 188, y: 55, label: 'V', value: 19 },
    { x: 224, y: 70, label: 'S', value: 15 },
  ]
  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ')
  const areaStr = `${points[0].x},104 ${polylineStr} ${points[points.length - 1].x},104`

  return (
    <section className="panel chart-card">
      <h3>Atenciones por dia</h3>
      <svg viewBox="0 0 248 120" className="line-chart" role="img" aria-label="Grafico de atenciones por dia de la semana">
        {[25, 50, 75].map((y) => (
          <line key={y} x1="10" y1={y} x2="238" y2={y} stroke="#e8eefc" strokeWidth="1" />
        ))}
        <polygon points={areaStr} fill="rgba(22,100,234,0.07)" />
        <polyline fill="none" stroke="#1664ea" strokeWidth="2.5" strokeLinejoin="round" points={polylineStr} />
        {points.map((p) => (
          <g key={p.x}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="#1664ea" strokeWidth="2.5" />
            <text x={p.x} y="116" textAnchor="middle" fontSize="9" fill="#6d789a" fontFamily="inherit">{p.label}</text>
            <title>{p.label}: {p.value} atenciones</title>
          </g>
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
