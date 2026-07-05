import { serviceOptions } from '../../mockData'
import { FormCard } from '../../components/FormCard'
import { Logo } from '../../components/Logo'
import { ServiceSvgIcon } from '../../components/icons'

export function PublicTurnero({ onBack }) {
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
