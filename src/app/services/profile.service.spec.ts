import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProfileService } from './profile.service';
import { environment } from '../../environments/environment';
import { PerfilDto, ActualizarPerfilDto } from '../models/PerfilDto';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.API_URL}/perfil`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProfileService],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve all profiles', () => {
    const dummyProfiles: PerfilDto[] = [
      { idUsuario: 1, username: 'user1', gmail: 'user1@example.com', status: true, nombre: 'User1', primerApellido: 'Apellido1', segundoApellido: 'Apellido2', telefono: '123456789', ci: 'CI123', imagenUrl: 'http://example.com/image1.png', id_rol: 'admin' },
      { idUsuario: 2, username: 'user2', gmail: 'user2@example.com', status: true, nombre: 'User2', primerApellido: 'Apellido1', segundoApellido: 'Apellido2', telefono: '987654321', ci: 'CI124', imagenUrl: 'http://example.com/image2.png', id_rol: 'user' },
    ];

    service.getAllProfiles().subscribe((profiles) => {
      expect(profiles.length).toBe(2);
      expect(profiles).toEqual(dummyProfiles);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(dummyProfiles);
  });

  it('should retrieve a profile by ID', () => {
    const dummyProfile: PerfilDto = { idUsuario: 1, username: 'user1', gmail: 'user1@example.com', status: true, nombre: 'User1', primerApellido: 'Apellido1', segundoApellido: 'Apellido2', telefono: '123456789', ci: 'CI123', imagenUrl: 'http://example.com/image1.png', id_rol: 'admin' };

    service.getProfile(1).subscribe((profile) => {
      expect(profile).toEqual(dummyProfile);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyProfile);
  });

  it('should update a profile', () => {
    const updatedProfile: ActualizarPerfilDto = { username: 'user1', gmail: 'newuser1@example.com', nombre: 'User1Updated', primerApellido: 'Apellido1', segundoApellido: 'Apellido2', telefono: '123456789', ci: 'CI123' };

    service.updateProfile(1, updatedProfile).subscribe((response) => {
      expect(response).toBeTruthy();
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body instanceof FormData).toBeTruthy();
    req.flush(updatedProfile);
  });

  it('should delete a profile by ID', () => {
    service.deleteProfile(1).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});
