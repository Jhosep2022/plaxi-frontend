import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MOCK_DELAY, MOCK_LECCIONES } from '../mocks/mock-data';
import { LessonService } from './lesson.service';

describe('LessonService', () => {
  let service: LessonService;
  let originalLessons: typeof MOCK_LECCIONES;
  const pagination = { page: 0, size: 10, sortBy: 'orden', sortDir: 'asc' };

  beforeEach(() => {
    originalLessons = structuredClone(MOCK_LECCIONES);
    TestBed.configureTestingModule({});
    service = TestBed.inject(LessonService);
  });
  afterEach(() => MOCK_LECCIONES.splice(0, MOCK_LECCIONES.length, ...originalLessons));

  it('creates, updates and deactivates a lesson in its course', fakeAsync(() => {
    const lesson = { titulo: 'First lesson', orden: 1, duracionEstimada: 30, contenido: 'Content', estado: true, cursoId: 87654 };
    service.createLesson(lesson).subscribe();
    tick(MOCK_DELAY);
    const created = MOCK_LECCIONES.find((item) => item.cursoId === 87654)!;
    expect(created).toBeDefined();
    service.getLessonsByCourse(87654, pagination).subscribe((page) => expect(page.content.length).toBe(1));
    tick(MOCK_DELAY);
    service.updateLesson({ ...created, titulo: 'Updated lesson' }).subscribe();
    tick(MOCK_DELAY);
    service.getLessonById(created.idLeccion!).subscribe((result) => expect(result.titulo).toBe('Updated lesson'));
    tick(MOCK_DELAY);
    service.deleteLesson(created.idLeccion!).subscribe();
    tick(MOCK_DELAY);
    service.getAllLessons(pagination).subscribe((page) => expect(page.content.some((item) => item.idLeccion === created.idLeccion)).toBeFalse());
    tick(MOCK_DELAY);
  }));
});
