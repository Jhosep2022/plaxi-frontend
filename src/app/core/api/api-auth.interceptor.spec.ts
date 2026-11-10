import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { apiAuthInterceptor } from './api-auth.interceptor';
import { ApiSessionService } from './api-session.service';
import { SessionService } from '../auth/session.service';

describe('apiAuthInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let session: ApiSessionService;
  const profileUrl = `${environment.API_URL}/profile`;
  const refreshUrl = `${environment.API_URL}/auth/refresh`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiAuthInterceptor])),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { applyApiSession: jasmine.createSpy(), expireSession: jasmine.createSpy() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    session = TestBed.inject(ApiSessionService);
  });

  afterEach(() => controller.verify());

  it('adds the bearer token only to API requests', () => {
    session.setAccessToken('current-token');
    http.get(profileUrl).subscribe();
    http.get('https://example.com/image.svg').subscribe();

    const apiRequest = controller.expectOne(profileUrl);
    expect(apiRequest.request.headers.get('Authorization')).toBe('Bearer current-token');
    apiRequest.flush({});
    const externalRequest = controller.expectOne('https://example.com/image.svg');
    expect(externalRequest.request.headers.has('Authorization')).toBeFalse();
    externalRequest.flush('');
  });

  it('shares one refresh across simultaneous expired requests and retries both', () => {
    session.setAccessToken('expired-token');
    http.get(profileUrl).subscribe();
    http.get(`${environment.API_URL}/spaces`).subscribe();
    controller.expectOne(profileUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne(`${environment.API_URL}/spaces`).flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = controller.expectOne(refreshUrl);
    expect(refresh.request.withCredentials).toBeTrue();
    refresh.flush({ accessToken: 'new-token' });
    const retriedProfile = controller.expectOne(profileUrl);
    const retriedSpaces = controller.expectOne(`${environment.API_URL}/spaces`);
    expect(retriedProfile.request.headers.get('Authorization')).toBe('Bearer new-token');
    expect(retriedSpaces.request.headers.get('Authorization')).toBe('Bearer new-token');
    retriedProfile.flush({});
    retriedSpaces.flush({});
  });

  it('expires the local session when refresh fails', () => {
    session.setAccessToken('expired-token');
    http.get(profileUrl).subscribe({ error: () => undefined });
    controller.expectOne(profileUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne(refreshUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(TestBed.inject(SessionService).expireSession).toHaveBeenCalled();
  });

  it('preserves the replacement reason when the old student session is revoked', () => {
    session.setAccessToken('old-token');
    http.get(profileUrl).subscribe({ error: () => undefined });
    controller.expectOne(profileUrl).flush({ code: 'sesion_reemplazada' }, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne(refreshUrl).flush({ code: 'sesion_reemplazada' }, { status: 401, statusText: 'Unauthorized' });
    expect(TestBed.inject(SessionService).expireSession).toHaveBeenCalledWith('sesion_reemplazada');
  });
});
