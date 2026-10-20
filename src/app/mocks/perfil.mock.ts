// ============================================================================
// DATOS MOCKEADOS del perfil: lo que no trae PerfilDto (datos personales extra, preferencias, dispositivos)
// ============================================================================
import type { PerfilExtra, PreferenciasNotificacion } from '../core/models/perfil.model';

const avisos = (correo: boolean): PreferenciasNotificacion => ({
  comunicados: { correo, app: true },
  tareas: { correo: false, app: true },
  calificaciones: { correo, app: true },
  asistencia: { correo, app: true },
  sesiones: { correo: false, app: true },
  resumen: { correo, app: false },
});

const sinEnlaces = { sitio: '', linkedin: '', instagram: '', youtube: '' };
const sinContacto = { nombre: '', parentesco: '', telefono: '' };

export const MOCK_PERFIL_EXTRA: Record<number, PerfilExtra> = {
  1: {
    fechaNacimiento: '1978-03-14', direccion: 'Av. Ballivián 1234, Cochabamba', especialidad: '', bio: '', enlaces: sinEnlaces, contactoEmergencia: sinContacto,
    miembroDesde: '2024-01-15', ultimoAcceso: '2026-10-19T07:40:00', claveActualizada: '2026-06-02', notificaciones: avisos(true),
    dispositivos: [
      { id: 1, nombre: 'Chrome en Windows', tipo: 'escritorio', ubicacion: 'Cochabamba, Bolivia', ultimoUso: '2026-10-19T07:40:00', actual: true },
      { id: 2, nombre: 'Safari en iPhone', tipo: 'movil', ubicacion: 'Cochabamba, Bolivia', ultimoUso: '2026-10-18T21:10:00', actual: false },
    ],
  },
  2: {
    fechaNacimiento: '2010-07-22', direccion: 'Calle Jordán 456, Cochabamba', especialidad: '', bio: '', enlaces: sinEnlaces,
    contactoEmergencia: { nombre: 'Rosa Quispe', parentesco: 'Madre', telefono: '70000006' },
    miembroDesde: '2025-02-03', ultimoAcceso: '2026-10-19T08:05:00', claveActualizada: '2026-02-03', notificaciones: avisos(false),
    dispositivos: [
      { id: 3, nombre: 'Chrome en Android', tipo: 'movil', ubicacion: 'Cochabamba, Bolivia', ultimoUso: '2026-10-19T08:05:00', actual: true },
      { id: 4, nombre: 'Edge en Windows', tipo: 'escritorio', ubicacion: 'Cochabamba, Bolivia', ultimoUso: '2026-10-17T16:30:00', actual: false },
    ],
  },
  3: {
    fechaNacimiento: '1986-11-05', direccion: 'Av. América 789, Cochabamba', especialidad: 'Matemáticas y Ciencias',
    bio: 'Docente de matemáticas y física con 12 años de experiencia. En mi academia enseño programación web y diseño de interfaces con proyectos reales.',
    enlaces: { sitio: 'https://mariafernandez.dev', linkedin: 'https://linkedin.com/in/mariafernandez', instagram: '', youtube: 'https://youtube.com/@profemaria' },
    contactoEmergencia: sinContacto,
    miembroDesde: '2024-02-01', ultimoAcceso: '2026-10-19T07:55:00', claveActualizada: '2026-08-20', notificaciones: avisos(true),
    dispositivos: [
      { id: 5, nombre: 'Chrome en Windows', tipo: 'escritorio', ubicacion: 'Cochabamba, Bolivia', ultimoUso: '2026-10-19T07:55:00', actual: true },
      { id: 6, nombre: 'Chrome en Android', tipo: 'movil', ubicacion: 'Cochabamba, Bolivia', ultimoUso: '2026-10-19T06:58:00', actual: false },
      { id: 7, nombre: 'Firefox en macOS', tipo: 'escritorio', ubicacion: 'La Paz, Bolivia', ultimoUso: '2026-10-11T19:20:00', actual: false },
    ],
  },
  6: {
    fechaNacimiento: '1982-05-30', direccion: 'Calle Jordán 456, Cochabamba', especialidad: '', bio: '', enlaces: sinEnlaces, contactoEmergencia: sinContacto,
    miembroDesde: '2025-02-03', ultimoAcceso: '2026-10-18T20:15:00', claveActualizada: '2025-02-03', notificaciones: avisos(true),
    dispositivos: [{ id: 8, nombre: 'Chrome en Android', tipo: 'movil', ubicacion: 'Cochabamba, Bolivia', ultimoUso: '2026-10-18T20:15:00', actual: true }],
  },
};

// Desde cuándo pertenece cada usuario a cada espacio ("usuarioId-espacioId")
export const MOCK_MIEMBRO_DESDE: Record<string, string> = {
  '1-1': '2024-01-15',
  '2-1': '2025-02-03',
  '2-2': '2026-09-01',
  '3-1': '2024-02-01',
  '3-2': '2025-06-10',
  '6-1': '2025-02-03',
};

// Perfil extra por defecto para usuarios que no tienen uno (p. ej. los que se registran)
export const perfilExtraVacio = (): PerfilExtra => ({
  fechaNacimiento: '', direccion: '', especialidad: '', bio: '', enlaces: { ...sinEnlaces }, contactoEmergencia: { ...sinContacto },
  miembroDesde: '2026-10-19', ultimoAcceso: '2026-10-19T08:00:00', claveActualizada: '2026-10-19', notificaciones: avisos(false),
  dispositivos: [{ id: 100, nombre: 'Este navegador', tipo: 'escritorio', ubicacion: 'Bolivia', ultimoUso: '2026-10-19T08:00:00', actual: true }],
});
