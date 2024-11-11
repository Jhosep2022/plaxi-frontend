import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { InscripcionService } from './inscripcion.service';
import { environment } from '../../environments/environment';
import { InscripcionDto, InscripcionResponseDto } from '../models/inscripcionDto';
import { NO_ERRORS_SCHEMA } from '@angular/core';
describe('InscripcionService', () => {
  let service: InscripcionService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.API_URL}/api/inscripciones`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [InscripcionService],
      schemas: [NO_ERRORS_SCHEMA]
    });
    service = TestBed.inject(InscripcionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve all inscriptions', () => {
    const dummyInscriptions: InscripcionResponseDto[] = [
      {
        idInscripcion: 1,
        fechaInscripcion: '2024-11-11',
        estadoInscripcion: 'Activo',
        usuarioId: 1,
        usuarioNombre: 'John Doe',
        usuarioGmail: 'johndoe@example.com',
        cursoId: 101,
        cursoNombre: 'Curso 1',
        usuarioCreadorId: 5,
      },
      {
        idInscripcion: 2,
        fechaInscripcion: '2024-11-12',
        estadoInscripcion: 'Inactivo',
        usuarioId: 2,
        usuarioNombre: 'Jane Smith',
        usuarioGmail: 'janesmith@example.com',
        cursoId: 102,
        cursoNombre: 'Curso 2',
        usuarioCreadorId: null,
      },
    ];

    service.getAllInscripciones().subscribe((inscripciones) => {
      expect(inscripciones.length).toBe(2);
      expect(inscripciones).toEqual(dummyInscriptions);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(dummyInscriptions);
  });

  it('should retrieve an inscription by ID', () => {
    const dummyInscription: InscripcionResponseDto = {
      idInscripcion: 1,
      fechaInscripcion: '2024-11-11',
      estadoInscripcion: 'Activo',
      usuarioId: 1,
      usuarioNombre: 'John Doe',
      usuarioGmail: 'johndoe@example.com',
      cursoId: 101,
      cursoNombre: 'Curso 1',
      usuarioCreadorId: 5,
    };

    service.getInscripcionById(1).subscribe((inscripcion) => {
      expect(inscripcion).toEqual(dummyInscription);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyInscription);
  });

  it('should create a new inscription', () => {
    const newInscription: InscripcionDto = { usuarioId: 1, cursoId: 101 };
    const responseInscription: InscripcionResponseDto = {
      idInscripcion: 3,
      fechaInscripcion: '2024-11-11',
      estadoInscripcion: 'Activo',
      usuarioId: 1,
      usuarioNombre: 'John Doe',
      usuarioGmail: 'johndoe@example.com',
      cursoId: 101,
      cursoNombre: 'Curso 1',
      usuarioCreadorId: 5,
    };

    service.createInscripcion(newInscription).subscribe((inscripcion) => {
      expect(inscripcion).toEqual(responseInscription);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newInscription);
    req.flush(responseInscription);
  });

  it('should update an existing inscription', () => {
    const updatedInscription: InscripcionDto = { usuarioId: 1, cursoId: 101 };
    const responseInscription: InscripcionResponseDto = {
      idInscripcion: 1,
      fechaInscripcion: '2024-11-11',
      estadoInscripcion: 'Actualizado',
      usuarioId: 1,
      usuarioNombre: 'John Doe',
      usuarioGmail: 'johndoe@example.com',
      cursoId: 101,
      cursoNombre: 'Curso Actualizado',
      usuarioCreadorId: 5,
    };

    service.updateInscripcion(1, updatedInscription).subscribe((inscripcion) => {
      expect(inscripcion).toEqual(responseInscription);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedInscription);
    req.flush(responseInscription);
  });

  it('should delete an inscription by ID', () => {
    service.deleteInscripcion(1).subscribe((res) => {
      expect(res).toBeNull(); // Cambiado de `toBeUndefined` a `toBeNull`
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should retrieve inscriptions by user ID', () => {
    const userId = 1;
    const dummyInscriptions: InscripcionResponseDto[] = [
      {
        idInscripcion: 1,
        fechaInscripcion: '2024-11-11',
        estadoInscripcion: 'Activo',
        usuarioId: 1,
        usuarioNombre: 'John Doe',
        usuarioGmail: 'johndoe@example.com',
        cursoId: 101,
        cursoNombre: 'Curso 1',
        usuarioCreadorId: 5,
      },
    ];

    service.getInscripcionesByUsuarioId(userId).subscribe((inscripciones) => {
      expect(inscripciones.length).toBe(1);
      expect(inscripciones).toEqual(dummyInscriptions);
    });

    const req = httpMock.expectOne(`${apiUrl}/usuario/${userId}`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyInscriptions);
  });
});
