import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LeccionService } from './leccion.service';
import { environment } from '../../environments/environment';
import { LeccionDto } from '../models/LeccionDto';
import { PaginadoDto } from '../models/PaginadoDto';
import { Page } from '../models/page';
import { NO_ERRORS_SCHEMA } from '@angular/core';
describe('LeccionService', () => {
  let service: LeccionService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.API_URL}/leccion`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LeccionService],
      schemas: [NO_ERRORS_SCHEMA]
    });
    service = TestBed.inject(LeccionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve all lessons with pagination', () => {
    const paginadoDto: PaginadoDto = { page: 0, size: 10, sortBy: 'titulo', sortDir: 'asc' };
    const dummyPage: Page<LeccionDto> = {
      content: [
        { idLeccion: 1, titulo: 'Leccion 1', orden: 1, duracionEstimada: 30, contenido: 'Contenido 1', estado: true, cursoId: 101 },
        { idLeccion: 2, titulo: 'Leccion 2', orden: 2, duracionEstimada: 45, contenido: 'Contenido 2', estado: true, cursoId: 102 },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 10,
      number: 0,
    };

    service.getAllLecciones(paginadoDto).subscribe((page) => {
      expect(page).toEqual(dummyPage);
    });

    const req = httpMock.expectOne(`${apiUrl}/all`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(paginadoDto);
    req.flush(dummyPage);
  });

  it('should retrieve a lesson by ID', () => {
    const dummyLesson: LeccionDto = { idLeccion: 1, titulo: 'Leccion 1', orden: 1, duracionEstimada: 30, contenido: 'Contenido 1', estado: true, cursoId: 101 };

    service.getLeccionById(1).subscribe((lesson) => {
      expect(lesson).toEqual(dummyLesson);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyLesson);
  });

  it('should retrieve lessons by course with pagination', () => {
    const courseId = 101;
    const paginadoDto = { page: 0, size: 5, sortBy: 'orden', sortDir: 'asc' };
    const dummyLessons: LeccionDto[] = [
      { idLeccion: 1, titulo: 'Leccion 1', orden: 1, duracionEstimada: 30, contenido: 'Contenido 1', estado: true, cursoId: courseId },
      { idLeccion: 2, titulo: 'Leccion 2', orden: 2, duracionEstimada: 45, contenido: 'Contenido 2', estado: true, cursoId: courseId },
    ];

    service.getLeccionesByCurso(courseId, paginadoDto).subscribe((lessons) => {
      expect(lessons).toEqual(dummyLessons);
    });

    const req = httpMock.expectOne(`${apiUrl}/curso/${courseId}?page=${paginadoDto.page}&size=${paginadoDto.size}&sortBy=${paginadoDto.sortBy}&sortDir=${paginadoDto.sortDir}`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyLessons);
  });

  it('should create a new lesson', () => {
    const newLesson: LeccionDto = { titulo: 'Leccion 3', orden: 3, duracionEstimada: 40, contenido: 'Contenido 3', estado: true, cursoId: 101 };

    service.createLeccion(newLesson).subscribe((response) => {
      expect(response).toBe('Leccion creada exitosamente');
    });

    const req = httpMock.expectOne(`${apiUrl}/create`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newLesson);
    req.flush('Leccion creada exitosamente');
  });

  it('should update an existing lesson', () => {
    const updatedLesson: LeccionDto = { idLeccion: 1, titulo: 'Leccion Actualizada', orden: 1, duracionEstimada: 35, contenido: 'Contenido Actualizado', estado: true, cursoId: 101 };

    service.updateLeccion(updatedLesson).subscribe((response) => {
      expect(response).toBe(updatedLesson);
    });

    const req = httpMock.expectOne(`${apiUrl}/update`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedLesson);
    req.flush(updatedLesson);
  });

  it('should delete a lesson by ID', () => {
    const idLeccion = 1;

    service.deleteLeccion(idLeccion).subscribe((response) => {
      expect(response).toBe('Lección eliminada exitosamente');
    });

    const req = httpMock.expectOne(`${apiUrl}/delete/${idLeccion}`);
    expect(req.request.method).toBe('DELETE');
    req.flush('Lección eliminada exitosamente');
  });
});
