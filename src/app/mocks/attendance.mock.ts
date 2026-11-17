// ============================================================================
// DATOS MOCKEADOS del módulo Asistencia (Colegio San José)
// Se generan de forma determinística: siempre son los mismos al recargar.
// ============================================================================
import { Estudiante } from '../core/models/attendance.model';

import { MOCK_PARALELOS } from './academics.mock';

const NOMBRES = [
  'Carla',
  'Pedro',
  'Ana',
  'Jorge',
  'Lucía',
  'Diego',
  'Valeria',
  'Mateo',
  'Camila',
  'Sebastián',
  'Daniela',
  'Andrés',
  'Sofía',
  'Gabriel',
  'Isabella',
  'Nicolás',
  'Mariana',
  'Samuel',
  'Fernanda',
  'Tomás',
  'Paula',
  'Joaquín',
  'Renata',
  'Emilio',
];
const APELLIDOS = [
  'Gutiérrez',
  'Choque',
  'Rojas',
  'Vargas',
  'Quispe',
  'Mendoza',
  'Flores',
  'Condori',
  'Torres',
  'Paredes',
  'Salazar',
  'Ríos',
  'Cruz',
  'Aguilar',
  'Limachi',
  'Huanca',
  'Ortiz',
  'Medina',
  'Castro',
  'Ticona',
];

// Edad típica por nivel y grado (inicial 2da sección = 5 años, 1ro de primaria = 6, 1ro de secundaria = 12)
const EDAD_BASE = { inicial: 3, primaria: 5, secundaria: 11 };

// N dígitos pseudoaleatorios (combina dos sorteos para no repetir terminaciones)
const digitos = (semilla: string, n: number) =>
  String(
    Math.floor(azar(`${semilla}-a`) * 10000) * 1000 +
      Math.floor(azar(`${semilla}-b`) * 1000),
  )
    .padStart(7, '0')
    .slice(-n);

// Fecha de nacimiento y CI determinísticos para cada estudiante
function datosPersonales(
  id: number,
  edad: number,
): Pick<Estudiante, 'ci' | 'fechaNacimiento'> {
  const mes = 1 + Math.floor(azar(`mes-${id}`) * 12);
  const dia = 1 + Math.floor(azar(`dia-${id}`) * 28);
  return {
    ci: `9${digitos(`ci-${id}`, 6)}`,
    fechaNacimiento: `${2026 - edad - (mes > 10 ? 1 : 0)}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
  };
}

// Estudiantes de cada paralelo según su cantidad de inscritos; Luis Mamani (usuario 2) está en 3ro A y su hermana Sofía en 6to A.
// Al final, estudiantes nuevos que todavía no fueron inscritos en ningún paralelo.
export const MOCK_ESTUDIANTES: Estudiante[] = [
  ...MOCK_PARALELOS.flatMap((p) =>
    Array.from({ length: p.estudiantes }, (_, i) => {
      const id = p.id === 5 && i === 0 ? 2 : 1000 + p.id * 100 + i;
      const nombre =
        id === 2
          ? 'Luis Mamani'
          : id === 1400
            ? 'Sofía Mamani'
            : `${NOMBRES[(i * 7 + p.id) % NOMBRES.length]} ${APELLIDOS[(i * 3 + p.id * 5) % APELLIDOS.length]}`;
      return {
        id,
        nombre,
        paraleloId: p.id,
        ...datosPersonales(id, EDAD_BASE[p.nivel] + p.grado),
      };
    }),
  ),
  {
    id: 3001,
    nombre: 'Martina Rojas',
    paraleloId: 0,
    ...datosPersonales(3001, 14),
  },
  {
    id: 3002,
    nombre: 'Bruno Calle',
    paraleloId: 0,
    ...datosPersonales(3002, 7),
  },
  {
    id: 3003,
    nombre: 'Alejandra Poma',
    paraleloId: 0,
    ...datosPersonales(3003, 15),
  },
  {
    id: 3004,
    nombre: 'Iván Laura',
    paraleloId: 0,
    ...datosPersonales(3004, 12),
  },
].sort(
  (a, b) => a.paraleloId - b.paraleloId || a.nombre.localeCompare(b.nombre),
);

// Pseudoaleatorio determinístico en [0, 1) a partir de un texto
function azar(semilla: string): number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++)
    h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
