// ============================================================================
// DATOS MOCKEADOS del módulo Académico (Colegio San José, espacioId 1)
// ============================================================================
import { Asignacion, Aula, ClaseHorario, ConfigJornada, Docente, Gestion, Materia, Paralelo } from '../core/models/academico.model';

const E = 1; // espacio: Colegio San José

export const MOCK_GESTIONES: Gestion[] = [
  {
    id: 1, espacioId: E, anio: 2025, tipoPeriodo: 'trimestre', estado: 'cerrada',
    periodos: [
      { nombre: '1er Trimestre', inicio: '2025-02-03', fin: '2025-05-16' },
      { nombre: '2do Trimestre', inicio: '2025-05-19', fin: '2025-08-29' },
      { nombre: '3er Trimestre', inicio: '2025-09-01', fin: '2025-12-05' },
    ],
  },
  {
    id: 2, espacioId: E, anio: 2026, tipoPeriodo: 'trimestre', estado: 'activa',
    periodos: [
      { nombre: '1er Trimestre', inicio: '2026-02-02', fin: '2026-05-15' },
      { nombre: '2do Trimestre', inicio: '2026-05-18', fin: '2026-08-28' },
      { nombre: '3er Trimestre', inicio: '2026-08-31', fin: '2026-12-04' },
    ],
  },
];

export const MOCK_AULAS: Aula[] = [
  { id: 1, espacioId: E, nombre: 'Aula 12', tipo: 'aula', capacidad: 35, ubicacion: 'Bloque A · Piso 1', activa: true },
  { id: 2, espacioId: E, nombre: 'Aula 14', tipo: 'aula', capacidad: 35, ubicacion: 'Bloque A · Piso 1', activa: true },
  { id: 3, espacioId: E, nombre: 'Aula 16', tipo: 'aula', capacidad: 30, ubicacion: 'Bloque A · Piso 2', activa: true },
  { id: 4, espacioId: E, nombre: 'Aula 18', tipo: 'aula', capacidad: 30, ubicacion: 'Bloque A · Piso 2', activa: true },
  { id: 5, espacioId: E, nombre: 'Aula 3', tipo: 'aula', capacidad: 30, ubicacion: 'Bloque B · Piso 1', activa: true },
  { id: 6, espacioId: E, nombre: 'Aula 4', tipo: 'aula', capacidad: 30, ubicacion: 'Bloque B · Piso 1', activa: true },
  { id: 7, espacioId: E, nombre: 'Sala Inicial', tipo: 'aula', capacidad: 25, ubicacion: 'Bloque C · Planta baja', activa: true },
  { id: 8, espacioId: E, nombre: 'Laboratorio de física', tipo: 'laboratorio', capacidad: 30, ubicacion: 'Bloque D · Piso 1', activa: true },
  { id: 9, espacioId: E, nombre: 'Laboratorio de química', tipo: 'laboratorio', capacidad: 30, ubicacion: 'Bloque D · Piso 1', activa: true },
  { id: 10, espacioId: E, nombre: 'Sala de computación', tipo: 'computacion', capacidad: 30, ubicacion: 'Bloque D · Piso 2', activa: true },
  { id: 11, espacioId: E, nombre: 'Coliseo', tipo: 'deportes', capacidad: 200, ubicacion: 'Patio posterior', activa: true },
  { id: 12, espacioId: E, nombre: 'Biblioteca', tipo: 'biblioteca', capacidad: 40, ubicacion: 'Bloque B · Piso 2', activa: true },
  { id: 13, espacioId: E, nombre: 'Aula 20', tipo: 'aula', capacidad: 30, ubicacion: 'Bloque A · Piso 3', activa: false },
];

