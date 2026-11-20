import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { SessionService } from '../core/auth/session.service';
import { AssignmentsService } from './assignments.service';
import { ClassroomsService } from './classrooms.service';
import { QuizService } from './quiz.service';

describe('Classrooms, assignments and quiz API contracts', () => {
  let http: HttpTestingController;
  let rol = 'estudiante';
  const base = environment.API_URL + '/espacios/colegio-real';

  beforeEach(() => {
    rol = 'estudiante';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { activeSpace: () => ({ id: 7, slug: 'colegio-real', tipo: 'colegio' }), userId: () => 3, activeRole: () => rol } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keys the group progress by account and keeps the school record to join grades', () => {
    let progreso: { estudianteId: number; personaId: number | null }[] = [];
    TestBed.inject(ClassroomsService).progresoGrupo(5).subscribe((p) => (progreso = p));
    http.expectOne(base + '/aulas/5/progreso').flush({ temas: 4, estudiantes: [{ usuarioId: 11, personaId: 40, nombre: 'Ana', vistos: 2, porcentaje: 50 }] });
    expect(progreso).toEqual([jasmine.objectContaining({ estudianteId: 11, personaId: 40 })]);
  });

  it('creates a unit in the classroom and edits it by its own id', () => {
    const aulas = TestBed.inject(ClassroomsService);
    aulas.guardarUnidad({ aulaId: 5, titulo: ' Unidad 1 ', descripcion: '', publicada: true, requiereAnterior: false }).subscribe();
    const crear = http.expectOne(base + '/aulas/5/unidades');
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body.titulo).toBe('Unidad 1');
    crear.flush({});
    aulas.guardarUnidad({ id: 9, aulaId: 5, titulo: 'Unidad 1', descripcion: '', publicada: false, requiereAnterior: false }).subscribe();
    expect(http.expectOne(base + '/unidades/9').request.method).toBe('PUT');
  });

  it('asks a parent the tasks of the chosen child', () => {
    rol = 'padre';
    TestBed.inject(AssignmentsService).tareasDeEstudiante(7, 40).subscribe();
    const request = http.expectOne((r) => r.url === base + '/tareas');
    expect(request.request.params.get('rol')).toBe('padre');
    expect(request.request.params.get('hijo')).toBe('40');
    request.flush([]);
  });

  it('sends the review by account and the grade criterion only when it counts', () => {
    const tareas = TestBed.inject(AssignmentsService);
    tareas.revisar(3, [{ usuarioId: 11, nota: 80, comentario: ' Bien ' }]).subscribe();
    const revision = http.expectOne(base + '/tareas/3/revision');
    expect(revision.request.body).toEqual({ revisiones: [{ usuarioId: 11, nota: 80, comentario: 'Bien' }] });
    revision.flush({ revisadas: 1 });

    tareas.crear({ aulaId: 5, titulo: 'Informe', instrucciones: '', entrega: '2026-12-01', hora: '23:59', aceptaTardias: false }, 0).subscribe();
    const crear = http.expectOne(base + '/aulas/5/tareas');
    expect(crear.request.body.criterioId).toBeUndefined();
    expect(crear.request.body.aceptaTardias).toBeFalse();
    crear.flush({});
  });

  it('submits a delivery that keeps the files already uploaded', () => {
    TestBed.inject(AssignmentsService).entregar(3, 'Listo', [], [21]).subscribe();
    const entrega = http.expectOne(base + '/tareas/3/entrega');
    expect(entrega.request.method).toBe('PUT');
    expect(entrega.request.body).toEqual({ texto: 'Listo', archivos: [{ archivoId: 21 }] });
    entrega.flush({});
  });

  it('opens an attempt on the server and sends the answers to that attempt', () => {
    const quiz = TestBed.inject(QuizService);
    quiz.iniciar(8).subscribe();
    const inicio = http.expectOne(base + '/quiz/8/intentos');
    expect(inicio.request.method).toBe('POST');
    inicio.flush({ intento: { id: 30, inicio: '', expira: null }, quiz: {}, preguntas: [] });

    quiz.enviar(30, [{ preguntaId: 1, valor: 0 }]).subscribe();
    const envio = http.expectOne(base + '/intentos/30');
    expect(envio.request.method).toBe('PUT');
    expect(envio.request.body).toEqual({ respuestas: [{ preguntaId: 1, valor: 0 }] });
    envio.flush({});
  });

  it('turns the course grades into a map by quiz', () => {
    let notas = new Map<number, number>();
    TestBed.inject(QuizService).notasCurso(5).subscribe((n) => (notas = n.estudiantes[0].notas));
    http.expectOne(base + '/aulas/5/notas').flush({ quizzes: [], estudiantes: [{ usuarioId: 11, personaId: null, nombre: 'Ana', notas: { 8: 90 }, promedio: 90 }] });
    expect(notas.get(8)).toBe(90);
  });
});
