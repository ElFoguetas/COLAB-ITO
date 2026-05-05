// =============================================================
// src/data/mockData.js
// Datos estáticos (mock data) centralizados del proyecto COLAB-ITO.
// Aquí se agrupan todos los datos de prueba que se usaban
// directamente dentro de los componentes. Al centralizar los datos
// en este archivo, los componentes quedan más limpios y es más
// fácil sustituirlos por llamadas a una API real en el futuro.
// =============================================================


// --- PROYECTOS ---
// Lista de proyectos que se muestran en la plataforma.
// Cada objeto representa una tarjeta en el catálogo de proyectos.
// Campos:
//   - category : área temática del proyecto (usado por filtros)
//   - status   : estado actual ("Activo" | "En pausa" | "Completado")
//   - tags      : tecnologías o etiquetas del proyecto
export const proyectos = [
    {
        id: 1,
        title: "Sistema de Riego IoT",
        description: "Un sistema automatizado para optimizar el uso del agua en agricultura utilizando sensores de humedad y microcontroladores ESP32.",
        tags: ["C++", "IoT", "React", "Node.js"],
        author: "Juan Pérez",
        category: "IoT",
        status: "Activo"
    },
    {
        id: 2,
        title: "App de Cafetería",
        description: "Aplicación móvil para gestión de pedidos y reservas en la cafetería universitaria, integrando pagos con código QR.",
        tags: ["React Native", "Firebase", "UX/UI"],
        author: "Maria García",
        category: "Apps Móviles",
        status: "Activo"
    },
    {
        id: 3,
        title: "COLAB-ITO",
        description: "Plataforma web colaborativa para estudiantes del tecnológico, facilitando la gestión de proyectos y recursos académicos.",
        tags: ["React", "Express", "PostgreSQL", "Tailwind"],
        author: "Equipo Alpha",
        category: "Web",
        status: "Activo"
    },
    {
        id: 4,
        title: "Asistente de Tutorías con IA",
        description: "Chatbot basado en NLP para orientar a estudiantes de primer semestre en trámites escolares y recursos del campus.",
        tags: ["Python", "FastAPI", "OpenAI", "React"],
        author: "Sofía Ramírez",
        category: "Inteligencia Artificial",
        status: "En pausa"
    },
    {
        id: 5,
        title: "Monitor de Calidad del Aire",
        description: "Red de sensores distribuidos en el campus para medir y visualizar en tiempo real la calidad del aire y temperatura.",
        tags: ["Arduino", "MQTT", "InfluxDB", "Grafana"],
        author: "Luis Morales",
        category: "IoT",
        status: "Activo"
    },
    {
        id: 6,
        title: "Plataforma de Evaluación Docente",
        description: "Sistema web para que los alumnos evalúen de forma anónima a sus docentes y la institución analice los resultados.",
        tags: ["Next.js", "Supabase", "Chart.js"],
        author: "Ana Torres",
        category: "Web",
        status: "Completado"
    },
    {
        id: 7,
        title: "Gestor de Préstamos Bibliográficos",
        description: "Aplicación para automatizar el préstamo y devolución de libros en la biblioteca del tecnológico, con alertas por correo.",
        tags: ["Vue.js", "Node.js", "MySQL", "Nodemailer"],
        author: "Carlos Vega",
        category: "Web",
        status: "Completado"
    },
    {
        id: 8,
        title: "App de Seguimiento de Egresados",
        description: "Plataforma móvil para que los egresados reporten su situación laboral y la institución genere estadísticas de inserción.",
        tags: ["Flutter", "Firebase", "Dart"],
        author: "Daniela Ruiz",
        category: "Apps Móviles",
        status: "En pausa"
    }
];


// --- MATERIALES ACADÉMICOS ---
// Lista de recursos y guías de estudio compartidos por la comunidad.
// Cada objeto contiene el título, autor/fuente y tipo de archivo.
export const materiales = [
    {
        id: 1,
        title: "Guía de Cálculo II",
        subtitle: "Prof. Martínez",
        type: "pdf"
    },
    {
        id: 2,
        title: "Manual de Java",
        subtitle: "Departamento de Sistemas",
        type: "docx"
    },
    {
        id: 3,
        title: "Física Moderna",
        subtitle: "Apuntes de Clase",
        type: "pdf"
    },
    {
        id: 4,
        title: "Estructura de Datos",
        subtitle: "Prof. Rodríguez",
        type: "pdf"
    }
];


// --- DETALLE DE PROYECTO ---
// Información completa de un proyecto individual para la vista de detalle.
// En una versión con backend, esto se obtendría con una llamada a la API
// usando el `id` de los parámetros de la URL.
export const detalleProyecto = {
    title: "Sistema de Riego IoT",
    author: "Juan Pérez",
    date: "Publicado el 15 de Octubre, 2023",
    description: `
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
        Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

        Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, 
        eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. 
        Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.
    `,
    vacancies: [
        "Android Developer (Kotlin/Java)",
        "Diseñador UI/UX (Figma)",
        "Backend Developer (Node.js)"
    ]
};


// --- MENSAJES INICIALES DEL CHAT ---
// Historial de conversación de prueba que se precarga en el ChatRoom.
// El campo `sender` puede ser 'me' (usuario actual) u 'other' (otro participante).
export const mensajesIniciales = [
    { id: 1, sender: 'other', text: 'Hola a todos, ¿cómo van con la parte del frontend?', time: '10:30 AM', name: 'Maria' },
    { id: 2, sender: 'me',    text: 'Hola Maria, ya casi termino con los componentes principales.', time: '10:32 AM', name: 'Yo' },
    { id: 3, sender: 'other', text: 'Genial, yo estoy revisando la documentación de la API.', time: '10:33 AM', name: 'Juan' },
    { id: 4, sender: 'other', text: 'Avísame si necesitas ayuda con los endpoints.', time: '10:34 AM', name: 'Juan' },
    { id: 5, sender: 'me',    text: 'Vale, gracias. En un rato subo los cambios al repo.', time: '10:35 AM', name: 'Yo' },
];


// --- PERFIL INICIAL DEL USUARIO ---
// Valores por defecto del formulario de perfil de usuario.
// En producción estos datos vendrían del servidor (ej. Firebase Auth + Firestore).
export const perfilInicial = {
    nombre: 'Usuario Demo',
    institucion: 'Instituto Tecnológico de Oaxaca',
    bio: 'Estudiante de Ingeniería en Sistemas Computacionales. Apasionado por el desarrollo web y la inteligencia artificial.'
};
