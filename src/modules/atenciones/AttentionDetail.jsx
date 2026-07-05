import { DetailCard, TextCard } from '../../components/DetailCard'
import { PageHeader } from '../../components/PageHeader'
import { SisuReadOnly } from '../../components/SisuReadOnly'
import { dash, siNo, tieneMercadeo } from '../../utils'
import { RESULTADO_LABELS } from '../../constants'

export function AttentionDetail({ attention, onBack }) {
  const escalation = attention.escalation

  return (
    <section className="page">
      <PageHeader
        breadcrumb="Historial / Detalle de atencion"
        title={attention.id}
        description={`Fecha de registro: ${attention.date}`}
        actions={
          <>
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
          </>
        }
      />
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
            ['Resultado', attention.resultado ? (RESULTADO_LABELS[attention.resultado] || attention.resultado) : '—'],
          ]}
        />
        <TextCard title="Gestion realizada" text={attention.management} />
        <TextCard title="Observaciones" text={attention.observations} />
        {attention.sisu && (
          <div className="detail-full">
            <SisuReadOnly sisu={attention.sisu} />
          </div>
        )}
        {tieneMercadeo(attention) && (
          <DetailCard
            wide
            title="Oportunidad de mercadeo"
            items={[
              ['Productos de interes', attention.interes?.length ? attention.interes.join(', ') : '—'],
              ['Consentimiento de seguimiento', siNo(attention.consentimiento)],
              ['Accion de seguimiento', dash(attention.accionSeguimiento)],
              ['Fecha de seguimiento', dash(attention.fechaSeguimiento)],
              ['Nota de mercadeo', dash(attention.notaMercadeo)],
            ]}
          />
        )}
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
