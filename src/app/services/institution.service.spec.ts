import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SessionService } from '../core/auth/session.service';
import { environment } from '../../environments/environment';
import { InstitutionService } from './institution.service';

describe('InstitutionService', () => {
  let service: InstitutionService;
  let requests: HttpTestingController;
  const school = { id: 42, slug: 'colegio-1ro-de-mayo', nombre: 'Colegio 1ro de Mayo' };
  const url = `${environment.API_URL}/espacios/${school.slug}/institucion`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: SessionService, useValue: { activeSpace: signal(school), memberships: signal([]) } },
    ] });
    service = TestBed.inject(InstitutionService);
    requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => requests.verify());

  it('loads a newly created school from its real space without another school’s mock data', () => {
    service.getDetails(42).subscribe((details) => {
      expect(details.id).toBe(42);
      expect(details.nombre).toBe(school.nombre);
      expect(details.niveles).toEqual([]);
      expect(details.sigla).toBe('');
    });
    requests.expectOne(url).flush({ id: 42, nombre: school.nombre, logo: '', espacioId: 42, logoArchivoId: null });
  });

  it('saves institution fields through the API and reloads persisted data', () => {
    service.getDetails(42).subscribe((details) => {
      service.save({ ...details, nombre: 'Colegio Primero de Mayo', niveles: ['primaria'], codigoSie: '12345678' }).subscribe();
    });
    requests.expectOne(url).flush({ id: 42, nombre: school.nombre, logo: '' });
    const save = requests.expectOne(url);
    expect(save.request.method).toBe('PUT');
    expect(save.request.body.nombre).toBe('Colegio Primero de Mayo');
    expect(save.request.body.id).toBeUndefined();
    expect(save.request.body.logo).toBeUndefined();
    expect(save.request.body.espacioId).toBeUndefined();
    expect(save.request.body.logoArchivoId).toBeUndefined();
    save.flush({});
    requests.expectOne(url).flush({ id: 42, nombre: 'Colegio Primero de Mayo', niveles: ['primaria'] });
  });
});
