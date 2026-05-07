export const metrics = [
  { label: 'Atenciones del dia', value: 18, note: 'Total realizadas hoy', tone: 'blue' },
  { label: 'Pendientes', value: 7, note: 'Atenciones en espera', tone: 'amber' },
  { label: 'Escaladas', value: 3, note: 'Atenciones escaladas', tone: 'red' },
]

export const attentions = [
  {
    id: 'AT-2024-001245',
    date: '24/05/2024 09:15 a.m.',
    client: 'Juan Perez Gomez',
    document: '1.065.789.123',
    phone: '301 245 8891',
    email: 'juan.perez@email.com',
    address: 'Calle 8 # 14-22',
    city: 'Riohacha, La Guajira',
    service: 'Subsidio',
    motive: 'No pago',
    status: 'Cerrada',
    advisor: 'Maria Fernanda',
    channel: 'Presencial',
    duration: '00:18:25',
    management:
      'Se valida novedad de pago en el sistema. Se orienta al usuario sobre fechas de giro y se confirma estado de liquidacion vigente.',
    observations:
      'El usuario queda informado sobre el proceso y no requiere escalamiento adicional.',
    escalation: null,
  },
  {
    id: 'AT-2024-001244',
    date: '24/05/2024 08:45 a.m.',
    client: 'Ana Lucia Mejia',
    document: '1.048.573.654',
    phone: '300 812 4410',
    email: 'ana.mejia@email.com',
    address: 'Carrera 12 # 9-31',
    city: 'Maicao, La Guajira',
    service: 'Credito',
    motive: 'Informacion credito',
    status: 'Pendiente',
    advisor: 'Maria Fernanda',
    channel: 'Telefonico',
    duration: '00:22:10',
    management:
      'Se explican requisitos para credito social, montos disponibles y documentacion pendiente para radicacion.',
    observations:
      'Pendiente envio de soportes por parte de la usuaria para continuar con el tramite.',
    escalation: null,
  },
  {
    id: 'AT-2024-001243',
    date: '23/05/2024 04:30 p.m.',
    client: 'Carlos Mario Ruiz',
    document: '1.007.654.321',
    phone: '300 555 1234',
    email: 'carlos.ruiz@email.com',
    address: 'Cra 15 # 12-45',
    city: 'Riohacha, La Guajira',
    service: 'Asesor Integral',
    motive: 'Certificado estudiantil',
    status: 'Escalada',
    advisor: 'Laura Diaz',
    channel: 'Presencial',
    duration: '00:30:45',
    management:
      'Se recibio solicitud del usuario para validacion de certificado estudiantil. Se revisan requisitos en el sistema y se verifica informacion academica. Se informa al usuario que el certificado sera generado y enviado por correo en un plazo de 3 dias habiles.',
    observations:
      'El usuario manifiesta que necesita el certificado con urgencia para presentar en la universidad. Se le indica canal virtual para descargarlo cuando este disponible.',
    escalation: {
      area: 'Educacion',
      reason: 'Validacion academica',
      manager: 'Jorge Luis Perez',
      date: '23/05/2024 05:10 p.m.',
      dueDate: '27/05/2024',
    },
  },
  {
    id: 'AT-2024-001242',
    date: '23/05/2024 03:00 p.m.',
    client: 'Laura Vanessa Diaz',
    document: '1.098.765.432',
    phone: '302 711 9020',
    email: 'laura.vanessa@email.com',
    address: 'Calle 16 # 7-18',
    city: 'Fonseca, La Guajira',
    service: 'Mercadeo',
    motive: 'Informacion general',
    status: 'Cerrada',
    advisor: 'Juan Perez',
    channel: 'WhatsApp',
    duration: '00:15:30',
    management:
      'Se brinda informacion sobre campañas vigentes y canales oficiales para postulacion a actividades comerciales.',
    observations:
      'La usuaria solicita recibir futuras novedades por correo electronico.',
    escalation: null,
  },
  {
    id: 'AT-2024-001241',
    date: '23/05/2024 11:20 a.m.',
    client: 'Jorge Luis Epieyu',
    document: '1.015.432.109',
    phone: '300 116 3420',
    email: 'jorge.epieyu@email.com',
    address: 'Via Albania km 2',
    city: 'Uribia, La Guajira',
    service: 'Subsidio',
    motive: 'Kit escolar',
    status: 'Pendiente',
    advisor: 'Carlos Ruiz',
    channel: 'Presencial',
    duration: '00:20:40',
    management:
      'Se valida nucleo familiar y se orienta sobre disponibilidad de kit escolar segun cronograma institucional.',
    observations:
      'Caso pendiente por confirmacion de inventario en punto de entrega.',
    escalation: null,
  },
]

export const reportCards = [
  { label: 'Total de atenciones', value: '1.248', helper: 'En el periodo seleccionado', tone: 'blue' },
  { label: 'Atenciones cerradas', value: '892', helper: '71.5% del total', tone: 'green' },
  { label: 'Pendientes', value: '256', helper: '20.5% del total', tone: 'amber' },
  { label: 'Escaladas', value: '100', helper: '8.0% del total', tone: 'red' },
]

export const serviceOptions = ['Subsidio', 'Credito', 'Asesor Integral', 'Mercadeo', 'Afiliaciones', 'PQRS']
export const statusOptions = ['Cerrada', 'Pendiente', 'Escalada']
