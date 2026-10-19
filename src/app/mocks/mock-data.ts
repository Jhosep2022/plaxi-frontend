// ============================================================================
// DATOS MOCKEADOS (temporal, mientras se trabaja el diseño sin backend)
// Los services devuelven estos datos en lugar de llamar a la API.
// Para volver al backend real: descomentar el código HTTP en cada service.
// ============================================================================
import { Categoria } from '../models/categoriaDto';
import { CursoDto } from '../models/CursoDto';
import { LeccionDto } from '../models/LeccionDto';
import { TemaDto } from '../models/TemaDto';
import { PerfilDto } from '../models/PerfilDto';
import { InscripcionResponseDto } from '../models/inscripcionDto';
import { Page } from '../models/page';
import { ESCALA_POR_DEFECTO, Espacio, Rol } from '../core/models/espacio.model';

// Simula la latencia de red (ms) para poder ver estados de carga
export const MOCK_DELAY = 300;

export const MOCK_CATEGORIAS: Categoria[] = [
  { idCategoria: 1, nombre: 'Programación', descripcion: 'Desarrollo de software y lenguajes de programación' },
  { idCategoria: 2, nombre: 'Diseño', descripcion: 'Diseño gráfico, UI/UX y herramientas creativas' },
  { idCategoria: 3, nombre: 'Matemáticas', descripcion: 'Álgebra, cálculo y estadística' },
  { idCategoria: 4, nombre: 'Idiomas', descripcion: 'Aprende nuevos idiomas desde cero' },
  { idCategoria: 5, nombre: 'Negocios', descripcion: 'Emprendimiento, marketing y finanzas' },
];

export const MOCK_CURSOS: CursoDto[] = [
  { idCurso: 1, nombre: 'Angular desde cero', descripcion: 'Aprende a construir aplicaciones web modernas con Angular, componentes, servicios y routing.', dificultad: 'Principiante', estado: true, categoriaId: 1, portada: 'https://picsum.photos/seed/angular/600/400' },
  { idCurso: 2, nombre: 'Java y Spring Boot', descripcion: 'Crea APIs REST robustas con Spring Boot, JPA y buenas prácticas.', dificultad: 'Intermedio', estado: true, categoriaId: 1, portada: 'https://picsum.photos/seed/spring/600/400' },
  { idCurso: 3, nombre: 'Fundamentos de UI/UX', descripcion: 'Principios de diseño de interfaces, prototipado y experiencia de usuario.', dificultad: 'Principiante', estado: true, categoriaId: 2, portada: 'https://picsum.photos/seed/uiux/600/400' },
  { idCurso: 4, nombre: 'Figma avanzado', descripcion: 'Componentes, variantes, auto layout y design systems en Figma.', dificultad: 'Avanzado', estado: true, categoriaId: 2, portada: 'https://picsum.photos/seed/figma/600/400' },
  { idCurso: 5, nombre: 'Cálculo I', descripcion: 'Límites, derivadas e integrales explicadas paso a paso.', dificultad: 'Intermedio', estado: true, categoriaId: 3, portada: 'https://picsum.photos/seed/calculo/600/400' },
  { idCurso: 6, nombre: 'Inglés básico', descripcion: 'Vocabulario, gramática y conversación para principiantes.', dificultad: 'Principiante', estado: true, categoriaId: 4, portada: 'https://picsum.photos/seed/ingles/600/400' },
  { idCurso: 7, nombre: 'Marketing digital', descripcion: 'Estrategias de redes sociales, SEO y publicidad online.', dificultad: 'Intermedio', estado: true, categoriaId: 5, portada: 'https://picsum.photos/seed/marketing/600/400' },
];

export const MOCK_LECCIONES: LeccionDto[] = [
  { idLeccion: 1, titulo: 'Introducción a Angular', orden: 1, duracionEstimada: 30, contenido: '¿Qué es Angular y por qué usarlo?', estado: true, cursoId: 1 },
  { idLeccion: 2, titulo: 'Componentes', orden: 2, duracionEstimada: 45, contenido: 'Creación y comunicación entre componentes.', estado: true, cursoId: 1 },
  { idLeccion: 3, titulo: 'Servicios e inyección de dependencias', orden: 3, duracionEstimada: 40, contenido: 'Cómo compartir lógica entre componentes.', estado: true, cursoId: 1 },
  { idLeccion: 4, titulo: 'Configuración del proyecto', orden: 1, duracionEstimada: 25, contenido: 'Spring Initializr y estructura del proyecto.', estado: true, cursoId: 2 },
  { idLeccion: 5, titulo: 'Controladores REST', orden: 2, duracionEstimada: 50, contenido: 'Endpoints GET, POST, PUT y DELETE.', estado: true, cursoId: 2 },
  { idLeccion: 6, titulo: 'Principios de diseño', orden: 1, duracionEstimada: 35, contenido: 'Contraste, jerarquía y espaciado.', estado: true, cursoId: 3 },
];

export const MOCK_TEMAS: TemaDto[] = [
  { idTema: 1, titulo: 'Historia de Angular', orden: 1, descripcion: 'De AngularJS a Angular moderno.', recursoMultimedia: 'https://www.w3schools.com/html/mov_bbb.mp4', estado: true, leccionId: 1 },
  { idTema: 2, titulo: 'Instalación del CLI', orden: 2, descripcion: 'Instalar Node y Angular CLI.', recursoMultimedia: 'https://www.w3schools.com/html/mov_bbb.mp4', estado: true, leccionId: 1 },
  { idTema: 3, titulo: '@Input y @Output', orden: 1, descripcion: 'Pasar datos entre componentes.', recursoMultimedia: 'https://www.w3schools.com/html/mov_bbb.mp4', estado: true, leccionId: 2 },
  { idTema: 4, titulo: 'Ciclo de vida', orden: 2, descripcion: 'ngOnInit, ngOnDestroy y otros hooks.', recursoMultimedia: 'https://www.w3schools.com/html/mov_bbb.mp4', estado: true, leccionId: 2 },
  { idTema: 5, titulo: 'Crear un servicio', orden: 1, descripcion: 'ng generate service y providedIn root.', recursoMultimedia: 'https://www.w3schools.com/html/mov_bbb.mp4', estado: true, leccionId: 3 },
];

