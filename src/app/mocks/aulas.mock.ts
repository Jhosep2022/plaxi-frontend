// ============================================================================
// DATOS MOCKEADOS de Aulas virtuales
// Colegio: un aula por asignación (materia + paralelo) con contenido por materia.
// Academia: los cursos de María, con las lecciones y temas que ya existían.
// ============================================================================
import type { Aula, Progreso, Tema, TipoTema, Unidad } from '../core/models/aulas.model';
import { paraleloLabel } from '../core/models/academico.model';
import { MOCK_ASIGNACIONES, MOCK_MATERIAS, MOCK_PARALELOS } from './academico.mock';
import { MOCK_ESTUDIANTES } from './asistencia.mock';
import { MOCK_CATEGORIAS, MOCK_CURSOS, MOCK_CURSOS_POR_USUARIO, MOCK_INSCRIPCIONES, MOCK_LECCIONES, MOCK_TEMAS } from './mock-data';

// Plan de contenido por materia: unidades con sus temas
const PLANES: Record<string, { unidad: string; temas: string[] }[]> = {
  'Física': [
    { unidad: 'Cinemática', temas: ['Movimiento rectilíneo uniforme (MRU)', 'Movimiento uniformemente variado (MRUV)', 'Caída libre', 'Simulador: lanzamiento de proyectiles'] },
    { unidad: 'Dinámica', temas: ['Primera ley de Newton', 'Segunda ley de Newton', 'Tercera ley de Newton'] },
    { unidad: 'Trabajo y energía', temas: ['Trabajo mecánico', 'Energía cinética y potencial', 'Conservación de la energía'] },
  ],
  'Matemáticas|secundaria': [
    { unidad: 'Funciones', temas: ['¿Qué es una función?', 'Función lineal', 'Gráfica de funciones lineales', 'Pendiente y ordenada al origen'] },
    { unidad: 'Geometría analítica', temas: ['Distancia entre dos puntos', 'Punto medio', 'Ecuación de la recta'] },
    { unidad: 'Ecuaciones de segundo grado', temas: ['Fórmula general', 'Factorización', 'Problemas de aplicación'] },
  ],
  'Matemáticas|primaria': [
    { unidad: 'Números naturales', temas: ['Valor posicional', 'Suma y resta', 'Problemas'] },
    { unidad: 'Fracciones', temas: ['¿Qué es una fracción?', 'Fracciones equivalentes', 'Suma de fracciones'] },
    { unidad: 'Geometría', temas: ['Figuras planas', 'Perímetro', 'Área'] },
  ],
  'Química': [
    { unidad: 'La materia', temas: ['Propiedades de la materia', 'Estados de agregación', 'Mezclas y sustancias'] },
    { unidad: 'El átomo', temas: ['Modelos atómicos', 'Configuración electrónica', 'Tabla periódica'] },
    { unidad: 'Enlaces químicos', temas: ['Enlace iónico', 'Enlace covalente', 'Laboratorio virtual'] },
  ],
  'Lenguaje': [
    { unidad: 'Comprensión lectora', temas: ['Ideas principales', 'Inferencias', 'Lectura: cuento boliviano'] },
    { unidad: 'Producción de textos', temas: ['El ensayo', 'Conectores', 'Ortografía: tildes'] },
    { unidad: 'Literatura', temas: ['Géneros literarios', 'Poesía boliviana', 'Análisis de obras'] },
  ],
  'Inglés': [
    { unidad: 'Unit 4 – Daily routines', temas: ['Present simple', 'Adverbs of frequency', 'Listening practice'] },
    { unidad: 'Unit 5 – Places in town', temas: ['Vocabulary: places', 'There is / There are', 'Giving directions'] },
    { unidad: 'Unit 6 – The past', temas: ['Past simple: regular verbs', 'Irregular verbs', 'Story telling'] },
  ],
  'Ciencias Sociales': [
    { unidad: 'Historia de Bolivia', temas: ['Culturas prehispánicas', 'La colonia', 'La independencia'] },
    { unidad: 'Geografía', temas: ['Pisos ecológicos', 'Departamentos y regiones', 'Recursos naturales'] },
    { unidad: 'Ciudadanía', temas: ['Derechos y deberes', 'Organización del Estado', 'Participación ciudadana'] },
  ],
  'Educación Física': [
    { unidad: 'Condición física', temas: ['Calentamiento', 'Resistencia', 'Flexibilidad'] },
    { unidad: 'Deportes de equipo', temas: ['Fútbol: fundamentos', 'Básquet: reglas', 'Vóley: saque y recepción'] },
    { unidad: 'Vida saludable', temas: ['Alimentación', 'Hidratación', 'Descanso'] },
  ],
  'Computación': [
    { unidad: 'Ofimática', temas: ['Procesador de textos', 'Hojas de cálculo', 'Presentaciones'] },
    { unidad: 'Pensamiento computacional', temas: ['Algoritmos', 'Diagramas de flujo', 'Scratch'] },
    { unidad: 'Internet seguro', temas: ['Contraseñas', 'Ciberacoso', 'Huella digital'] },
  ],
  'Ciencias Naturales': [
    { unidad: 'Los seres vivos', temas: ['Características', 'Clasificación', 'La célula'] },
    { unidad: 'El cuerpo humano', temas: ['Sistema digestivo', 'Sistema respiratorio', 'Cuidado del cuerpo'] },
    { unidad: 'El medio ambiente', temas: ['Ecosistemas', 'Cuidado del agua', 'Reciclaje'] },
  ],
  'Comunicación y lenguajes': [
    { unidad: 'Escuchamos y hablamos', temas: ['Cuentos', 'Canciones', 'Adivinanzas'] },
    { unidad: 'Iniciación a la lectura', temas: ['Las vocales', 'Mi nombre', 'Palabras del aula'] },
    { unidad: 'Expresión artística', temas: ['Dibujo libre', 'Colores', 'Títeres'] },
  ],
  'Desarrollo del pensamiento': [
    { unidad: 'Números', temas: ['Contamos hasta 10', 'Más y menos', 'Secuencias'] },
    { unidad: 'Formas', temas: ['Círculo y cuadrado', 'Triángulo', 'Encontramos formas'] },
    { unidad: 'Nociones', temas: ['Arriba y abajo', 'Grande y pequeño', 'Clasificamos'] },
  ],
};

