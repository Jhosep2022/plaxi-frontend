// ============================================================================
// DATOS MOCKEADOS del módulo Asistencia (Colegio San José)
// Se generan de forma determinística: siempre son los mismos al recargar.
// ============================================================================
import { ConfigAsistenciaDocente, EstadoAsistencia, Estudiante, Licencia, RegistroAsistencia } from '../core/models/asistencia.model';
import { docenteDe } from '../core/utils/horario';
import { MOCK_ASIGNACIONES, MOCK_CLASES, MOCK_PARALELOS } from './academico.mock';

const E = 1;

const NOMBRES = ['Carla', 'Pedro', 'Ana', 'Jorge', 'Lucía', 'Diego', 'Valeria', 'Mateo', 'Camila', 'Sebastián', 'Daniela', 'Andrés',
  'Sofía', 'Gabriel', 'Isabella', 'Nicolás', 'Mariana', 'Samuel', 'Fernanda', 'Tomás', 'Paula', 'Joaquín', 'Renata', 'Emilio'];
const APELLIDOS = ['Gutiérrez', 'Choque', 'Rojas', 'Vargas', 'Quispe', 'Mendoza', 'Flores', 'Condori', 'Torres', 'Paredes', 'Salazar',
  'Ríos', 'Cruz', 'Aguilar', 'Limachi', 'Huanca', 'Ortiz', 'Medina', 'Castro', 'Ticona'];

// Edad típica por nivel y grado (inicial 2da sección = 5 años, 1ro de primaria = 6, 1ro de secundaria = 12)
const EDAD_BASE = { inicial: 3, primaria: 5, secundaria: 11 };

// N dígitos pseudoaleatorios (combina dos sorteos para no repetir terminaciones)
const digitos = (semilla: string, n: number) =>
  String(Math.floor(azar(`${semilla}-a`) * 10000) * 1000 + Math.floor(azar(`${semilla}-b`) * 1000)).padStart(7, '0').slice(-n);

// Fecha de nacimiento y CI determinísticos para cada estudiante
function datosPersonales(id: number, edad: number): Pick<Estudiante, 'ci' | 'fechaNacimiento'> {
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
      const nombre = id === 2 ? 'Luis Mamani' : id === 1400 ? 'Sofía Mamani' : `${NOMBRES[(i * 7 + p.id) % NOMBRES.length]} ${APELLIDOS[(i * 3 + p.id * 5) % APELLIDOS.length]}`;
      return { id, nombre, paraleloId: p.id, ...datosPersonales(id, EDAD_BASE[p.nivel] + p.grado) };
    })
  ),
  { id: 3001, nombre: 'Martina Rojas', paraleloId: 0, ...datosPersonales(3001, 14) },
  { id: 3002, nombre: 'Bruno Calle', paraleloId: 0, ...datosPersonales(3002, 7) },
  { id: 3003, nombre: 'Alejandra Poma', paraleloId: 0, ...datosPersonales(3003, 15) },
  { id: 3004, nombre: 'Iván Laura', paraleloId: 0, ...datosPersonales(3004, 12) },
].sort((a, b) => a.paraleloId - b.paraleloId || a.nombre.localeCompare(b.nombre));

// Pseudoaleatorio determinístico en [0, 1) a partir de un texto
function azar(semilla: string): number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

// Dos semanas de clases ya tomadas (lunes 5 al viernes 16 de octubre de 2026)
const FECHAS = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
const diaDe = (fecha: string) => ((new Date(`${fecha}T12:00:00`).getDay() + 6) % 7) + 1;

// Historia de Luis: licencia el viernes 9, atraso el miércoles 14 (1ra clase) y falta en una clase el jueves 15
function estadoDeLuis(fecha: string, bloque: number): { estado: EstadoAsistencia; minutosTarde: number } | null {
  if (fecha === '2026-10-09') return { estado: 'licencia', minutosTarde: 0 };
  if (fecha === '2026-10-14' && bloque === 0) return { estado: 'atraso', minutosTarde: 10 };
  if (fecha === '2026-10-15' && bloque === 2) return { estado: 'ausente', minutosTarde: 0 };
  return null;
}

let idRegistro = 0;
export const MOCK_REGISTROS: RegistroAsistencia[] = FECHAS.flatMap((fecha) =>
  MOCK_CLASES.filter((c) => c.dia === diaDe(fecha)).flatMap((clase) =>
    MOCK_ESTUDIANTES.filter((e) => e.paraleloId === clase.paraleloId).map((est) => {
      const r = azar(`${fecha}-${clase.paraleloId}-${clase.bloque}-${est.id}`);
      const fijo = est.id === 2 ? estadoDeLuis(fecha, clase.bloque) : null;
      // Luis siempre asiste salvo en su historia fija; el resto con faltas y atrasos ocasionales
      const estado: EstadoAsistencia = fijo?.estado ?? (est.id === 2 ? 'presente' : r < 0.05 ? 'atraso' : r < 0.08 ? 'ausente' : 'presente');
      return {
        id: ++idRegistro,
        espacioId: E,
        paraleloId: clase.paraleloId,
        materiaId: clase.materiaId,
        bloque: clase.bloque,
        fecha,
        estudianteId: est.id,
        estado,
        minutosTarde: fijo?.minutosTarde ?? (estado === 'atraso' ? 11 + Math.round(r * 200) : 0),
        docenteId: docenteDe(MOCK_ASIGNACIONES, clase.paraleloId, clase.materiaId),
      };
    })
  )
);

export const MOCK_LICENCIAS: Licencia[] = [
  { id: 1, espacioId: E, estudianteId: 2, solicitadaPor: 6, desde: '2026-10-09', hasta: '2026-10-09', motivo: 'Consulta médica (gripe)', archivo: 'certificado-medico.pdf', estado: 'aprobada', respuesta: 'Aprobada. Que se mejore.', creada: '2026-10-08' },
  { id: 2, espacioId: E, estudianteId: 2, solicitadaPor: 6, desde: '2026-10-22', hasta: '2026-10-22', motivo: 'Viaje familiar por un trámite en otra ciudad', archivo: '', estado: 'pendiente', respuesta: '', creada: '2026-10-16' },
  { id: 3, espacioId: E, estudianteId: 1501, solicitadaPor: 0, desde: '2026-10-20', hasta: '2026-10-21', motivo: 'Representará al colegio en el campeonato intercolegial', archivo: 'convocatoria.pdf', estado: 'pendiente', respuesta: '', creada: '2026-10-15' },
];

// Tolerancia de atraso por docente (los que no aparecen usan la de por defecto)
export const MOCK_CONFIG_ASISTENCIA: ConfigAsistenciaDocente[] = [];
