// ============================================================================
// DATOS MOCKEADOS de Personas: padres / tutores legales y su vínculo con cada estudiante
// Se generan de forma determinística a partir de los estudiantes.
// ============================================================================
import { Parentesco, Tutor, Vinculo } from '../core/models/personas.model';
import { MOCK_ESTUDIANTES } from './asistencia.mock';

const MUJERES = ['Patricia', 'Carmen', 'Silvia', 'Mónica', 'Verónica', 'Gabriela', 'Claudia', 'Roxana', 'Elizabeth', 'Marisol', 'Jimena', 'Teresa'];
const HOMBRES = ['Juan', 'Marco', 'René', 'Freddy', 'Edwin', 'Ricardo', 'Javier', 'Álvaro', 'Wilson', 'Fernando', 'Óscar', 'Hernán'];
const APELLIDOS = ['Gutiérrez', 'Choque', 'Rojas', 'Vargas', 'Quispe', 'Mendoza', 'Flores', 'Condori', 'Torres', 'Paredes', 'Salazar', 'Ríos', 'Cruz', 'Aguilar'];
const OCUPACIONES = ['Comerciante', 'Docente', 'Ingeniero(a)', 'Contador(a)', 'Enfermero(a)', 'Chofer', 'Abogado(a)', 'Administrador(a)', 'Médico(a)', 'Independiente'];

function azar(semilla: string): number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
const elegir = <T>(lista: T[], semilla: string): T => lista[Math.floor(azar(semilla) * lista.length)];
// N dígitos pseudoaleatorios (combina dos sorteos para no repetir terminaciones)
const digitos = (semilla: string, n: number) =>
  String(Math.floor(azar(`${semilla}-a`) * 10000) * 1000 + Math.floor(azar(`${semilla}-b`) * 1000)).padStart(7, '0').slice(-n);

// Rosa Quispe (usuaria 6, con cuenta de padre) es la madre de Luis Mamani (3ro A) y de Sofía Mamani (6to A)
const ROSA: Tutor = { id: 6, nombre: 'Rosa Quispe', ci: '4567123', telefono: '70012345', email: 'rosa.quispe@gmail.com', ocupacion: 'Comerciante' };

// Un padre o madre por estudiante inscrito (los estudiantes nuevos todavía no tienen tutor registrado)
const generados = MOCK_ESTUDIANTES.filter((e) => e.id !== 2 && e.id !== 1400 && e.paraleloId !== 0).map((e) => {
  const apellido = e.nombre.split(' ').slice(1).join(' ');
  const parentesco: Parentesco = azar(`par-${e.id}`) < 0.55 ? 'madre' : azar(`tut-${e.id}`) < 0.9 ? 'padre' : 'tutor';
  const nombre = parentesco === 'padre'
    ? `${elegir(HOMBRES, `n-${e.id}`)} ${apellido} ${elegir(APELLIDOS, `a-${e.id}`)}`
    : `${elegir(MUJERES, `n-${e.id}`)} ${elegir(APELLIDOS, `a-${e.id}`)} ${elegir(APELLIDOS, `b-${e.id}`)}`;
  const tutor: Tutor = {
    id: 5000 + e.id,
    nombre,
    ci: `${3 + Math.floor(azar(`ci0-${e.id}`) * 4)}${digitos(`ci-p-${e.id}`, 6)}`,
    telefono: `7${digitos(`tel-${e.id}`, 7)}`,
    email: azar(`mail-${e.id}`) < 0.7 ? `${nombre.split(' ')[0].toLowerCase()}.${nombre.split(' ')[1].toLowerCase()}@gmail.com`.normalize('NFD').replace(/[̀-ͯ]/g, '') : '',
    ocupacion: elegir(OCUPACIONES, `oc-${e.id}`),
  };
  return { tutor, estudianteId: e.id, parentesco };
});

export const MOCK_PADRES: Tutor[] = [ROSA, ...generados.map((g) => g.tutor)].sort((a, b) => a.nombre.localeCompare(b.nombre));

let idVinculo = 0;
export const MOCK_VINCULOS: Vinculo[] = [
  { id: ++idVinculo, padreId: 6, estudianteId: 2, parentesco: 'madre' },
  { id: ++idVinculo, padreId: 6, estudianteId: 1400, parentesco: 'madre' },
  ...generados.map((g) => ({ id: ++idVinculo, padreId: g.tutor.id, estudianteId: g.estudianteId, parentesco: g.parentesco })),
];