const TIPOS: TipoTema[] = ['texto', 'video', 'pdf', 'enlace'];
const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function azar(semilla: string): number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

function recurso(tipo: TipoTema, titulo: string): Pick<Tema, 'contenido' | 'url' | 'duracionMin'> {
  switch (tipo) {
    case 'video': return { contenido: `Video explicativo: ${titulo}.`, url: 'https://www.w3schools.com/html/mov_bbb.mp4', duracionMin: 8 };
    case 'pdf': return { contenido: `Guía de estudio de "${titulo}" con ejemplos y ejercicios resueltos.`, url: `${slug(titulo)}.pdf`, duracionMin: 15 };
    case 'enlace': return { contenido: `Recurso externo para practicar ${titulo.toLowerCase()}.`, url: 'https://phet.colorado.edu/es/', duracionMin: 10 };
    default: return { contenido: `En este tema veremos ${titulo.toLowerCase()}.\n\nLee con atención los conceptos principales y anota tus dudas para la próxima clase.`, url: '', duracionMin: 10 };
  }
}

// ---------- Colegio ----------
const aulasColegio: Aula[] = MOCK_ASIGNACIONES.map((a) => {
  const materia = MOCK_MATERIAS.find((m) => m.id === a.materiaId)!;
  const paralelo = MOCK_PARALELOS.find((p) => p.id === a.paraleloId)!;
  return {
    id: a.id, espacioId: a.espacioId, tipo: 'clase', docenteId: a.docenteId, paraleloId: a.paraleloId, materiaId: a.materiaId,
    nombre: `${materia.nombre} · ${paraleloLabel(paralelo)}`, descripcion: `Aula virtual de ${materia.nombre} para ${paraleloLabel(paralelo)}.`,
    portada: '', icono: materia.icono, tono: materia.tono, actualizado: `2026-10-${String(10 + Math.floor(azar(`act-${a.id}`) * 9)).padStart(2, '0')}T${String(9 + Math.floor(azar(`h-${a.id}`) * 9)).padStart(2, '0')}:00:00`,
    categoria: '', nivel: '', visibilidad: 'privado', codigo: '', aprobacionManual: false,
  };
});

// ---------- Academia (cursos de María) ----------
const aulasAcademia: Aula[] = MOCK_CURSOS.filter((c) => MOCK_CURSOS_POR_USUARIO[3]?.includes(c.idCurso)).map((c, i) => ({
  id: 1000 + c.idCurso, espacioId: 2, tipo: 'curso', docenteId: 3, paraleloId: 0, materiaId: 0,
  nombre: c.nombre, descripcion: c.descripcion, portada: c.portada ?? '', icono: c.categoriaId === 2 ? 'arte' : 'computo', tono: (['lima', 'azul', 'crema'] as const)[i % 3],
  actualizado: `2026-10-${String(12 + i).padStart(2, '0')}T10:00:00`,
  categoria: MOCK_CATEGORIAS.find((k) => k.idCategoria === c.categoriaId)?.nombre ?? '', nivel: c.dificultad,
  // Figma avanzado es privado y con aprobación: solo se entra con invitación y la docente revisa las solicitudes
  visibilidad: c.idCurso === 4 ? 'privado' : 'publico', codigo: ['ANG-7K2Q', 'SPR-4M9X', 'UIX-2P5R', 'FIG-8T3W'][i] ?? 'CUR-0000', aprobacionManual: c.idCurso === 4,
}));

