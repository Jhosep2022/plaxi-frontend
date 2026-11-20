import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { SessionService } from '../core/auth/session.service';
import { avanceDe, porcentajeAvance, semanaDe } from '../core/utils/weekly-progress';
import { AdminUsersApiService } from '../features/admin/admin-users-api.service';
import { AcademyService } from './academy.service';
import { ClassroomsService } from './classrooms.service';
import { SessionsService } from './sessions.service';

describe('PDF topics, academies, admin accounts and the weekly ring', () => {
  let http: HttpTestingController;
  const base = environment.API_URL + '/espacios/academia-real';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { activeSpace: () => ({ id: 9, slug: 'academia-real', tipo: 'academia' }), userId: () => 3, activeRole: () => 'docente' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('does not save a PDF topic without its document', () => {
    let error = '';
    TestBed.inject(ClassroomsService)
      .guardarTema({ unidadId: 4, titulo: 'Guía', tipo: 'pdf', contenido: '', url: '', duracionMin: 10, publicado: true })
      .subscribe({ error: (e: Error) => (error = e.message) });
    expect(error).toBe('Sube el documento PDF.');
  });

  it('creates the PDF topic, uploads the file to it, links it and then publishes it', () => {
    // The storage PUT goes through HttpBackend (no API token); answer it from the testing backend too
    const pdf = new File(['%PDF-1.4'], 'guia.pdf', { type: 'application/pdf' });
    TestBed.inject(ClassroomsService)
      .guardarTema({ unidadId: 4, titulo: 'Guía', tipo: 'pdf', contenido: '', url: 'algo', duracionMin: 10, publicado: true }, pdf)
      .subscribe();
    const crear = http.expectOne(base + '/unidades/4/temas');
    expect(crear.request.body).toEqual(jasmine.objectContaining({ tipo: 'pdf', url: '', publicado: true }));
    crear.flush({ id: 50, publicado: false });
    const subida = http.expectOne(base + '/archivos/subida');
    expect(subida.request.body).toEqual(jasmine.objectContaining({ uso: 'tema', recursoId: 50, tipoMime: 'application/pdf' }));
    subida.flush({ id: 70, urlSubida: 'http://almacen.test/subida' });
    http.expectOne('http://almacen.test/subida').flush('');
    http.expectOne(base + '/archivos/70/confirmar').flush({});
    const vincular = http.expectOne(base + '/archivos/70/vincular');
    expect(vincular.request.method).toBe('PUT');
    vincular.flush({ archivoId: 70 });
    const publicar = http.expectOne(base + '/temas/50');
    expect(publicar.request.body.publicado).toBeTrue();
    publicar.flush({ id: 50, publicado: true, archivoId: 70 });
  });

  it('maps the catalog states and enrolls through the API', () => {
    const academia = TestBed.inject(AcademyService);
    let estado = '';
    academia.getCatalog().subscribe((l) => (estado = l[0].estado));
    http.expectOne(base + '/catalogo').flush([{ id: 2, nombre: 'Excel', docente: 'Ana', unidades: 1, temas: 3, estudiantes: 4, estado: 'pendiente', esMio: false }]);
    expect(estado).toBe('PENDIENTE');
    let inscrito = '';
    academia.enroll(2).subscribe((e) => (inscrito = e));
    http.expectOne(base + '/cursos/2/inscripcion').flush({ estado: 'activa' });
    expect(inscrito).toBe('ACTIVA');
  });

  it('keeps the live-session attendance by account', () => {
    let presentes = new Set<number>();
    TestBed.inject(SessionsService).resumenAsistencia().subscribe((r) => (presentes = r[0].estudiantes[0].presentes));
    http
      .expectOne(base + '/asistencia-sesiones')
      .flush([{ aulaId: 2, curso: 'Excel', sesiones: [], estudiantes: [{ usuarioId: 11, nombre: 'Ana', presentes: [5, 6], porcentaje: 100 }] }]);
    expect([...presentes]).toEqual([5, 6]);
  });

  it('asks the admin account list with search, tab and page on the server', () => {
    TestBed.inject(AdminUsersApiService).list(' ana ', 'pending', 2).subscribe();
    const request = http.expectOne((r) => r.url === environment.API_URL + '/admin/users');
    expect(request.request.params.get('search')).toBe('ana');
    expect(request.request.params.get('status')).toBe('pending');
    expect(request.request.params.get('page')).toBe('2');
    request.flush([]);
  });

  it('measures the ring with what is already done and is full without pending work', () => {
    const avance = avanceDe([
      { hechos: 3, total: 4, texto: (h, t) => `Revisaste ${h} de ${t} entregas` },
      { hechos: 0, total: 0, texto: () => 'nada' },
    ]);
    expect(avance).toEqual({ hechos: 3, total: 4, texto: 'Revisaste 3 de 4 entregas' });
    expect(porcentajeAvance(avance)).toBe(75);
    expect(porcentajeAvance(avanceDe([]))).toBe(100);
    expect(semanaDe('2026-11-20')).toEqual({ desde: '2026-11-16', hasta: '2026-11-22' });
  });
});

