import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { AlertService } from './gmail.service';

describe('AlertService', () => {
  let service: AlertService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.API_URL}/alert/send`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AlertService],
    });
    service = TestBed.inject(AlertService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send alert to specified email', () => {
    const email = 'test@example.com';
    const responseMessage = 'Alert sent successfully';

    service.sendAlert(email).subscribe((response) => {
      expect(response).toBe(responseMessage);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email });
    req.flush(responseMessage);
  });
});
