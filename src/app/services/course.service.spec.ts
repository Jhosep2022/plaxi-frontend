import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CourseService } from './course.service';
import { CursoDto, ActualizarCursoDto } from '../models/CursoDto';
import { environment } from '../../environments/environment';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('CourseService', () => {
  let service: CourseService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.API_URL}/curso`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CourseService],
      schemas: [NO_ERRORS_SCHEMA] // Añadido para ignorar errores de elementos desconocidos
    });
    service = TestBed.inject(CourseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve all courses', () => {
    const dummyCursos: CursoDto[] = [
      { idCurso: 1, nombre: 'Curso 1', descripcion: 'Descripción 1', dificultad: 'Básico', estado: true, categoriaId: 1 },
      { idCurso: 2, nombre: 'Curso 2', descripcion: 'Descripción 2', dificultad: 'Intermedio', estado: true, categoriaId: 2 },
    ];

    service.getAllCursos().subscribe((cursos) => {
      expect(cursos.length).toBe(2);
      expect(cursos).toEqual(dummyCursos);
    });

    const req = httpMock.expectOne(`${apiUrl}/all`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyCursos);
  });

  it('should retrieve a course by ID', () => {
    const dummyCurso: CursoDto = { idCurso: 1, nombre: 'Curso 1', descripcion: 'Descripción 1', dificultad: 'Básico', estado: true, categoriaId: 1 };

    service.getCursoById(1).subscribe((curso) => {
      expect(curso).toEqual(dummyCurso);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyCurso);
  });

  it('should retrieve courses by user ID', () => {
    const dummyCursos: CursoDto[] = [
      { idCurso: 1, nombre: 'Curso 1', descripcion: 'Descripción 1', dificultad: 'Básico', estado: true, categoriaId: 1 },
      { idCurso: 2, nombre: 'Curso 2', descripcion: 'Descripción 2', dificultad: 'Intermedio', estado: true, categoriaId: 2 },
    ];

    service.getCursosByUsuario(1).subscribe((cursos) => {
      expect(cursos).toEqual(dummyCursos);
    });

    const req = httpMock.expectOne(`${apiUrl}/usuario/1`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyCursos);
  });

  it('should create a new course', () => {
    const formData = new FormData();
    formData.append('nombre', 'Curso 3');
    formData.append('descripcion', 'Descripción 3');
    formData.append('dificultad', 'Avanzado');
    formData.append('estado', 'true');
    formData.append('categoriaId', '1');
    formData.append('usuarioCreadorId', '1');

    service.createCurso(formData).subscribe((response) => {
      expect(response).toEqual({});
    });

    const req = httpMock.expectOne(`${apiUrl}/create`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(formData);
    req.flush({});
  });

  it('should update an existing course', () => {
    const updatedCurso: ActualizarCursoDto = {
      nombre: 'Curso Actualizado',
      descripcion: 'Descripción Actualizada',
      dificultad: 'Avanzado',
      estado: true,
      categoriaId: 1,
      usuarioCreadorId: 1,
    };

    service.updateCurso(1, updatedCurso).subscribe((curso) => {
      expect(curso).toEqual(updatedCurso);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedCurso);
    req.flush(updatedCurso);
  });

  it('should delete a course by ID', () => {
      service.deleteCurso(1).subscribe((res) => {
          expect(res).toBeNull(); // Cambiado de toBeUndefined() a toBeNull()
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null); // Se envía null como respuesta simulada
  });

});
