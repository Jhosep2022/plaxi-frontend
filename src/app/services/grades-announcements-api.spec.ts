import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { SessionService } from '../core/auth/session.service';
import { AnnouncementsService } from './announcements.service';
import { GradesApiService } from './grades-api.service';

describe('Grades and announcements API contracts', () => {
  let http: HttpTestingController;
  const base = environment.API_URL + '/espacios/colegio-real';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { activeSpace: () => ({ id: 7, slug: 'colegio-real' }), userId: () => 3 } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks the sheet of one subject, class group and period', () => {
    TestBed.inject(GradesApiService).sheet(4, 9, 1).subscribe();
    const request = http.expectOne((r) => r.url === base + '/calificaciones/planilla');
    expect(request.request.params.get('paralelo')).toBe('4');
    expect(request.request.params.get('materia')).toBe('9');
    expect(request.request.params.get('periodo')).toBe('1');
    request.flush({});
  });

  it('saves only the changed grades and reports how many were stored', () => {
    let guardadas = 0;
    TestBed.inject(GradesApiService)
      .saveGrades([{ actividadId: 1, estudianteId: 2, valor: 80 }])
      .subscribe((n) => (guardadas = n));
    const request = http.expectOne(base + '/calificaciones/notas');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ cambios: [{ actividadId: 1, estudianteId: 2, valor: 80 }] });
    request.flush({ guardadas: 1 });
    expect(guardadas).toBe(1);
  });

  it('adds up the load progress of every assignment per period', () => {
    let progreso: { notasCargadas: number; notasEsperadas: number; materiasSinActividades: number }[] = [];
    TestBed.inject(GradesApiService)
      .progressByPeriod(2)
      .subscribe((p) => (progreso = p));
    http.expectOne(base + '/calificaciones/progreso').flush([
      { periodos: [{ periodo: 0, actividades: 2, notas: 50, esperadas: 60 }, { periodo: 1, actividades: 0, notas: 0, esperadas: 0 }] },
      { periodos: [{ periodo: 0, actividades: 1, notas: 30, esperadas: 30 }, { periodo: 1, actividades: 1, notas: 10, esperadas: 30 }] },
    ]);
    expect(progreso[0]).toEqual(jasmine.objectContaining({ notasCargadas: 80, notasEsperadas: 90, materiasSinActividades: 0 }));
    expect(progreso[1]).toEqual(jasmine.objectContaining({ notasCargadas: 10, notasEsperadas: 30, materiasSinActividades: 1 }));
  });

  it('maps the inbox: an unread announcement has no read record', () => {
    let lista: { lectura: unknown }[] = [];
    TestBed.inject(AnnouncementsService)
      .recibidos()
      .subscribe((x) => (lista = x));
    http.expectOne(base + '/comunicados/recibidos').flush([
      { comunicado: { id: 1, fechaEvento: null, autorId: 5 }, lectura: { leidoEl: null, confirmadoEl: null } },
      { comunicado: { id: 2, fechaEvento: null, autorId: 5 }, lectura: { leidoEl: '2026-11-19T10:00:00Z', confirmadoEl: '2026-11-19T10:01:00Z' } },
    ]);
    expect(lista[0].lectura).toBeNull();
    expect(lista[1].lectura).toEqual(jasmine.objectContaining({ comunicadoId: 2, confirmado: true }));
  });

  it('publishes with the role and asks the reach before sending', () => {
    const servicio = TestBed.inject(AnnouncementsService);
    servicio.contar('docente', ['padres'], [3, 4]).subscribe();
    const alcance = http.expectOne((r) => r.url === base + '/comunicados/alcance');
    expect(alcance.request.params.get('rol')).toBe('docente');
    expect(alcance.request.params.get('publico')).toBe('padres');
    expect(alcance.request.params.get('paralelos')).toBe('3,4');
    alcance.flush({ destinatarios: 12 });

    servicio
      .publicar('docente', { titulo: ' Reunión ', mensaje: 'Reunión de padres el viernes.', categoria: 'evento', importante: false, publico: ['padres'], paraleloIds: [3], pideConfirmacion: true, fechaEvento: '' })
      .subscribe();
    const envio = http.expectOne((r) => r.url === base + '/comunicados' && r.method === 'POST');
    expect(envio.request.params.get('rol')).toBe('docente');
    expect(envio.request.body).toEqual(jasmine.objectContaining({ titulo: 'Reunión', fechaEvento: null }));
    envio.flush({ id: 9, fechaEvento: null, autorId: 3, lecturas: { destinatarios: 12, leidos: 0, confirmados: 0 } });
  });
});
