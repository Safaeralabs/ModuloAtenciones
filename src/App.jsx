import { useEffect, useState } from 'react'
import { attentions } from './mockData'
import { getAtenciones, login, logout, getToken } from './api'
import { defaultPrivateScreen, allowedScreens, publicScreens } from './constants'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { LoginScreen } from './components/LoginScreen'
import { Dashboard } from './modules/atenciones/Dashboard'
import { RegisterAttention } from './modules/atenciones/RegisterAttention'
import { AttentionDetail } from './modules/atenciones/AttentionDetail'
import { Reports } from './modules/atenciones/Reports'
import { PublicTurnero } from './modules/turnero/PublicTurnero'
import { KioskScreen } from './modules/turnero/KioskScreen'
import { TvScreen } from './modules/turnero/TvScreen'
import { UsuariosAdmin } from './modules/usuarios/UsuariosAdmin'
import { VentaForm } from './modules/ventas/VentaForm'
import { VentaDetalle } from './modules/ventas/VentaDetalle'
import { CotizacionForm } from './modules/cotizaciones/CotizacionForm'
import { CotizacionesLista } from './modules/cotizaciones/CotizacionesLista'
import { CotizacionDetalle } from './modules/cotizaciones/CotizacionDetalle'
import { FacturaForm } from './modules/facturas/FacturaForm'
import { FacturasBandeja } from './modules/facturas/FacturasBandeja'
import { DashboardCoordinador } from './modules/bi/DashboardCoordinador'
import { CatalogosAdmin } from './modules/parametros/CatalogosAdmin'
import { AuditoriaAdmin } from './modules/auditoria/AuditoriaAdmin'