export const MOCK_PERFILES: PerfilDto[] = [
  { idUsuario: 1, username: 'admin', gmail: 'admin@plaxi.com', status: true, nombre: 'Ana', primerApellido: 'Rojas', segundoApellido: 'Vargas', telefono: '70000001', ci: '1234567', imagenUrl: 'https://i.pravatar.cc/150?img=5', id_rol: '1' },
  { idUsuario: 2, username: 'estudiante', gmail: 'estudiante@plaxi.com', status: true, nombre: 'Luis', primerApellido: 'Mamani', segundoApellido: 'Quispe', telefono: '70000002', ci: '2345678', imagenUrl: 'https://i.pravatar.cc/150?img=12', id_rol: '2' },
  { idUsuario: 3, username: 'docente', gmail: 'docente@plaxi.com', status: true, nombre: 'María', primerApellido: 'Fernández', segundoApellido: 'López', telefono: '70000003', ci: '3456789', imagenUrl: 'https://i.pravatar.cc/150?img=32', id_rol: '3' },
  { idUsuario: 6, username: 'padre', gmail: 'padre@plaxi.com', status: true, nombre: 'Rosa', primerApellido: 'Quispe', segundoApellido: 'Mamani', telefono: '70000006', ci: '6789012', imagenUrl: 'https://i.pravatar.cc/150?img=47', id_rol: '4' },
];

export const MOCK_INSCRIPCIONES: InscripcionResponseDto[] = [
  { idInscripcion: 1, fechaInscripcion: '2026-09-01', estadoInscripcion: 'ACTIVA', usuarioId: 2, usuarioNombre: 'Luis Mamani', usuarioGmail: 'estudiante@plaxi.com', cursoId: 1, cursoNombre: 'Angular desde cero', usuarioCreadorId: 3, cursoDescripcion: MOCK_CURSOS[0].descripcion, cursoPortadaUrl: MOCK_CURSOS[0].portada ?? null },
  { idInscripcion: 2, fechaInscripcion: '2026-09-10', estadoInscripcion: 'ACTIVA', usuarioId: 2, usuarioNombre: 'Luis Mamani', usuarioGmail: 'estudiante@plaxi.com', cursoId: 3, cursoNombre: 'Fundamentos de UI/UX', usuarioCreadorId: 3, cursoDescripcion: MOCK_CURSOS[2].descripcion, cursoPortadaUrl: MOCK_CURSOS[2].portada ?? null },
  { idInscripcion: 3, fechaInscripcion: '2026-09-15', estadoInscripcion: 'ACTIVA', usuarioId: 4, usuarioNombre: 'Carla Gutiérrez', usuarioGmail: 'carla@plaxi.com', cursoId: 1, cursoNombre: 'Angular desde cero', usuarioCreadorId: 3, cursoDescripcion: MOCK_CURSOS[0].descripcion, cursoPortadaUrl: MOCK_CURSOS[0].portada ?? null },
  { idInscripcion: 4, fechaInscripcion: '2026-10-02', estadoInscripcion: 'ACTIVA', usuarioId: 5, usuarioNombre: 'Pedro Choque', usuarioGmail: 'pedro@plaxi.com', cursoId: 2, cursoNombre: 'Java y Spring Boot', usuarioCreadorId: 3, cursoDescripcion: MOCK_CURSOS[1].descripcion, cursoPortadaUrl: MOCK_CURSOS[1].portada ?? null },
];

// Cursos creados por cada usuario (tutor id 3 es el creador de los cursos 1-4)
export const MOCK_CURSOS_POR_USUARIO: Record<number, number[]> = {
  3: [1, 2, 3, 4],
};

// Espacios: un colegio y la academia independiente de la docente María
export const MOCK_ESPACIOS: Espacio[] = [
  { id: 1, slug: 'colegio-san-jose', nombre: 'Colegio San José', tipo: 'colegio', escala: ESCALA_POR_DEFECTO },
  { id: 2, slug: 'academia-maria', nombre: 'Academia de María', tipo: 'academia', escala: ESCALA_POR_DEFECTO },
];

// Rol de cada usuario en cada espacio (un usuario puede estar en varios)
export const MOCK_MEMBRESIAS: { usuarioId: number; espacioId: number; rol: Rol }[] = [
  { usuarioId: 1, espacioId: 1, rol: 'direccion' },
  { usuarioId: 2, espacioId: 1, rol: 'estudiante' },
  { usuarioId: 2, espacioId: 2, rol: 'estudiante' },
  { usuarioId: 3, espacioId: 1, rol: 'docente' },
  { usuarioId: 3, espacioId: 2, rol: 'docente' },
  { usuarioId: 6, espacioId: 1, rol: 'padre' },
];

// Helper para armar respuestas paginadas como las de Spring
export function toPage<T>(items: T[], page = 0, size = 10): Page<T> {
  const start = page * size;
  return {
    content: items.slice(start, start + size),
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
    size,
    number: page,
  };
}

export function nextId<T>(items: T[], key: keyof T): number {
  return items.reduce((max, item) => Math.max(max, Number(item[key]) || 0), 0) + 1;
}
