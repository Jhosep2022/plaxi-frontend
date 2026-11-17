import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '../core/auth/session.service';
import { AcademicsService } from './academics.service';
import { environment } from '../../environments/environment';

describe('Academic API integration', () => {
  let service: AcademicsService, http: HttpTestingController;
  const base = environment.API_URL + '/espacios/colegio-real';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionService,
          useValue: {
            activeSpace: () => ({ id: 42, slug: 'colegio-real' }),
            activeRole: () => 'direccion',
          },
        },
      ],
    });
    service = TestBed.inject(AcademicsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('creates planned years without sending local-only state or tenant identifiers', () => {
    service
      .saveAcademicYear({
        espacioId: 42,
        anio: 2027,
        estado: 'activa',
        tipoPeriodo: 'trimestre',
        periodos: [],
      })
      .subscribe((year) => expect(year.estado).toBe('planificada'));
    const request = http.expectOne(base + '/gestiones');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      anio: 2027,
      tipoPeriodo: 'trimestre',
      periodos: [],
    });
    request.flush({ id: 81, estado: 'planificada' });
  });
  it('loads a chosen year and maps absent physical classrooms without losing enrollment counts', () => {
    service.getClassGroups(42, 81).subscribe((rows) => {
      expect(rows[0].aulaId).toBe(0);
      expect(rows[0].estudiantes).toBe(37);
    });
    http
      .expectOne(base + '/paralelos?gestion=81')
      .flush([{ id: 3, aulaId: null, estudiantes: 37 }]);
  });
  it('sends an unassigned room as null and excludes display-only fields', () => {
    service
      .saveClassGroup({
        id: 3,
        espacioId: 42,
        gestionId: 81,
        nivel: 'primaria',
        grado: 1,
        letra: 'A',
        turno: 'manana',
        aulaId: 0,
        capacidad: 40,
        estudiantes: 37,
      })
      .subscribe();
    const request = http.expectOne(base + '/paralelos/3');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      gestionId: 81,
      nivel: 'primaria',
      grado: 1,
      letra: 'A',
      turno: 'manana',
      aulaId: null,
      capacidad: 40,
    });
    request.flush({ id: 3, aulaId: null });
  });
  it('removes the actual allocation id instead of posting a fake teacher zero', () => {
    service.assignTeacher(42, 81, 3, 9, 0).subscribe();
    http
      .expectOne(base + '/asignaciones?gestion=81')
      .flush([{ id: 99, paraleloId: 3, materiaId: 9, docenteId: 16 }]);
    expect(http.expectOne(base + '/asignaciones/99').request.method).toBe(
      'DELETE',
    );
  });
  it('propagates server restrictions instead of silently modifying local data', () => {
    service
      .deleteClassGroup({ id: 3 } as never)
      .subscribe({ error: (error) => expect(error.status).toBe(409) });
    http
      .expectOne(base + '/paralelos/3')
      .flush(
        { code: 'paralelo_con_inscritos', message: 'Tiene inscritos.' },
        { status: 409, statusText: 'Conflict' },
      );
  });
});