function App() {
  const [screen, setScreen] = useState('login')
  // Pestana activa dentro de Inicio: 'resumen' | 'historial' | 'ventas'.
  const [dashboardTab, setDashboardTab] = useState('resumen')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [selectedAttention, setSelectedAttention] = useState(attentions[2])
  const [registerCtx, setRegisterCtx] = useState(null)
  const [ventaCtx, setVentaCtx] = useState(null)
  const [ventaSeleccionadaId, setVentaSeleccionadaId] = useState(null)
  const [cotizacionCtx, setCotizacionCtx] = useState(null)
  const [cotizacionSeleccionadaId, setCotizacionSeleccionadaId] = useState(null)
  const [realAtenciones, setRealAtenciones] = useState([])
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('turnero-user'))
    } catch {
      return null
    }
  })

  // Historial = atenciones reales del backend, ya filtradas por rol en el
  // servidor (propias para asesores, todas para coordinador/admin). Ya no se
  // mezclan datos de ejemplo: mostrarian lo mismo a todos sin importar el rol.
  const allAtenciones = realAtenciones

  const refreshAtenciones = () => {
    getAtenciones()
      .then((data) => setRealAtenciones(data.atenciones || []))
      .catch(() => {})
  }

  useEffect(() => {
    refreshAtenciones()
  }, [])

  useEffect(() => {
    const syncFromHash = () => {
      const savedAuth = Boolean(getToken())
      setIsAuthenticated(savedAuth)

      const next = window.location.hash.replace('#', '')
      const normalized = allowedScreens.has(next)
        ? next
        : savedAuth
          ? defaultPrivateScreen
          : 'login'

      if (!savedAuth && normalized !== 'login' && !publicScreens.has(normalized)) {
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
    const savedAuth = Boolean(getToken())
    const target = !savedAuth && normalized !== 'login' && !publicScreens.has(normalized) ? 'login' : normalized
    window.location.hash = target
    setIsMobileMenuOpen(false)
    // Al entrar a Inicio (ej. desde el menu) se resetea a la pestana Resumen;
    // los flujos que necesitan una pestana especifica la fijan justo despues
    // de llamar a goTo('dashboard'), en el mismo manejador (gana la ultima).
    if (target === 'dashboard') setDashboardTab('resumen')
    setScreen(target)
  }

  const handleLogin = (loggedUser) => {
    window.localStorage.setItem('turnero-user', JSON.stringify(loggedUser))
    setUser(loggedUser)
    setIsAuthenticated(true)
    window.location.hash = defaultPrivateScreen
    setScreen(defaultPrivateScreen)
  }

  const handleLogout = () => {
    logout()
    window.localStorage.removeItem('turnero-user')
    setUser(null)
    setIsAuthenticated(false)
    setIsMobileMenuOpen(false)
    goTo('login')
  }

  const openAttentionDetail = (item) => {
    setSelectedAttention(item)
    goTo('detail')
  }

  const openRegister = (context = null) => {
    setRegisterCtx(context)
    goTo('register')
  }

  const onAtencionGuardada = (record) => {
    setRegisterCtx(null)
    refreshAtenciones()
    // Si el resultado fue 'Venta directa' o 'Cotizacion generada', se encadena
    // al formulario correspondiente prellenado (seccion 4.2 y 11 del plan).
    if (record?.abrirFlujo === 'venta') {
      openVentaForm(record.prefill)
    } else if (record?.abrirFlujo === 'cotizacion') {
      openCotizacionForm(record.prefill)
    } else {
      goTo('dashboard')
      setDashboardTab('historial')
    }
  }

  const openVentaForm = (prefill = null) => {
    setVentaCtx(prefill)
    goTo('ventas-nueva')
  }

  const openVentaDetail = (id) => {
    setVentaSeleccionadaId(id)
    goTo('ventas-detalle')
  }

  const volverAVentas = () => {
    goTo('dashboard')
    setDashboardTab('ventas')
  }

  const onVentaGuardada = () => {
    setVentaCtx(null)
    volverAVentas()
  }

  const openCotizacionForm = (prefill = null) => {
    setCotizacionCtx(prefill)
    goTo('cotizaciones-nueva')
  }

  const openCotizacionDetail = (id) => {
    setCotizacionSeleccionadaId(id)
    goTo('cotizaciones-detalle')
  }

  const onCotizacionGuardada = () => {
    setCotizacionCtx(null)
    goTo('cotizaciones')
  }

  // Desde una cotizacion Aprobada, "Registrar venta" lleva al mismo formulario
  // de venta que usa el flujo atencion->venta, ya prellenado (F3-3 del plan).
  const onCotizacionConvertir = (prefill) => {
    openVentaForm(prefill)
  }

  if (!isAuthenticated && !publicScreens.has(screen)) {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (screen === 'turnero') {
    return <PublicTurnero onBack={() => goTo(isAuthenticated ? 'dashboard' : 'login')} />
  }

  if (screen === 'kiosko') {
    return <KioskScreen onBack={() => goTo(isAuthenticated ? 'dashboard' : 'login')} />
  }

  if (screen === 'tv') {
    return <TvScreen onBack={() => goTo(isAuthenticated ? 'dashboard' : 'login')} />
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
      <Sidebar current={screen} onNavigate={goTo} isMobileMenuOpen={isMobileMenuOpen} user={user} />
      <main className="content-area">
        <Topbar user={user} onToggleMenu={() => setIsMobileMenuOpen((value) => !value)} onLogout={handleLogout} />
        {screen === 'dashboard' && (
          <Dashboard
            user={user}
            atenciones={allAtenciones}
            activeTab={dashboardTab}
            onChangeTab={setDashboardTab}
            onNewAttention={() => openRegister(null)}
            onOpenDetail={openAttentionDetail}
            onRegistrarTurno={openRegister}
            onNewVenta={() => openVentaForm(null)}
            onOpenVentaDetail={openVentaDetail}
          />
        )}
        {screen === 'register' && (
          <RegisterAttention
            initial={registerCtx}
            onCancel={() => {
              goTo('dashboard')
              setDashboardTab(registerCtx ? 'resumen' : 'historial')
            }}
            onSaved={onAtencionGuardada}
          />
        )}
        {screen === 'detail' && (
          <AttentionDetail
            attention={selectedAttention}
            onBack={() => {
              goTo('dashboard')
              setDashboardTab('historial')
            }}
          />
        )}
        {screen === 'reports' && <Reports onSelect={openAttentionDetail} />}
        {screen === 'ventas-nueva' && (
          <VentaForm initial={ventaCtx} onCancel={volverAVentas} onSaved={onVentaGuardada} />
        )}
        {screen === 'ventas-detalle' && (
          <VentaDetalle ventaId={ventaSeleccionadaId} user={user} onBack={volverAVentas} />
        )}
        {screen === 'cotizaciones' && (
          <CotizacionesLista user={user} onCreate={() => openCotizacionForm(null)} onSelect={openCotizacionDetail} />
        )}
        {screen === 'cotizaciones-nueva' && (
          <CotizacionForm initial={cotizacionCtx} onCancel={() => goTo('cotizaciones')} onSaved={onCotizacionGuardada} />
        )}
        {screen === 'cotizaciones-detalle' && (
          <CotizacionDetalle
            cotizacionId={cotizacionSeleccionadaId}
            user={user}
            onBack={() => goTo('cotizaciones')}
            onConvertir={onCotizacionConvertir}
          />
        )}
        {screen === 'facturas' && (
          <FacturasBandeja user={user} onCreate={() => goTo('facturas-nueva')} />
        )}
        {screen === 'facturas-nueva' && (
          <FacturaForm onCancel={() => goTo('facturas')} onSaved={() => goTo('facturas')} />
        )}
        {screen === 'bi-coordinador' && (
          user?.rol === 'coordinador' || user?.rol === 'admin'
            ? <DashboardCoordinador />
            : <section className="page"><div className="panel"><p>No tienes permiso para ver esta seccion.</p></div></section>
        )}
        {screen === 'parametrizacion' && (
          user?.rol === 'coordinador' || user?.rol === 'admin'
            ? <CatalogosAdmin user={user} />
            : <section className="page"><div className="panel"><p>No tienes permiso para ver esta seccion.</p></div></section>
        )}
        {screen === 'auditoria' && (
          user?.rol === 'coordinador' || user?.rol === 'admin'
            ? <AuditoriaAdmin user={user} />
            : <section className="page"><div className="panel"><p>No tienes permiso para ver esta seccion.</p></div></section>
        )}
        {screen === 'usuarios' && (
          user?.rol === 'admin'
            ? <UsuariosAdmin />
            : <section className="page"><div className="panel"><p>No tienes permiso para ver esta seccion.</p></div></section>
        )}
      </main>
    </div>
  )
}

export default App
