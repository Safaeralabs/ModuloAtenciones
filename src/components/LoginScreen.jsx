import { useState } from 'react'
import { login } from '../api'
import { Logo } from './Logo'
import { EyeIcon, EyeOffIcon } from './icons'

export function LoginScreen({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const loggedUser = await login(username, password)
      onLogin(loggedUser)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="brand-header">
        <Logo />
      </div>
      <form className="login-card" onSubmit={submit}>
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
            <input
              placeholder="Ingresa tu usuario"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            Contrasena
            <div className="password-field">
              <input
                placeholder="Ingresa tu contrasena"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="primary-button large" type="submit" disabled={busy}>
          {busy ? 'Ingresando...' : 'Iniciar sesion'}
        </button>
        <div className="separator">o</div>
        <div className="support-copy">Necesitas ayuda? Contacta al area de sistemas.</div>
      </form>
    </div>
  )
}
