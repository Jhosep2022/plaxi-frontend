import type { SpaceRole } from '../models/space.model';

// Pantallas a las que puede llevar un aviso, por rol. Un aviso de nota o de tarea le llega
// al estudiante y a sus padres con el mismo enlace ("/colegio/calificaciones"), así que el rol
// se agrega aquí con el de la cuenta en ese espacio.
const PANTALLAS: Record<SpaceRole, RegExp[]> = {
  estudiante: [/^inicio$/, /^catalogo$/, /^cursos$/, /^aulas$/, /^aulas\/\d+$/, /^sesiones$/, /^horario$/, /^tareas$/, /^calificaciones$/, /^comunicados$/, /^asistencia$/],
  padre: [/^inicio$/, /^hijos$/, /^calificaciones$/, /^asistencia$/, /^tareas$/, /^horario$/, /^comunicados$/],
  docente: [/^inicio$/, /^clases$/, /^clases\/\d+$/, /^horario$/, /^marcacion$/, /^pagos$/, /^estudiantes$/, /^estudiantes\/solicitudes$/, /^invitaciones$/, /^sesiones$/, /^tareas$/, /^tareas\/\d+$/, /^comunicados$/, /^asistencia$/, /^calificaciones$/],
  direccion: [/^inicio$/, /^comunicados$/, /^pagos$/, /^reportes$/, /^asistencia\/licencias$/, /^asistencia\/estudiantes$/, /^asistencia\/personal$/],
};

const ROLES = new Set<string>(['estudiante', 'padre', 'docente', 'direccion', 'perfil']);

// Enlaces antiguos que no dicen la pantalla exacta: "aulas/4/tareas/9" lleva a Tareas
const EQUIVALENTES: [RegExp, string][] = [
  [/^aulas\/\d+\/tareas\/\d+$/, 'tareas'],
  [/^aulas\/\d+\/sesiones\/\d+$/, 'sesiones'],
  [/^tareas\/\d+$/, 'tareas'],
];

// "/colegio/calificaciones" → "/colegio/padre/calificaciones" para un padre.
// Si la pantalla no existe para ese rol, lleva al inicio del espacio.
export function rutaDeAviso(enlace: string, rol: SpaceRole | null): string {
  const [slug, ...resto] = enlace.replace(/^\/+/, '').split('/').filter(Boolean);
  if (!slug) return '/espacios';
  if (!rol) return `/${slug}`;
  let pantalla = resto.join('/');
  if (resto[0] === 'perfil') return `/${slug}/${pantalla}`;
  if (ROLES.has(resto[0])) {
    if (resto[0] !== rol) return `/${slug}`;
    pantalla = resto.slice(1).join('/');
  }
  if (rol !== 'docente') for (const [patron, destino] of EQUIVALENTES) if (patron.test(pantalla)) pantalla = destino;
  if (!pantalla || !PANTALLAS[rol].some((patron) => patron.test(pantalla))) {
    // "padre/asistencia/licencias" → "padre/asistencia"
    const corta = pantalla.split('/').slice(0, -1).join('/');
    return corta && PANTALLAS[rol].some((patron) => patron.test(corta)) ? `/${slug}/${rol}/${corta}` : `/${slug}`;
  }
  return `/${slug}/${rol}/${pantalla}`;
}
