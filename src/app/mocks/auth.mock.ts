// ============================================================================
// DATOS MOCKEADOS del superadmin: solicitudes de colegios y la cuenta de plataforma (hasta conectar Usuarios)
// ============================================================================
import type { SchoolRequest } from '../core/models/auth.model';
import type { ProfileDto } from '../models/profile.dto';

export const MOCK_SOLICITUDES_COLEGIO: SchoolRequest[] = [
  {
    id: 1, colegio: 'Unidad Educativa Santa Ana', ciudad: 'Cochabamba', contacto: 'Patricia Rocha', cargo: 'Directora', correo: 'direccion@santaana.edu.bo',
    telefono: '71122334', estudiantes: 450, mensaje: 'Queremos digitalizar la asistencia y las notas para la próxima gestión.', fecha: '2026-10-17T10:20:00', estado: 'nueva',
  },
  {
    id: 2, colegio: 'Colegio Don Bosco', ciudad: 'La Paz', contacto: 'Jorge Mendoza', cargo: 'Secretario académico', correo: 'jmendoza@donbosco.edu.bo',
    telefono: '72233445', estudiantes: 800, mensaje: '', fecha: '2026-10-12T15:45:00', estado: 'contactado',
  },
];

// Platform account, separate from space members in the demo.
export const MOCK_ADMIN: ProfileDto = { idUsuario: 999, username: 'plataforma', gmail: 'plataforma@plaxi.com', status: true, nombre: 'Equipo', primerApellido: 'Aulix', segundoApellido: '', telefono: '', ci: '', id_rol: '', isAdmin: true };