export const MOCK_PARALELOS: Paralelo[] = [
  { id: 1, espacioId: E, gestionId: 2, nivel: 'inicial', grado: 2, letra: 'A', turno: 'manana', aulaId: 7, capacidad: 25, estudiantes: 22 },
  { id: 2, espacioId: E, gestionId: 2, nivel: 'primaria', grado: 1, letra: 'A', turno: 'manana', aulaId: 5, capacidad: 30, estudiantes: 28 },
  { id: 3, espacioId: E, gestionId: 2, nivel: 'primaria', grado: 1, letra: 'B', turno: 'tarde', aulaId: 5, capacidad: 30, estudiantes: 24 },
  { id: 4, espacioId: E, gestionId: 2, nivel: 'primaria', grado: 6, letra: 'A', turno: 'manana', aulaId: 6, capacidad: 30, estudiantes: 29 },
  { id: 5, espacioId: E, gestionId: 2, nivel: 'secundaria', grado: 3, letra: 'A', turno: 'manana', aulaId: 1, capacidad: 35, estudiantes: 32 },
  { id: 6, espacioId: E, gestionId: 2, nivel: 'secundaria', grado: 3, letra: 'B', turno: 'manana', aulaId: 2, capacidad: 35, estudiantes: 30 },
  { id: 7, espacioId: E, gestionId: 2, nivel: 'secundaria', grado: 4, letra: 'B', turno: 'manana', aulaId: 3, capacidad: 30, estudiantes: 28 },
  { id: 8, espacioId: E, gestionId: 2, nivel: 'secundaria', grado: 5, letra: 'A', turno: 'manana', aulaId: 4, capacidad: 30, estudiantes: 25 },
  { id: 9, espacioId: E, gestionId: 2, nivel: 'secundaria', grado: 6, letra: 'A', turno: 'tarde', aulaId: 0, capacidad: 30, estudiantes: 27 },
];

export const MOCK_MATERIAS: Materia[] = [
  { id: 1, espacioId: E, nombre: 'Comunicación y lenguajes', nivel: 'inicial', horasSemanales: 6, icono: 'libro', tono: 'crema' },
  { id: 2, espacioId: E, nombre: 'Desarrollo del pensamiento', nivel: 'inicial', horasSemanales: 6, icono: 'pensamiento', tono: 'lima' },
  { id: 3, espacioId: E, nombre: 'Matemáticas', nivel: 'primaria', horasSemanales: 6, icono: 'calculadora', tono: 'lima' },
  { id: 4, espacioId: E, nombre: 'Lenguaje', nivel: 'primaria', horasSemanales: 6, icono: 'libro', tono: 'crema' },
  { id: 5, espacioId: E, nombre: 'Ciencias Naturales', nivel: 'primaria', horasSemanales: 4, icono: 'naturaleza', tono: 'azul' },
  { id: 6, espacioId: E, nombre: 'Educación Física', nivel: 'primaria', horasSemanales: 2, icono: 'deporte', tono: 'azul' },
  { id: 7, espacioId: E, nombre: 'Matemáticas', nivel: 'secundaria', horasSemanales: 6, icono: 'calculadora', tono: 'lima' },
  { id: 8, espacioId: E, nombre: 'Física', nivel: 'secundaria', horasSemanales: 4, icono: 'atomo', tono: 'azul' },
  { id: 9, espacioId: E, nombre: 'Química', nivel: 'secundaria', horasSemanales: 4, icono: 'matraz', tono: 'crema' },
  { id: 10, espacioId: E, nombre: 'Lenguaje', nivel: 'secundaria', horasSemanales: 5, icono: 'libro', tono: 'crema' },
  { id: 11, espacioId: E, nombre: 'Inglés', nivel: 'secundaria', horasSemanales: 3, icono: 'idioma', tono: 'azul' },
  { id: 12, espacioId: E, nombre: 'Ciencias Sociales', nivel: 'secundaria', horasSemanales: 3, icono: 'historia', tono: 'lima' },
  { id: 13, espacioId: E, nombre: 'Educación Física', nivel: 'secundaria', horasSemanales: 2, icono: 'deporte', tono: 'azul' },
  { id: 14, espacioId: E, nombre: 'Computación', nivel: 'secundaria', horasSemanales: 2, icono: 'computo', tono: 'lima' },
];

