import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CategoriaService } from './categoria.service';
import { environment } from '../../environments/environment';
import { Categoria } from '../models/categoriaDto';

describe('CategoriaService', () => {
  let service: CategoriaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CategoriaService],
    });
    service = TestBed.inject(CategoriaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve all categories', () => {
    const dummyCategorias: Categoria[] = [
      { idCategoria: 1, nombre: 'Category 1', descripcion: 'Descripcion 1' },
      { idCategoria: 2, nombre: 'Category 2', descripcion: 'Descripcion 2' },
    ];

    service.getAllCategorias().subscribe((categorias) => {
      expect(categorias.length).toBe(2);
      expect(categorias).toEqual(dummyCategorias);
    });

    const req = httpMock.expectOne(`${environment.API_URL}/categorias`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyCategorias);
  });

  it('should retrieve a category by ID', () => {
    const dummyCategoria: Categoria = { idCategoria: 1, nombre: 'Category 1', descripcion: 'Descripcion 1' };

    service.getCategoriaById(1).subscribe((categoria) => {
      expect(categoria).toEqual(dummyCategoria);
    });

    const req = httpMock.expectOne(`${environment.API_URL}/categorias/1`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyCategoria);
  });

  it('should create a new category', () => {
    const newCategoria: Categoria = { idCategoria: 3, nombre: 'Category 3', descripcion: 'Descripcion 3' };

    service.createCategoria(newCategoria).subscribe((categoria) => {
      expect(categoria).toEqual(newCategoria);
    });

    const req = httpMock.expectOne(`${environment.API_URL}/categorias`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newCategoria);
    req.flush(newCategoria);
  });

  it('should update an existing category', () => {
    const updatedCategoria: Categoria = { idCategoria: 1, nombre: 'Updated Category', descripcion: 'Updated Description' };

    service.updateCategoria(1, updatedCategoria).subscribe((categoria) => {
      expect(categoria).toEqual(updatedCategoria);
    });

    const req = httpMock.expectOne(`${environment.API_URL}/categorias/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedCategoria);
    req.flush(updatedCategoria);
  });

  it('should delete a category by ID', () => {
    service.deleteCategoria(1).subscribe((res) => {
      expect(res).toBeNull(); // Cambiado de `toBeUndefined` a `toBeNull`
    });

    const req = httpMock.expectOne(`${environment.API_URL}/categorias/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
