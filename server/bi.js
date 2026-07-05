import db from './db.js'

// Dashboard individual del asesor (seccion 9.1 del plan). Fase 2 solo cubre
// las metricas que dependen de atenciones + ventas; las de cotizaciones
// (mis cotizaciones activas, tasa de conversion, alertas de vencimiento) se
// suman en la Fase 3 cuando exista el modulo de Cotizaciones.
export async function biAsesor(userId) {
  const [[{ n: atencionesHoy }]] = await db.query(
    `SELECT COUNT(*) AS n FROM atenciones
     WHERE id_asesor = ? AND DATE(FROM_UNIXTIME(created_at / 1000)) = CURDATE()`,
    [userId],
  )
  const [[{ n: atencionesSemana }]] = await db.query(
    `SELECT COUNT(*) AS n FROM atenciones
     WHERE id_asesor = ? AND YEARWEEK(FROM_UNIXTIME(created_at / 1000), 3) = YEARWEEK(CURDATE(), 3)`,
    [userId],
  )
  const [[{ n: atencionesMes }]] = await db.query(
    `SELECT COUNT(*) AS n FROM atenciones
     WHERE id_asesor = ?
       AND MONTH(FROM_UNIXTIME(created_at / 1000)) = MONTH(CURDATE())
       AND YEAR(FROM_UNIXTIME(created_at / 1000)) = YEAR(CURDATE())`,
    [userId],
  )

  const [[{ total: ventasMesActual }]] = await db.query(
    `SELECT COALESCE(SUM(valor_total), 0) AS total FROM ventas
     WHERE id_vendedor = ? AND estado = 'activa'
       AND MONTH(fecha_registro) = MONTH(CURDATE()) AND YEAR(fecha_registro) = YEAR(CURDATE())`,
    [userId],
  )
  const [[{ total: ventasMesAnterior }]] = await db.query(
    `SELECT COALESCE(SUM(valor_total), 0) AS total FROM ventas
     WHERE id_vendedor = ? AND estado = 'activa'
       AND MONTH(fecha_registro) = MONTH(CURDATE() - INTERVAL 1 MONTH)
       AND YEAR(fecha_registro) = YEAR(CURDATE() - INTERVAL 1 MONTH)`,
    [userId],
  )

  const [ventasPorServicio] = await db.query(
    `SELECT servicio, COALESCE(SUM(valor_total), 0) AS total FROM ventas
     WHERE id_vendedor = ? AND estado = 'activa'
     GROUP BY servicio ORDER BY total DESC`,
    [userId],
  )

  const [resultadoAtenciones] = await db.query(
    `SELECT resultado, COUNT(*) AS total FROM atenciones
     WHERE id_asesor = ? AND resultado IS NOT NULL AND resultado <> ''
     GROUP BY resultado ORDER BY total DESC`,
    [userId],
  )

  return {
    atencionesHoy,
    atencionesSemana,
    atencionesMes,
    ventasMesActual: Number(ventasMesActual),
    ventasMesAnterior: Number(ventasMesAnterior),
    ventasPorServicio: ventasPorServicio.map((r) => ({ servicio: r.servicio, total: Number(r.total) })),
    resultadoAtenciones: resultadoAtenciones.map((r) => ({ resultado: r.resultado, total: r.total })),
  }
}

// ─── Dashboard consolidado del coordinador (seccion 9.2 del plan) ──────────
//
// NOTA importante: `atenciones.service` es la VENTANILLA/linea de atencion
// del turnero (Subsidio, Credito, Mercadeo, etc.), un concepto distinto del
// catalogo comercial de servicios (Recreacion/Educacion/Turismo) que usan
// ventas y cotizaciones. Por eso el filtro `servicio` del coordinador (que
// se refiere al catalogo comercial) solo se aplica a las consultas de ventas
// y cotizaciones, nunca a las de atenciones.

// alias: prefijo de columna opcional ("a.", "v.", "c.") para usar en queries
// con JOIN, donde columnas como `sede` existen tanto en la tabla de negocio
// como en `usuarios` y quedarian ambiguas sin prefijo.
function condicionesAtenciones({ asesor, desde, hasta, sede }, alias = '') {
  const condiciones = []
  const params = []
  if (asesor) {
    condiciones.push(`${alias}id_asesor = ?`)
    params.push(asesor)
  }
  if (desde) {
    condiciones.push(`DATE(FROM_UNIXTIME(${alias}created_at / 1000)) >= ?`)
    params.push(desde)
  }
  if (hasta) {
    condiciones.push(`DATE(FROM_UNIXTIME(${alias}created_at / 1000)) <= ?`)
    params.push(hasta)
  }
  if (sede) {
    condiciones.push(`${alias}sede = ?`)
    params.push(sede)
  }
  return { condiciones, params }
}

