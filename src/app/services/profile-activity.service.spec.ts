import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import type { Membership } from '../core/models/space.model';
import { ProfileActivityService } from './profile-activity.service';

const membership = (tipo: 'colegio' | 'academia', rol: Membership['rol']): Membership =>
  ({ espacio: { id: 7, slug: 'san-jose', nombre: 'San José', tipo }, rol }) as Membership;

describe('ProfileActivityService', () => {
  let service: ProfileActivityService;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProfileActivityService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('lists the real spaces of the account, with whether it can leave each one', () => {
    let result: unknown;
    service.espacios().subscribe((spaces) => (result = spaces));
    requests.expectOne(`${environment.API_URL}/espacios`).flush([
      { espacio: { id: 7, slug: 'san-jose', nombre: 'San José', tipo: 'colegio', estado: 'activo', plan: 'pagado' }, rol: 'docente', desde: '2026-02-03T10:00:00.000Z', puedeSalir: false, motivo: 'Para salir del colegio habla con la dirección.', puedeRechazar: false },
    ]);
    expect(result).toEqual([
      { espacioId: 7, slug: 'san-jose', nombre: 'San José', tipo: 'colegio', rol: 'docente', desde: '2026-02-03', puedeSalir: false, motivo: 'Para salir del colegio habla con la dirección.', puedeRechazar: false },
    ]);
  });

  it('leaves an academy through the API', () => {
    service.salirDeEspacio('academia web').subscribe();
    const request = requests.expectOne(`${environment.API_URL}/espacios/academia%20web/membresia`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('asks for the indicators with the active role and explains each one', () => {
    let labels: string[] = [];
    let tooltips: string[] = [];
    service.indicadores(membership('colegio', 'docente')).subscribe((list) => {
      labels = list.map((i) => `${i.label}:${i.valor}`);
      tooltips = list.map((i) => i.ayuda);
    });
    const request = requests.expectOne((r) => r.url === `${environment.API_URL}/espacios/san-jose/indicadores`);
    expect(request.request.params.get('rol')).toBe('docente');
    request.flush({ rol: 'docente', tipo: 'colegio', clases: 4, estudiantes: 120, porRevisar: 9, puntualidad: null });
    expect(labels).toEqual(['Clases:4', 'Estudiantes:120', 'Por revisar:9', 'Puntualidad:—']);
    expect(tooltips.every((t) => t.length > 0)).toBeTrue();
  });

  it('uses academy words for a student of an academy', () => {
    let first = '';
    service.indicadores(membership('academia', 'estudiante')).subscribe((list) => (first = `${list[0].label} ${list[2].detalle}`));
    requests.expectOne(() => true).flush({ rol: 'estudiante', aulas: 2, progreso: 40, asistencia: 75, tareasPorEntregar: 1 });
    expect(first).toBe('Cursos de las sesiones en vivo');
  });
});
