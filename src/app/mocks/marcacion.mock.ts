// ============================================================================
// DATOS MOCKEADOS de Marcación docente (Colegio San José). Determinísticos.
// ============================================================================
import { HorarioLaboral, Marcacion, PuntoMarcacion } from '../core/models/marcacion.model';
import { docenteDe } from '../core/utils/horario';
import { MOCK_ASIGNACIONES, MOCK_CLASES } from './academico.mock';

const E = 1;

export const MOCK_PUNTOS_MARCACION: PuntoMarcacion[] = [
  { id: 1, espacioId: E, nombre: 'Entrada principal', latitud: -16.5005, longitud: -68.13, radioM: 100, activo: true, secreto: 'csj-entrada-7f3a' },
  { id: 2, espacioId: E, nombre: 'Portón posterior', latitud: -16.5012, longitud: -68.129, radioM: 60, activo: true, secreto: 'csj-porton-91c2' },
];

export const MOCK_HORARIOS_LABORALES: HorarioLaboral[] = [
  {
    id: E,
    toleranciaMin: 10,
    turnos: [
      { turno: 'manana', entrada: '07:15', salida: '14:00' },
      { turno: 'tarde', entrada: '14:15', salida: '21:00' },
      { turno: 'noche', entrada: '18:15', salida: '22:30' },
    ],
  },
];

function azar(semilla: string): number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const aHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const FECHAS = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
const diaDe = (fecha: string) => ((new Date(`${fecha}T12:00:00`).getDay() + 6) % 7) + 1;
const ENTRADA = 7 * 60 + 15;
const SALIDA = 14 * 60;
const TOLERANCIA = 10;

// Docentes con clases cada día (todos en el turno mañana en los datos de ejemplo)
const docentesDelDia = (fecha: string) =>
  [...new Set(MOCK_CLASES.filter((c) => c.dia === diaDe(fecha)).map((c) => docenteDe(MOCK_ASIGNACIONES, c.paraleloId, c.materiaId)))].filter(Boolean);

let id = 0;
export const MOCK_MARCACIONES: Marcacion[] = FECHAS.flatMap((fecha) =>
  docentesDelDia(fecha).flatMap((docenteId): Marcacion[] => {
    const r = azar(`${fecha}-${docenteId}`);
    if (r > 0.97) return []; // de vez en cuando alguien no marca
    // María (docente 3) llegó tarde el miércoles 14; el resto con variaciones al azar
    const llegada = docenteId === 3 ? (fecha === '2026-10-14' ? ENTRADA + 17 : ENTRADA - 8) : ENTRADA - 15 + Math.round(r * 32);
    const atraso = llegada - ENTRADA;
    const salida = SALIDA + Math.round(azar(`${fecha}-${docenteId}-s`) * 20) - 4;
    const base = { espacioId: E, docenteId, fecha, puntoId: r < 0.8 ? 1 : 2 };
    return [
      { ...base, id: ++id, tipo: 'entrada', hora: aHora(llegada), estado: atraso > TOLERANCIA ? 'atraso' : 'a-tiempo', minutos: Math.max(0, atraso), distanciaM: 12 + Math.round(r * 60) },
      { ...base, id: ++id, tipo: 'salida', hora: aHora(salida), estado: salida < SALIDA ? 'salida-anticipada' : 'salida', minutos: Math.max(0, SALIDA - salida), distanciaM: 15 + Math.round(r * 50) },
    ];
  })
);
