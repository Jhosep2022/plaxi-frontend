import {
  IconDefinition,
  faAtom,
  faBook,
  faBookOpen,
  faBrain,
  faCalculator,
  faChalkboard,
  faComputer,
  faDoorOpen,
  faDumbbell,
  faFlask,
  faLandmark,
  faLanguage,
  faLeaf,
  faMusic,
  faPalette,
  faPersonRunning,
} from '@fortawesome/free-solid-svg-icons';
import { IconoMateria, TipoAula } from '../../../core/models/academico.model';

// Íconos y textos de presentación del módulo Académico (compartidos entre pantallas)

export const ICONOS_MATERIA: { id: IconoMateria; label: string; icono: IconDefinition }[] = [
  { id: 'calculadora', label: 'Matemáticas', icono: faCalculator },
  { id: 'atomo', label: 'Física', icono: faAtom },
  { id: 'matraz', label: 'Química', icono: faFlask },
  { id: 'libro', label: 'Lenguaje', icono: faBookOpen },
  { id: 'idioma', label: 'Idiomas', icono: faLanguage },
  { id: 'historia', label: 'Sociales', icono: faLandmark },
  { id: 'deporte', label: 'Deporte', icono: faPersonRunning },
  { id: 'computo', label: 'Computación', icono: faComputer },
  { id: 'arte', label: 'Arte', icono: faPalette },
  { id: 'musica', label: 'Música', icono: faMusic },
  { id: 'naturaleza', label: 'Naturaleza', icono: faLeaf },
  { id: 'pensamiento', label: 'Pensamiento', icono: faBrain },
];

export const iconoMateria = (id: IconoMateria): IconDefinition =>
  ICONOS_MATERIA.find((i) => i.id === id)?.icono ?? faBook;

export const ICONO_AULA: Record<TipoAula, IconDefinition> = {
  aula: faChalkboard,
  laboratorio: faFlask,
  computacion: faComputer,
  deportes: faDumbbell,
  biblioteca: faBook,
  otro: faDoorOpen,
};

// Mensaje de error legible desde un error del servicio
export const mensajeError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
