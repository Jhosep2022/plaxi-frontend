import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MOCK_CATEGORIAS, MOCK_DELAY } from '../mocks/mock-data';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let originalCategories: typeof MOCK_CATEGORIAS;

  beforeEach(() => {
    originalCategories = structuredClone(MOCK_CATEGORIAS);
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoryService);
  });

  afterEach(() => {
    MOCK_CATEGORIAS.splice(0, MOCK_CATEGORIAS.length, ...originalCategories);
  });

  it('returns the available categories', fakeAsync(() => {
    let result: typeof MOCK_CATEGORIAS = [];
    service.getAllCategories().subscribe((categories) => result = categories);
    tick(MOCK_DELAY);
    expect(result).toEqual(originalCategories);
    expect(result).not.toBe(MOCK_CATEGORIAS);
  }));

  it('creates, updates and deletes a category', fakeAsync(() => {
    let categoryId = 0;
    service.createCategory({ idCategoria: 0, nombre: 'Science', descripcion: 'Science courses' })
      .subscribe((category) => categoryId = category.idCategoria);
    tick(MOCK_DELAY);
    expect(categoryId).toBeGreaterThan(0);

    service.updateCategory(categoryId, { idCategoria: categoryId, nombre: 'Physics', descripcion: 'Physics courses' }).subscribe();
    tick(MOCK_DELAY);
    service.getCategoryById(categoryId).subscribe((category) => expect(category.nombre).toBe('Physics'));
    tick(MOCK_DELAY);

    service.deleteCategory(categoryId).subscribe();
    tick(MOCK_DELAY);
    expect(MOCK_CATEGORIAS.some((category) => category.idCategoria === categoryId)).toBeFalse();
  }));
});
