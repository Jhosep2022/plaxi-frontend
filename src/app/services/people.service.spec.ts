import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '../core/auth/session.service';
import { environment } from '../../environments/environment';
import { PeopleService } from './people.service';

describe('PeopleService live API', () => {
  let service: PeopleService, requests: HttpTestingController;
  const base = environment.API_URL + '/espacios/colegio-real';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionService,
          useValue: { activeSpace: () => ({ slug: 'colegio-real' }) },
        },
      ],
    });
    service = TestBed.inject(PeopleService);
    requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => requests.verify());
  const person = {
    id: 9999,
    nombre: 'María del Carmen López Pérez',
    nombres: 'María del Carmen',
    primerApellido: 'López',
    segundoApellido: 'Pérez',
    ci: '00123456',
    fechaNacimiento: '2018-02-20',
    paraleloId: 42,
    correo: '',
    telefono: '',
    activa: true,
  };
  it('reads imported people from the selected school and preserves compound names', () => {
    service
      .estudiantes()
      .subscribe((rows) =>
        expect(rows[0]).toEqual(
          jasmine.objectContaining({
            id: 9999,
            nombre: person.nombre,
            givenNames: 'María del Carmen',
            firstSurname: 'López',
            paraleloId: 42,
          }),
        ),
      );
    requests.expectOne(base + '/estudiantes').flush([person]);
  });
  it('saves names and enrollment together and exposes only newly generated access', () => {
    service
      .guardarEstudiante({
        id: 9999,
        nombre: person.nombre,
        givenNames: person.nombres,
        firstSurname: person.primerApellido,
        secondSurname: person.segundoApellido,
        ci: person.ci,
        fechaNacimiento: person.fechaNacimiento,
        paraleloId: 43,
      })
      .subscribe();
    const request = requests.expectOne(base + '/estudiantes/9999');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      nombres: 'María del Carmen',
      primerApellido: 'López',
      segundoApellido: 'Pérez',
      ci: '00123456',
      telefono: '',
      correo: '',
      fechaNacimiento: '2018-02-20',
      paraleloId: 43,
    });
    request.flush(person);
    requests.expectNone(base + '/estudiantes/9999/inscripcion');
  });
});