function condicionesVentas({ asesor, servicio, actividad, desde, hasta, sede }, alias = '') {
  const condiciones = [`${alias}estado = 'activa'`]
  const params = []
  if (asesor) {
    condiciones.push(`${alias}id_vendedor = ?`)
    params.push(asesor)
  }
  if (servicio) {
    condiciones.push(`${alias}servicio = ?`)
    params.push(servicio)
  }
  if (actividad) {
    condiciones.push(`${alias}actividad = ?`)
    params.push(actividad)
  }
  if (desde) {
    condiciones.push(`${alias}fecha_registro >= ?`)
    params.push(desde)
  }
  if (hasta) {
    condiciones.push(`${alias}fecha_registro <= ?`)
    params.push(hasta)
  }
  if (sede) {
    condiciones.push(`${alias}sede = ?`)
    params.push(sede)
  }
  return { condiciones, params }
}

function condicionesCotizaciones({ asesor, servicio, desde, hasta, sede }, alias = '') {
  const condiciones = [`${alias}anulada = 0`]
  const params = []
  if (asesor) {
    condiciones.push(`${alias}id_asesor = ?`)
    params.push(asesor)
  }
  if (servicio) {
    condiciones.push(`${alias}servicio = ?`)
    params.push(servicio)
  }
  if (desde) {
    condiciones.push(`${alias}fecha_cotizacion >= ?`)
    params.push(desde)
  }
  if (hasta) {
    condiciones.push(`${alias}fecha_cotizacion <= ?`)
    params.push(hasta)
  }
  if (sede) {
    condiciones.push(`${alias}sede = ?`)
    params.push(sede)
  }
  return { condiciones, params }
}

const aWhere = (c) => (c.condiciones.length ? `WHERE ${c.condiciones.join(' AND ')}` : '')