export const MOCK_AULAS_VIRTUALES: Aula[] = [...aulasColegio, ...aulasAcademia];

// ---------- Unidades y temas ----------
let idUnidad = 0;
let idTema = 0;
export const MOCK_UNIDADES: Unidad[] = [];
export const MOCK_TEMAS_AULA: Tema[] = [];

for (const aula of aulasColegio) {
  const materia = MOCK_MATERIAS.find((m) => m.id === aula.materiaId)!;
  const plan = PLANES[`${materia.nombre}|${materia.nivel}`] ?? PLANES[materia.nombre] ?? [];
  plan.forEach((u, i) => {
    // Física 3ro A: la unidad 2 se abre al completar la 1 y la 3 todavía es un borrador
    // Matemáticas 3ro A: la unidad 3 se abre al completar la 2 (Luis todavía no la terminó)
    const fisica3A = aula.paraleloId === 5 && aula.materiaId === 8;
    const mate3A = aula.paraleloId === 5 && aula.materiaId === 7;
    const unidad: Unidad = {
      id: ++idUnidad, aulaId: aula.id, titulo: `Unidad ${i + 1}: ${u.unidad}`, descripcion: `Aprenderemos los conceptos de ${u.unidad.toLowerCase()}.`,
      orden: i + 1, publicada: !(fisica3A && i === 2), requiereAnterior: (fisica3A && i === 1) || (mate3A && i === 2),
    };
    MOCK_UNIDADES.push(unidad);
    u.temas.forEach((titulo, j) => {
      const tipo = titulo.startsWith('Simulador') || titulo.startsWith('Laboratorio') ? 'enlace' : TIPOS[(i + j) % TIPOS.length];
      MOCK_TEMAS_AULA.push({ id: ++idTema, unidadId: unidad.id, titulo, tipo, ...recurso(tipo, titulo), orden: j + 1, publicado: true });
    });
  });
}

for (const aula of aulasAcademia) {
  MOCK_LECCIONES.filter((l) => l.cursoId === aula.id - 1000).forEach((l) => {
    const unidad: Unidad = { id: ++idUnidad, aulaId: aula.id, titulo: l.titulo, descripcion: l.contenido, orden: l.orden, publicada: true, requiereAnterior: false };
    MOCK_UNIDADES.push(unidad);
    MOCK_TEMAS.filter((t) => t.leccionId === l.idLeccion).forEach((t) => {
      MOCK_TEMAS_AULA.push({ id: ++idTema, unidadId: unidad.id, titulo: t.titulo, tipo: 'video', contenido: t.descripcion, url: t.recursoMultimedia, duracionMin: 10, orden: t.orden, publicado: true });
    });
  });
}

// ---------- Estudiantes de cada aula ----------
// Colegio: los inscritos en el paralelo. Academia: las inscripciones al curso.
export const estudiantesDeAula = (aula: Aula): number[] =>
  aula.tipo === 'clase'
    ? MOCK_ESTUDIANTES.filter((e) => e.paraleloId === aula.paraleloId).map((e) => e.id)
    : MOCK_INSCRIPCIONES.filter((i) => i.cursoId === aula.id - 1000 && i.estadoInscripcion === 'ACTIVA').map((i) => i.usuarioId);

// ---------- Progreso (temas vistos) ----------
// Avance típico por unidad; Luis (id 2) terminó la unidad 1 de Física y Matemáticas y va por la 2.
let idProgreso = 0;
export const MOCK_PROGRESO: Progreso[] = [];
for (const aula of MOCK_AULAS_VIRTUALES) {
  const unidades = MOCK_UNIDADES.filter((u) => u.aulaId === aula.id && u.publicada).sort((a, b) => a.orden - b.orden);
  for (const estudianteId of estudiantesDeAula(aula)) {
    unidades.forEach((u, i) => {
      const temas = MOCK_TEMAS_AULA.filter((t) => t.unidadId === u.id).sort((a, b) => a.orden - b.orden);
      temas.forEach((t, j) => {
        const esLuis = estudianteId === 2;
        const visto = esLuis
          ? i === 0 || (i === 1 && j < 1)
          : azar(`${t.id}-${estudianteId}`) < ([0.92, 0.55, 0.15][i] ?? 0);
        if (visto) MOCK_PROGRESO.push({ id: ++idProgreso, temaId: t.id, estudianteId, completadoEl: `2026-10-${String(5 + i * 4 + j).padStart(2, '0')}T19:00:00` });
      });
    });
  }
}
