import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TemaService } from './tema.service';
import { environment } from '../../environments/environment';
import { TemaDto } from '../models/TemaDto';
import { PaginadoDto } from '../models/PaginadoDto';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('TemaService', () => {
  let service: TemaService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.API_URL}/api/tema`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TemaService],
      schemas: [NO_ERRORS_SCHEMA]
    });
    service = TestBed.inject(TemaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve all temas with pagination', () => {
    const paginadoDto: PaginadoDto = { page: 0, size: 10, sortBy: 'titulo', sortDir: 'asc' };
    const dummyResponse = { content: [{ idTema: 1, titulo: 'Tema 1', orden: 1, descripcion: 'Descripción 1', recursoMultimedia: 'file1.png', estado: true, leccionId: 1 }], totalPages: 1 };

    service.getAllTemas(paginadoDto).subscribe((response) => {
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne(`${apiUrl}/all`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(paginadoDto);
    req.flush(dummyResponse);
  });

  it('should retrieve a tema by ID', () => {
    const dummyTema: TemaDto = { idTema: 1, titulo: 'Tema 1', orden: 1, descripcion: 'Descripción 1', recursoMultimedia: 'file1.png', estado: true, leccionId: 1 };

    service.getTemaById(1).subscribe((tema) => {
      expect(tema).toEqual(dummyTema);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyTema);
  });

  it('should retrieve temas by leccion with pagination', () => {
    const leccionId = 1;
    const paginadoDto: PaginadoDto = { page: 0, size: 10, sortBy: 'titulo', sortDir: 'asc' };
    const dummyResponse = { content: [{ idTema: 1, titulo: 'Tema 1', orden: 1, descripcion: 'Descripción 1', recursoMultimedia: 'file1.png', estado: true, leccionId: 1 }], totalPages: 1 };

    service.getTemasByLeccion(leccionId, paginadoDto).subscribe((response) => {
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne(`${apiUrl}/leccion/${leccionId}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(paginadoDto);
    req.flush(dummyResponse);
  });

  it('should create a new tema with a file', () => {
    const temaDto: TemaDto = { idTema: 0, titulo: 'Nuevo Tema', orden: 1, descripcion: 'Descripción del nuevo tema', recursoMultimedia: '', estado: true, leccionId: 1 };
    const dummyResponse = { ...temaDto, idTema: 2 };
    const file = new File(['dummy content'], 'file.png', { type: 'image/png' });

    service.createTema(temaDto, file).subscribe((response) => {
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne(`${apiUrl}/create`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush(dummyResponse);
  });

  it('should update a tema with a file', () => {
    const temaDto: TemaDto = { idTema: 1, titulo: 'Tema Actualizado', orden: 1, descripcion: 'Descripción actualizada', recursoMultimedia: '', estado: true, leccionId: 1 };
    const dummyResponse = temaDto;
    const file = new File(['dummy content'], 'file.png', { type: 'image/png' });

    service.updateTema(1, temaDto, file).subscribe((response) => {
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne(`${apiUrl}/update`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush(dummyResponse);
  });

  it('should delete a tema by ID', () => {
    service.deleteTema(1).subscribe((res) => {
      expect(res).toBeNull(); // Cambiado de `toBeUndefined` a `toBeNull`
    });

    const req = httpMock.expectOne(`${apiUrl}/delete/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null); // `null` es devuelto por la API, por lo que hacemos coincidir `flush(null)`
  });

});
