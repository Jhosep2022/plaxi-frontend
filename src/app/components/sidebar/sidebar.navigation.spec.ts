import { navegacion } from './sidebar.navigation';

describe('menú de la secretaría', () => {
  const rutas = (rol: 'direccion' | 'secretaria') => navegacion('colegio', rol).flatMap((m) => m.sections.flatMap((s) => s.items.map((i) => i.route)));

  it('usa sus propias rutas y no muestra lo que decide la dirección', () => {
    const suyas = rutas('secretaria').filter((r) => !r.startsWith('perfil'));
    expect(suyas.every((r) => r.startsWith('secretaria/'))).toBe(true);
    for (const prohibida of ['calificaciones/escala', 'calificaciones/periodos', 'asistencia/personal', 'reportes/puntualidad', 'pagos', 'institucion', 'personas/secretaria'])
      expect(suyas).not.toContain(`secretaria/${prohibida}`);
    expect(suyas).toContain('secretaria/personas/estudiantes');
    expect(suyas).toContain('secretaria/comunicados');
  });

  it('la dirección ve la pantalla para crear la secretaría', () => {
    expect(rutas('direccion')).toContain('direccion/personas/secretaria');
  });
});