export const MOCK_DOCENTES: Docente[] = [
  { id: 3, nombre: 'María Fernández', especialidad: 'Matemáticas y Ciencias' },
  { id: 7, nombre: 'Jorge Vargas', especialidad: 'Lenguaje' },
  { id: 8, nombre: 'Carlos Lima', especialidad: 'Educación Física' },
  { id: 9, nombre: 'Sofía Paredes', especialidad: 'Inglés' },
  { id: 10, nombre: 'Ana Torres', especialidad: 'Computación' },
  { id: 11, nombre: 'Raúl Choque', especialidad: 'Ciencias Sociales' },
  { id: 12, nombre: 'Lucía Mendoza', especialidad: 'Educación Inicial y Primaria' },
];

let id = 0;
const a = (paraleloId: number, materiaId: number, docenteId: number): Asignacion =>
  ({ id: ++id, espacioId: E, gestionId: 2, paraleloId, materiaId, docenteId });

export const MOCK_ASIGNACIONES: Asignacion[] = [
  a(1, 1, 12), a(1, 2, 12),
  a(2, 3, 12), a(2, 4, 12), a(2, 6, 8),
  a(4, 3, 12), a(4, 4, 7),
  a(5, 7, 3), a(5, 8, 3), a(5, 10, 7), a(5, 11, 9), a(5, 13, 8), a(5, 12, 11),
  a(6, 7, 3), a(6, 10, 7), a(6, 13, 8),
  a(7, 8, 3), a(7, 7, 3), a(7, 11, 9),
  a(8, 9, 3), a(8, 14, 10),
];

// ---------- Jornada escolar y horarios ----------

export const MOCK_JORNADAS: (ConfigJornada & { id: number })[] = [
  {
    id: E, espacioId: E, duracionPeriodoMin: 90, dias: [1, 2, 3, 4, 5],
    turnos: [
      { turno: 'manana', activo: true, inicio: '07:30', fin: '14:00', recreos: [{ inicio: '10:30', duracionMin: 20 }] },
      { turno: 'tarde', activo: true, inicio: '14:30', fin: '21:00', recreos: [{ inicio: '17:30', duracionMin: 20 }] },
      { turno: 'noche', activo: false, inicio: '18:30', fin: '22:30', recreos: [{ inicio: '20:00', duracionMin: 15 }] },
    ],
  },
];

let idClase = 0;
const c = (paraleloId: number, dia: number, bloque: number, materiaId: number, aulaId: number): ClaseHorario =>
  ({ id: ++idClase, espacioId: E, gestionId: 2, paraleloId, dia, bloque, materiaId, aulaId });

// 3ro A (paralelo 5, Aula 12) y 3ro B (paralelo 6, Aula 14). Física usa el laboratorio y Ed. Física el coliseo.
export const MOCK_CLASES: ClaseHorario[] = [
  c(5, 1, 0, 7, 1), c(5, 1, 1, 10, 1), c(5, 1, 2, 8, 8), c(5, 1, 3, 11, 1),
  c(5, 2, 0, 7, 1), c(5, 2, 1, 12, 1), c(5, 2, 2, 13, 11), c(5, 2, 3, 10, 1),
  c(5, 3, 0, 7, 1), c(5, 3, 1, 8, 8), c(5, 3, 2, 10, 1),
  c(5, 4, 1, 12, 1), c(5, 4, 2, 11, 1),
  c(5, 5, 0, 7, 1), c(5, 5, 1, 13, 11),
  c(6, 1, 1, 7, 2), c(6, 1, 2, 10, 2), c(6, 2, 0, 13, 11), c(6, 3, 0, 7, 2),
];
