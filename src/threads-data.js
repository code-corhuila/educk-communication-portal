// Institutional domain fixtures aligned with educk-communication-db/seeds/01_seed_test_messages.sql
export const CURRENT_USER_ID = '11111111-1111-1111-1111-111111111111';
export const TEACHER_USER_ID = '22222222-2222-2222-2222-222222222222';
export const STUDENTS_DIRECTORY = {
  's-4402-juan-chala': { id: 's-4402-juan-chala', name: 'Juan Sebastián Chala', grade: '10°A', average: '4.4 / 5.0', attendance: '98.2%', code: 'EST-2026-1042' },
  's-4403-valeria-chala': { id: 's-4403-valeria-chala', name: 'Valeria Chala Zambrano', grade: '6°B', average: '4.7 / 5.0', attendance: '99.1%', code: 'EST-2026-0618' }
};
export const INITIAL_CONTACTS = [
  { id: '22222222-2222-2222-2222-222222222222', name: 'Prof. Carlos Mendoza', role: 'Titular de Matemáticas', department: 'Departamento de Ciencias Exactas', category: 'DOCENTE', grade: 'Grado 10°A', email: 'carlos.mendoza@edutrack.edu.co', schedule: 'Mar y Jue · 2:00 p.m. – 4:00 p.m.', office: 'Bloque B · Aula 204', avatar: 'CM', avatarTheme: 'blue', status: 'online', statusLabel: 'Disponible', unread: 0, lastTime: '10:42 a.m.', lastMsg: 'Muchas gracias profesor por la pronta respuesta y el apoyo académico brindado.' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Prof. Laura Morales', role: 'Docente de Física y Laboratorio', department: 'Departamento de Ciencias Naturales', category: 'DOCENTE', grade: 'Grado 10°A', email: 'laura.morales@edutrack.edu.co', schedule: 'Lun y Mié · 10:00 a.m. – 12:00 m.', office: 'Laboratorio Central · Sala 102', avatar: 'LM', avatarTheme: 'teal', status: 'online', statusLabel: 'En laboratorio', unread: 1, lastTime: '09:15 a.m.', lastMsg: 'Apreciada madre de familia, le informamos que la práctica de cinemática se desarrollará el próximo martes en el laboratorio central.' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Prof. María Rodríguez', role: 'Titular de Lengua Castellana', department: 'Departamento de Humanidades', category: 'DOCENTE', grade: 'Grado 10°A', email: 'maria.rodriguez@edutrack.edu.co', schedule: 'Mié y Vie · 1:00 p.m. – 3:00 p.m.', office: 'Bloque A · Sala 301', avatar: 'MR', avatarTheme: 'indigo', status: 'online', statusLabel: 'Disponible', unread: 0, lastTime: 'Ayer', lastMsg: 'Excelente participación de Juan Sebastián en el foro de ensayo argumentativo.' },
  { id: '66666666-6666-6666-6666-666666666601', name: 'Mag. Juan Pérez', role: 'Coordinador Académico Bachillerato', department: 'Consejo Académico Institucional', category: 'COORDINACION', grade: 'Sección Bachillerato', email: 'coordinacion.academica@edutrack.edu.co', schedule: 'Lun a Vie · 7:30 a.m. – 12:30 p.m.', office: 'Edificio Administrativo · Of. 105', avatar: 'JP', avatarTheme: 'amber', status: 'away', statusLabel: 'En comité', unread: 0, lastTime: '18 oct', lastMsg: 'El cronograma de evaluaciones parciales del segundo corte ya se encuentra publicado.' }
];
export const INITIAL_CONVERSATION_THREADS = {
  '22222222-2222-2222-2222-222222222222': [
    { id: 'a1111111-1111-1111-1111-111111111101', senderId: CURRENT_USER_ID, receiverId: '22222222-2222-2222-2222-222222222222', subjectId: '33333333-3333-3333-3333-333333333333', topic: 'Consulta Académica', content: 'Buenas tardes profesor Carlos, quisiera consultar sobre los temas evaluados en el examen parcial de álgebra del próximo viernes.', createdAt: '2026-10-20T13:20:00.000Z', traceId: '4bf92f3577b34da6a3ce929d0e0e4736', status: 'LEÍDO' },
    { id: 'a1111111-1111-1111-1111-111111111102', senderId: '22222222-2222-2222-2222-222222222222', receiverId: CURRENT_USER_ID, subjectId: '33333333-3333-3333-3333-333333333333', topic: 'Seguimiento de Calificación', content: 'Estimada Sra. Ximena, cordial saludo. Los temas corresponden a ecuaciones cuadráticas y factorización (capítulos 3 y 4 del texto guía). El estudiante ha mostrado excelente progreso.', createdAt: '2026-10-20T14:05:00.000Z', traceId: '4bf92f3577b34da6a3ce929d0e0e4736', status: 'LEÍDO' },
    { id: 'a1111111-1111-1111-1111-111111111103', senderId: CURRENT_USER_ID, receiverId: '22222222-2222-2222-2222-222222222222', subjectId: '33333333-3333-3333-3333-333333333333', topic: 'Consulta Académica', content: 'Muchas gracias profesor por la pronta respuesta y el apoyo académico brindado.', createdAt: '2026-10-20T15:42:00.000Z', traceId: '4bf92f3577b34da6a3ce929d0e0e4736', status: 'LEÍDO' }
  ],
  '55555555-5555-5555-5555-555555555555': [
    { id: 'c3333333-3333-3333-3333-333333333301', senderId: '55555555-5555-5555-5555-555555555555', receiverId: CURRENT_USER_ID, subjectId: '66666666-6666-6666-6666-666666666666', topic: 'Observación General', content: 'Apreciada madre de familia, le informamos que la práctica de cinemática se desarrollará el próximo martes en el laboratorio central. Se requiere bata y guía impresa.', createdAt: '2026-10-21T14:15:00.000Z', traceId: '7ac19e4410b24cb99123a01f44e89012', status: 'ENTREGADO' }
  ],
  '44444444-4444-4444-4444-444444444444': [
    { id: 'MSG-90301', senderId: CURRENT_USER_ID, receiverId: '44444444-4444-4444-4444-444444444444', subjectId: '33333333-3333-3333-3333-333333333333', topic: 'Consulta Académica', content: 'Buenas tardes profesora María, quería saber qué obra literaria trabajarán durante las próximas tres semanas.', createdAt: '2026-10-19T19:15:00.000Z', traceId: '9de41a0988c14fa1a002b8812390ef11', status: 'LEÍDO' },
    { id: 'MSG-90304', senderId: '44444444-4444-4444-4444-444444444444', receiverId: CURRENT_USER_ID, subjectId: '77777777-7777-7777-7777-777777777777', topic: 'Seguimiento de Calificación', content: 'Excelente participación de Juan Sebastián en el foro de ensayo argumentativo. Iniciaremos la lectura crítica de ensayo latinoamericano contemporáneo.', createdAt: '2026-10-19T20:02:00.000Z', traceId: '9de41a0988c14fa1a002b8812390ef11', status: 'LEÍDO' }
  ],
  '66666666-6666-6666-6666-666666666601': [
    { id: 'MSG-90401', senderId: '66666666-6666-6666-6666-666666666601', receiverId: CURRENT_USER_ID, subjectId: '66666666-6666-6666-6666-666666666666', topic: 'Observación General', content: 'El cronograma de evaluaciones parciales del segundo corte ya se encuentra publicado en la sección de Circulares Oficiales.', createdAt: '2026-10-18T13:00:00.000Z', traceId: '3fa88b1209d44bc78901c22e77a12098', status: 'LEÍDO' }
  ]
};
export const INITIAL_ANNOUNCEMENTS = [
  { id: 'CIR-2026-042', title: 'Jornada de Entrega de Informes Académicos y Boletines — Segundo Corte', author: 'Rectoría Institucional y Consejo Académico', date: '2026-10-20', category: 'URGENT', content: 'Se informa a los padres de familia y acudientes de secundaria que el próximo viernes se llevará a cabo la jornada institucional de socialización de resultados académicos del segundo corte.', isRead: false },
  { id: 'CIR-2026-039', title: 'Cronograma Oficial de Evaluaciones Parciales y Proyectos STEM', author: 'Coordinación Académica de Bachillerato', date: '2026-10-18', category: 'ACADEMIC', content: 'Compartimos la programación detallada de evaluaciones acumulativas para los grados 9°, 10° y 11°, así como los criterios de sustentación de laboratorios de Ciencias Naturales y Matemáticas.', isRead: false },
  { id: 'CIR-2026-035', title: 'Convocatoria al Comité Escolar de Convivencia y Escuela de Padres', author: 'Dirección de Bienestar Estudiantil', date: '2026-10-14', category: 'GENERAL', content: 'Invitamos cordialmente a las familias a participar en el encuentro mensual de Escuela de Padres enfocado en hábitos de estudio y acompañamiento emocional.', isRead: true },
  { id: 'CIR-2026-031', title: 'Feria Institucional de Ciencia, Robótica e Innovación 2026', author: 'Departamento de Ciencias y Tecnología', date: '2026-10-10', category: 'ACADEMIC', content: 'Felicitamos a los grupos seleccionados de grado 10°A para representar al colegio en la muestra intercolegiada de proyectos de investigación aplicada.', isRead: true }
];
export const INITIAL_READ_RECEIPTS = [
  { messageId: 'MSG-A1111103', recipient: 'Prof. Carlos Mendoza', subject: 'Consulta Académica · Matemáticas 10°A', sentAt: '2026-10-20 15:42:10', readAt: '2026-10-20 15:43:04', status: 'LEÍDO', traceId: '4bf92f3577b34da6a3ce929d0e0e4736', channel: 'Bandeja Institucional' },
  { messageId: 'MSG-C3333301', recipient: 'Prof. Laura Morales', subject: 'Observación General · Laboratorio Física', sentAt: '2026-10-21 09:15:02', readAt: 'Pendiente de apertura', status: 'ENTREGADO', traceId: '7ac19e4410b24cb99123a01f44e89012', channel: 'Bandeja Institucional' },
  { messageId: 'MSG-90304', recipient: 'Prof. María Rodríguez', subject: 'Seguimiento de Calificación · Lengua Castellana', sentAt: '2026-10-19 20:02:44', readAt: '2026-10-19 20:10:15', status: 'LEÍDO', traceId: '9de41a0988c14fa1a002b8812390ef11', channel: 'Bandeja Institucional' }
];
export const INITIAL_COMMUNICATION_NOTES = [
  { id: 'cn-1', text: 'Firmar autorización de laboratorio de Física (martes)', done: false },
  { id: 'cn-2', text: 'Revisar nota de sustentación de Matemáticas (4.6)', done: true }
];
