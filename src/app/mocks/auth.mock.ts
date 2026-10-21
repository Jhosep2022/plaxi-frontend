// ============================================================================
// DATOS MOCKEADOS de autenticación: contraseñas, tokens de recuperación y solicitudes de colegios
// ============================================================================
import type { SolicitudColegio } from '../core/models/auth.model';

// Contraseña por usuario. Los usuarios de ejemplo (sin entrada aquí) aceptan cualquier contraseña;
// los que se registran o cambian su contraseña quedan con la suya.
export const MOCK_CLAVES: Record<number, string> = {};

// Token de "olvidé mi contraseña" -> usuario (se usa una sola vez)
export const MOCK_TOKENS_RECUPERACION: Record<string, number> = {};

export const MOCK_SOLICITUDES_COLEGIO: SolicitudColegio[] = [
  {
    id: 1, colegio: 'Unidad Educativa Santa Ana', ciudad: 'Cochabamba', contacto: 'Patricia Rocha', cargo: 'Directora', correo: 'direccion@santaana.edu.bo',
    telefono: '71122334', estudiantes: 450, mensaje: 'Queremos digitalizar la asistencia y las notas para la próxima gestión.', fecha: '2026-10-17T10:20:00', estado: 'nueva',
  },
  {
    id: 2, colegio: 'Colegio Don Bosco', ciudad: 'La Paz', contacto: 'Jorge Mendoza', cargo: 'Secretario académico', correo: 'jmendoza@donbosco.edu.bo',
    telefono: '72233445', estudiantes: 800, mensaje: '', fecha: '2026-10-12T15:45:00', estado: 'contactado',
  },
];
