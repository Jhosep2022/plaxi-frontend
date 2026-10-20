import {
  IconDefinition,
  faBell,
  faBook,
  faBookOpen,
  faBullhorn,
  faCalendarDays,
  faChalkboard,
  faChalkboardTeacher,
  faChartLine,
  faChild,
  faClipboardCheck,
  faClipboardList,
  faClock,
  faDoorOpen,
  faFileSignature,
  faFolderOpen,
  faHome,
  faLink,
  faListCheck,
  faPeopleGroup,
  faPlus,
  faQrcode,
  faSchool,
  faShieldHalved,
  faSitemap,
  faStar,
  faTasks,
  faUser,
  faUserCheck,
  faUserCircle,
  faUserGraduate,
  faUserPlus,
  faUsers,
  faVideo,
  faCog,
} from '@fortawesome/free-solid-svg-icons';
import { Rol, TipoEspacio } from '../../core/models/espacio.model';

export interface NavItem {
  label: string;
  icon: IconDefinition;
  route: string; // relativa al espacio: 'docente/contenido/cursos'
  exact?: boolean; // resaltar solo con la ruta exacta
}

export interface NavSection {
  title?: string;
  items: NavItem[];
  misCursos?: boolean; // se completa con los cursos del usuario
  emptyText?: string;
}

export interface NavModule {
  id: string;
  label: string;
  icon: IconDefinition;
  sections: NavSection[];
}

const item = (label: string, icon: IconDefinition, route: string, exact = false): NavItem => ({ label, icon, route, exact });

const CUENTA: NavModule = {
  id: 'cuenta',
  label: 'Mi cuenta',
  icon: faUser,
  sections: [{
    items: [
      item('Mi perfil', faUserCircle, 'perfil', true),
      item('Mis espacios', faSchool, 'perfil/espacios'),
      item('Seguridad', faShieldHalved, 'perfil/seguridad'),
      item('Preferencias', faBell, 'perfil/preferencias'),
    ],
  }],
};

// Menú del sidebar según el tipo de espacio y el rol del usuario en él
export function navegacion(tipo: TipoEspacio, rol: Rol): NavModule[] {
  const modulos = rol === 'docente'
    ? tipo === 'colegio' ? docenteColegio() : docenteAcademia()
    : rol === 'estudiante' ? estudiante(tipo)
    : rol === 'direccion' ? direccion()
    : padre();
  return [...modulos, CUENTA];
}

function docenteColegio(): NavModule[] {
  return [
    { id: 'inicio', label: 'Inicio', icon: faHome, sections: [{ items: [item('Resumen del día', faHome, 'docente/inicio')] }] },
    {
      id: 'clases', label: 'Mis clases', icon: faChalkboard, sections: [{
        items: [
          item('Mis clases', faChalkboard, 'docente/clases'),
          item('Asistencia', faUserCheck, 'docente/asistencia'),
          item('Tareas', faTasks, 'docente/tareas'),
          item('Calificaciones', faStar, 'docente/calificaciones'),
        ],
      }, { title: 'Mis aulas', items: [], misCursos: true, emptyText: 'Todavía no tienes clases asignadas.' }],
    },
    { id: 'horario', label: 'Horario', icon: faCalendarDays, sections: [{ items: [item('Mi horario', faCalendarDays, 'docente/horario')] }] },
    {
      id: 'marcacion', label: 'Marcación', icon: faClock, sections: [{
        items: [
          item('Marcar entrada / salida', faQrcode, 'docente/marcacion', true),
          item('Mi historial', faListCheck, 'docente/marcacion/historial'),
        ],
      }],
    },
    { id: 'comunicados', label: 'Comunicados', icon: faBullhorn, sections: [{ items: [item('Comunicados', faBullhorn, 'docente/comunicados')] }] },
  ];
}

function docenteAcademia(): NavModule[] {
  return [
    { id: 'inicio', label: 'Inicio', icon: faHome, sections: [{ items: [item('Resumen', faHome, 'docente/inicio')] }] },
    contenidoDocente('Cursos', faFolderOpen, [item('Links de invitación', faLink, 'docente/invitaciones')]),
    {
      id: 'estudiantes', label: 'Estudiantes', icon: faUsers, sections: [{
        items: [
          item('Estudiantes', faUsers, 'docente/estudiantes', true),
          item('Solicitudes', faUserPlus, 'docente/estudiantes/solicitudes'),
        ],
      }],
    },
    { id: 'sesiones', label: 'Sesiones', icon: faVideo, sections: [{ items: [item('Sesiones en vivo', faVideo, 'docente/sesiones')] }] },
    {
      id: 'seguimiento', label: 'Seguimiento', icon: faClipboardCheck, sections: [{
        items: [item('Tareas', faTasks, 'docente/tareas'), item('Asistencia', faUserCheck, 'docente/asistencia'), item('Calificaciones', faStar, 'docente/calificaciones')],
      }],
    },
  ];
}

// Contenido digital del docente (cursos, lecciones, temas) + lista de sus cursos
function contenidoDocente(label: string, icon: IconDefinition, extras: NavItem[]): NavModule {
  return {
    id: 'contenido', label, icon, sections: [
      {
        title: 'Gestión',
        items: [
          item('Mis cursos', faChalkboardTeacher, 'docente/clases', true),
          item('Crear curso', faPlus, 'docente/cursos/nuevo'),
          ...extras,
        ],
      },
      { title: 'Mis cursos', items: [], misCursos: true, emptyText: 'Todavía no creaste cursos.' },
    ],
  };
}

