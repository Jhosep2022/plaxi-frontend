import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '../core/auth/session.service';
import { environment } from '../../environments/environment';
import { AttendanceService } from './attendance.service';
import { SchedulesService } from './schedules.service';
import { TimeTrackingService } from './time-tracking.service';

describe('School operational API contracts', () => {
  let http: HttpTestingController;
  let role = 'direccion';
  const base = environment.API_URL + '/espacios/colegio-real';
  beforeEach(() => {
    role = 'direccion';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionService,
          useValue: {
            activeSpace: () => ({ id: 42, slug: 'colegio-real' }),
            activeRole: () => role,
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('previews workday changes on the server before any save', () => {
    TestBed.inject(SchedulesService)
      .previewWorkdayChanges({
        espacioId: 42,
        duracionPeriodoMin: 45,
        dias: [1],
        turnos: [],
      })
      .subscribe((count) => expect(count).toBe(3));
    const request = http.expectOne(base + '/jornada/previsualizar');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      duracionPeriodoMin: 45,
      dias: [1],
      turnos: [],
    });
    request.flush({ quitadas: 3 });
    http.expectNone(base + '/jornada');
  });
  it('saves a schedule class with server-owned ids and nullable room', () => {
    TestBed.inject(SchedulesService)
      .saveClass({
        espacioId: 42,
        gestionId: 81,
        paraleloId: 3,
        materiaId: 9,
        dia: 1,
        bloque: 2,
        aulaId: 0,
      })
      .subscribe((saved) => {
        expect(saved.id).toBe(88);
        expect(saved.aulaId).toBe(0);
      });
    const request = http.expectOne(base + '/horario/clases');
    expect(request.request.body).toEqual({
      paraleloId: 3,
      materiaId: 9,
      dia: 1,
      bloque: 2,
      aulaId: null,
    });
    request.flush({
      id: 88,
      paralelo: { id: 3 },
      materia: { id: 9 },
      dia: 1,
      bloque: 2,
      aula: null,
    });
  });
  it('records attendance without trusting a submitted teacher, subject or tenant', () => {
    TestBed.inject(AttendanceService)
      .saveAttendance(
        {
          espacioId: 42,
          docenteId: 999,
          materiaId: 999,
          paraleloId: 3,
          bloque: 2,
          fecha: '2026-11-16',
        },
        [{ estudianteId: 70, estado: 'presente', minutosTarde: 0 }],
      )
      .subscribe((count) => expect(count).toBe(1));
    const request = http.expectOne(base + '/asistencia/clase');
    expect(request.request.body).toEqual({
      paraleloId: 3,
      bloque: 2,
      fecha: '2026-11-16',
      marcas: [{ estudianteId: 70, estado: 'presente', minutosTarde: 0 }],
    });
    request.flush({ guardados: 1 });
  });
  it('resolves the student person id from the authenticated membership', () => {
    role = 'estudiante';
    TestBed.inject(AttendanceService).getStudentRecords(999).subscribe();
    http
      .expectOne(base + '/yo')
      .flush({ fichas: [{ id: 70, tipo: 'estudiante' }] });
    http.expectOne(base + '/asistencia/registros?estudianteId=70').flush([]);
  });
  it('preserves the actual leave requester id and the API-provided name', () => {
    TestBed.inject(AttendanceService)
      .getLeaveRequesters()
      .subscribe((names) => expect(names.get(300)).toBe('Madre real'));
    http
      .expectOne(base + '/licencias')
      .flush([{ solicitadaPor: 300, solicitante: 'Madre real' }]);
  });
  it('requests a rotating QR from the server without requesting a shared secret', () => {
    TestBed.inject(TimeTrackingService)
      .getDisplay('colegio-real', 'token-real')
      .subscribe((display) => expect(display.codigo).toBe('123456'));
    http
      .expectOne(base + '/marcacion/pantalla/token-real')
      .flush({ codigo: '123456', contenido: 'qr', segundosRestantes: 30 });
    http.expectNone(base + '/marcacion/puntos');
  });
  it('submits GPS and QR only; server time, identity and status remain authoritative', () => {
    TestBed.inject(TimeTrackingService)
      .recordEntry({
        espacioId: 42,
        docenteId: 999,
        tipo: 'entrada',
        puntoId: 5,
        codigo: '123456',
        latitud: -16.5,
        longitud: -68.1,
      })
      .subscribe();
    const request = http.expectOne(base + '/marcacion');
    expect(request.request.body).toEqual({
      tipo: 'entrada',
      puntoId: 5,
      codigo: '123456',
      latitud: -16.5,
      longitud: -68.1,
    });
    request.flush({ id: 1 });
  });
});