export async function biCoordinador(filtros = {}) {
  // Consultas sin JOIN: columnas sin prefijo (una sola tabla, sin ambiguedad).
  const atSolo = condicionesAtenciones(filtros)
  const veSolo = condicionesVentas(filtros)
  const coSolo = condicionesCotizaciones(filtros)
  // Consultas con JOIN a usuarios: columnas prefijadas con el alias de la tabla de negocio.
  const atJoin = condicionesAtenciones(filtros, 'a.')
  const veJoin = condicionesVentas(filtros, 'v.')
  const coJoin = condicionesCotizaciones(filtros, 'c.')

  // 1. Ranking de atenciones por asesor.
  const [rankingAtenciones] = await db.query(
    `SELECT u.nombre AS asesor, COUNT(*) AS total FROM atenciones a
     JOIN usuarios u ON u.id = a.id_asesor
     ${aWhere(atJoin)}
     GROUP BY u.id, u.nombre ORDER BY total DESC`,
    atJoin.params,
  )

  // 2. Atenciones por servicio (ventanilla) y resultado.
  const whereAtSolo = aWhere(atSolo)
  const [atencionesPorServicioResultado] = await db.query(
    `SELECT service AS servicio, resultado, COUNT(*) AS total FROM atenciones
     ${whereAtSolo ? `${whereAtSolo} AND resultado IS NOT NULL AND resultado <> ''` : "WHERE resultado IS NOT NULL AND resultado <> ''"}
     GROUP BY service, resultado ORDER BY servicio, total DESC`,
    atSolo.params,
  )

  // 3. Evolucion temporal (atenciones por dia).
  const [evolucionAtenciones] = await db.query(
    `SELECT DATE(FROM_UNIXTIME(created_at / 1000)) AS dia, COUNT(*) AS total FROM atenciones
     ${whereAtSolo}
     GROUP BY dia ORDER BY dia`,
    atSolo.params,
  )

  // 4. Pipeline de cotizaciones (embudo por estado).
  const [pipelineCotizaciones] = await db.query(
    `SELECT estado, COUNT(*) AS total, COALESCE(SUM(valor_total), 0) AS valor FROM cotizaciones
     ${aWhere(coSolo)}
     GROUP BY estado`,
    coSolo.params,
  )

  // 5. Tasa de conversion por asesor (convertidas / elaboradas).
  const [conversionRaw] = await db.query(
    `SELECT u.nombre AS asesor, COUNT(*) AS totalElaboradas,
            SUM(CASE WHEN c.estado = 'convertida' THEN 1 ELSE 0 END) AS totalConvertidas
     FROM cotizaciones c JOIN usuarios u ON u.id = c.id_asesor
     ${aWhere(coJoin)}
     GROUP BY u.id, u.nombre ORDER BY totalElaboradas DESC`,
    coJoin.params,
  )

  // 6. Ventas totales del periodo.
  const [[{ total: ventasTotales }]] = await db.query(
    `SELECT COALESCE(SUM(valor_total), 0) AS total FROM ventas ${aWhere(veSolo)}`,
    veSolo.params,
  )

  // 7. Ventas por servicio y actividad.
  const [ventasPorServicioActividad] = await db.query(
    `SELECT servicio, actividad, COALESCE(SUM(valor_total), 0) AS total FROM ventas
     ${aWhere(veSolo)}
     GROUP BY servicio, actividad ORDER BY total DESC`,
    veSolo.params,
  )

  // 8. Ticket promedio por asesor y servicio.
  const [ticketPromedio] = await db.query(
    `SELECT u.nombre AS asesor, v.servicio, AVG(v.valor_total) AS promedio, COUNT(*) AS cantidad
     FROM ventas v JOIN usuarios u ON u.id = v.id_vendedor
     ${aWhere(veJoin)}
     GROUP BY u.id, u.nombre, v.servicio ORDER BY promedio DESC`,
    veJoin.params,
  )

  // 9. Cotizaciones rechazadas y motivos (analisis de perdida).
  const [rechazosPorMotivo] = await db.query(
    `SELECT motivo_rechazo AS motivo, COUNT(*) AS total, COALESCE(SUM(valor_total), 0) AS valorPerdido
     FROM cotizaciones
     ${aWhere(coSolo)} AND estado = 'rechazada'
     GROUP BY motivo_rechazo ORDER BY valorPerdido DESC`,
    coSolo.params,
  )

  // 10. Cotizaciones vencidas sin gestion (alertas).
  const [vencidasSinGestion] = await db.query(
    `SELECT c.id, c.nombre_cliente, c.valor_total, c.fecha_limite_confirmacion, u.nombre AS asesor
     FROM cotizaciones c JOIN usuarios u ON u.id = c.id_asesor
     ${aWhere(coJoin)} AND c.estado = 'vencida'
     ORDER BY c.fecha_limite_confirmacion ASC`,
    coJoin.params,
  )

  return {
    rankingAtenciones: rankingAtenciones.map((r) => ({ asesor: r.asesor, total: r.total })),
    atencionesPorServicioResultado,
    evolucionAtenciones,
    pipelineCotizaciones: pipelineCotizaciones.map((r) => ({ estado: r.estado, total: r.total, valor: Number(r.valor) })),
    conversionPorAsesor: conversionRaw.map((r) => ({
      asesor: r.asesor,
      totalElaboradas: r.totalElaboradas,
      totalConvertidas: r.totalConvertidas,
      tasa: r.totalElaboradas > 0 ? r.totalConvertidas / r.totalElaboradas : 0,
    })),
    ventasTotales: Number(ventasTotales),
    ventasPorServicioActividad: ventasPorServicioActividad.map((r) => ({
      servicio: r.servicio,
      actividad: r.actividad,
      total: Number(r.total),
    })),
    ticketPromedio: ticketPromedio.map((r) => ({
      asesor: r.asesor,
      servicio: r.servicio,
      promedio: Number(r.promedio),
      cantidad: r.cantidad,
    })),
    rechazosPorMotivo: rechazosPorMotivo.map((r) => ({
      motivo: r.motivo || 'Sin motivo',
      total: r.total,
      valorPerdido: Number(r.valorPerdido),
    })),
    vencidasSinGestion: vencidasSinGestion.map((r) => ({
      id: r.id,
      nombreCliente: r.nombre_cliente,
      valorTotal: Number(r.valor_total),
      fechaLimiteConfirmacion: r.fecha_limite_confirmacion,
      asesor: r.asesor,
    })),
  }
}