function estudiante(tipo: TipoEspacio): NavModule[] {
  const cursos = tipo === 'colegio' ? 'Mis materias' : 'Mis cursos';
  return [
    { id: 'inicio', label: 'Inicio', icon: faHome, sections: [{ items: [item('Resumen', faHome, 'estudiante/inicio')] }] },
    {
      id: 'aprendizaje', label: cursos, icon: faBook, sections: [
        {
          items: [
            item(cursos, faBook, 'estudiante/aulas', true),
            ...(tipo === 'academia' ? [item('Catálogo', faBookOpen, 'estudiante/catalogo')] : []),
            item('Tareas', faTasks, 'estudiante/tareas'),
          ],
        },
        { title: cursos, items: [], misCursos: true, emptyText: 'Aún no estás inscrito en ningún curso.' },
      ],
    },
    tipo === 'colegio'
      ? { id: 'horario', label: 'Horario', icon: faCalendarDays, sections: [{ items: [item('Mi horario', faCalendarDays, 'estudiante/horario')] }] }
      : { id: 'sesiones', label: 'Sesiones', icon: faVideo, sections: [{ items: [item('Sesiones en vivo', faVideo, 'estudiante/sesiones')] }] },
    {
      id: 'seguimiento', label: 'Seguimiento', icon: faClipboardCheck, sections: [{
        items: [
          item('Calificaciones', faStar, 'estudiante/calificaciones'),
          item('Asistencia', faUserCheck, 'estudiante/asistencia'),
          ...(tipo === 'colegio' ? [item('Comunicados', faBullhorn, 'estudiante/comunicados')] : []),
        ],
      }],
    },
  ];
}

function direccion(): NavModule[] {
  return [
    { id: 'inicio', label: 'Inicio', icon: faHome, sections: [{ items: [item('Panel de dirección', faHome, 'direccion/inicio')] }] },
    {
      id: 'academico', label: 'Académico', icon: faSchool, sections: [{
        items: [
          item('Gestión y periodos', faCalendarDays, 'direccion/academico/gestion'),
          item('Grados y paralelos', faSitemap, 'direccion/academico/paralelos'),
          item('Materias', faBook, 'direccion/academico/materias'),
          item('Aulas', faDoorOpen, 'direccion/academico/aulas'),
          item('Asignación docente', faChalkboardTeacher, 'direccion/academico/asignaciones'),
          item('Horarios', faClock, 'direccion/academico/horarios'),
        ],
      }],
    },
    {
      id: 'personas', label: 'Personas', icon: faPeopleGroup, sections: [{
        items: [
          item('Docentes', faChalkboardTeacher, 'direccion/personas/docentes'),
          item('Estudiantes', faUserGraduate, 'direccion/personas/estudiantes'),
          item('Padres y tutores', faChild, 'direccion/personas/padres'),
          item('Inscripciones', faUserPlus, 'direccion/personas/inscripciones'),
        ],
      }],
    },
    {
      id: 'asistencia', label: 'Asistencia', icon: faUserCheck, sections: [{
        items: [
          item('Estudiantes', faUserGraduate, 'direccion/asistencia/estudiantes'),
          item('Licencias', faFileSignature, 'direccion/asistencia/licencias'),
          item('Personal (marcaciones)', faClock, 'direccion/asistencia/personal'),
          item('Puntos de marcación', faQrcode, 'direccion/asistencia/puntos-marcacion'),
        ],
      }],
    },
    {
      id: 'calificaciones', label: 'Calificaciones', icon: faStar, sections: [{
        items: [
          item('Escala y ponderación', faFileSignature, 'direccion/calificaciones/escala'),
          item('Cierre de periodos', faClipboardList, 'direccion/calificaciones/periodos'),
          item('Boletines', faFileSignature, 'direccion/calificaciones/boletines'),
        ],
      }],
    },
    {
      id: 'reportes', label: 'Reportes', icon: faChartLine, sections: [{
        items: [
          item('Rendimiento académico', faChartLine, 'direccion/reportes/rendimiento'),
          item('Asistencia de estudiantes', faUserCheck, 'direccion/reportes/asistencia'),
          item('Puntualidad del personal', faClock, 'direccion/reportes/puntualidad'),
        ],
      }],
    },
    { id: 'comunicados', label: 'Comunicados', icon: faBullhorn, sections: [{ items: [item('Comunicados', faBullhorn, 'direccion/comunicados')] }] },
    {
      id: 'institucion', label: 'Institución', icon: faCog, sections: [{
        items: [
          item('Datos de la institución', faSchool, 'direccion/institucion', true),
          item('Jornada escolar', faCalendarDays, 'direccion/institucion/jornada'),
          item('Horario laboral', faClock, 'direccion/institucion/horario-laboral'),
        ],
      }],
    },
  ];
}

function padre(): NavModule[] {
  return [
    { id: 'inicio', label: 'Inicio', icon: faHome, sections: [{ items: [item('Resumen', faHome, 'padre/inicio')] }] },
    { id: 'hijos', label: 'Mis hijos', icon: faChild, sections: [{ items: [item('Mis hijos', faChild, 'padre/hijos')] }] },
    {
      id: 'seguimiento', label: 'Seguimiento', icon: faClipboardCheck, sections: [{
        items: [
          item('Calificaciones', faStar, 'padre/calificaciones'),
          item('Asistencia', faUserCheck, 'padre/asistencia'),
          item('Tareas', faTasks, 'padre/tareas'),
          item('Horario', faCalendarDays, 'padre/horario'),
        ],
      }],
    },
    { id: 'comunicados', label: 'Comunicados', icon: faBullhorn, sections: [{ items: [item('Comunicados', faBullhorn, 'padre/comunicados')] }] },
  ];
}
