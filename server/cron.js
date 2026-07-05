import cron from 'node-cron'
import { marcarVencidas, generarAlertasPorVencer } from './cotizaciones.js'
import { respaldarBaseDatos } from './backup.js'

// Tarea programada diaria (seccion 6.4 y Fase 3 / F3-4 del plan):
//  1. Vence las cotizaciones 'pendiente' cuya fecha limite ya paso.
//  2. Notifica al asesor las que estan a 2 dias de vencer.
// Corre todos los dias a las 6:00 hora de Bogota.
export function iniciarTareasProgramadas() {
  cron.schedule(
    '0 6 * * *',
    async () => {
      try {
        const vencidas = await marcarVencidas()
        const alertas = await generarAlertasPorVencer()
        console.log(`[cron] cotizaciones vencidas: ${vencidas}, alertas nuevas: ${alertas}`)
      } catch (err) {
        console.error('[cron] error en tarea diaria de cotizaciones:', err)
      }
    },
    { timezone: 'America/Bogota' },
  )

  // Respaldo diario de la BD (RNF Backup, seccion 12). 2:00 am, fuera del horario
  // de atencion (7am-6pm). Desactivable con BACKUP_ENABLED=false.
  if (String(process.env.BACKUP_ENABLED || 'true').toLowerCase() !== 'false') {
    cron.schedule(
      '0 2 * * *',
      async () => {
        try {
          const { destino, borradas } = await respaldarBaseDatos()
          console.log(`[cron] respaldo creado: ${destino}` + (borradas ? ` (${borradas} antiguas eliminadas)` : ''))
        } catch (err) {
          console.error('[cron] error en respaldo diario:', err.message)
        }
      },
      { timezone: 'America/Bogota' },
    )
  }
}
