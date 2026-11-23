import { rutaDeAviso } from './notice-route';

describe('rutaDeAviso', () => {
  it('agrega el rol de la cuenta cuando el aviso no lo trae', () => {
    expect(rutaDeAviso('/colegio/calificaciones', 'padre')).toBe('/colegio/padre/calificaciones');
    expect(rutaDeAviso('/colegio/asistencia', 'estudiante')).toBe('/colegio/estudiante/asistencia');
  });

  it('lleva las tareas de un aula a la lista de tareas del estudiante o del padre', () => {
    expect(rutaDeAviso('/colegio/aulas/4/tareas/9', 'estudiante')).toBe('/colegio/estudiante/tareas');
    expect(rutaDeAviso('/colegio/tareas/9', 'padre')).toBe('/colegio/padre/tareas');
    expect(rutaDeAviso('/academia/aulas/2/sesiones/7', 'estudiante')).toBe('/academia/estudiante/sesiones');
  });

  it('respeta un enlace que ya trae el rol y existe', () => {
    expect(rutaDeAviso('/academia/estudiante/aulas/12', 'estudiante')).toBe('/academia/estudiante/aulas/12');
    expect(rutaDeAviso('/colegio/padre/comunicados', 'padre')).toBe('/colegio/padre/comunicados');
  });

  it('acorta una pantalla que no existe y si no, lleva al inicio del espacio', () => {
    expect(rutaDeAviso('/colegio/padre/asistencia/licencias', 'padre')).toBe('/colegio/padre/asistencia');
    expect(rutaDeAviso('/colegio', 'direccion')).toBe('/colegio');
    expect(rutaDeAviso('/colegio/docente/clases', 'padre')).toBe('/colegio');
  });

  it('un aviso para la dirección también lleva a la secretaría a su pantalla', () => {
    expect(rutaDeAviso('/colegio/direccion/comunicados', 'secretaria')).toBe('/colegio/secretaria/comunicados');
    expect(rutaDeAviso('/colegio/direccion/pagos', 'secretaria')).toBe('/colegio');
  });
});
