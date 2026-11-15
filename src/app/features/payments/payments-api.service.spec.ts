import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PaymentsApiService, type PaymentInput } from './payments-api.service';

describe('PaymentsApiService', () => {
  let service: PaymentsApiService;
  let requests: HttpTestingController;
  const payment: PaymentInput = {
    concept: 'cuota_mensual', periodFrom: '2027-02-01', periodTo: '2027-02-28', seats: 100,
    amountBs: '480.00', paidAt: '2027-02-05', reference: 'QR-TEST-001',
  };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PaymentsApiService);
    requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => requests.verify());

  it('selects the calendar year without changing the client payment scope', () => {
    service.history({ slug: 'colegio' }, 2027).subscribe();
    const request = requests.expectOne(`${environment.API_URL}/espacios/colegio/payments?year=2027`);
    expect(request.request.params.get('year')).toBe('2027');
    request.flush({});
  });

  it('configures an agreement through the platform API with the audited reason', () => {
    service.configureCalendar(42, 2027, { mode: 'renewal', priceTier: 'normal', reason: 'Renovación firmada' }).subscribe();
    const request = requests.expectOne(`${environment.API_URL}/admin/spaces/42/payments/calendar/2027`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.reason).toBe('Renovación firmada');
    expect(request.request.body.priceTier).toBe('normal');
    expect(request.request.body.totalBs).toBeUndefined();
    request.flush({});
  });

  it('reads a client history through the scoped space route', () => {
    service.history({ slug: 'colegio-1ro-de-mayo' }).subscribe();
    const request = requests.expectOne(`${environment.API_URL}/espacios/colegio-1ro-de-mayo/payments`);
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
  it('records a verified receipt through the platform route', () => {
    service.record(42, payment).subscribe();
    const request = requests.expectOne(`${environment.API_URL}/admin/spaces/42/payments`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payment);
    request.flush({});
  });
  it('appends a correction with its target and reason instead of overwriting a payment', () => {
    service.correct(42, 7, { ...payment, reason: 'Monto mal transcrito' }).subscribe();
    const request = requests.expectOne(`${environment.API_URL}/admin/spaces/42/payments/7/corrections`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.reason).toBe('Monto mal transcrito');
    request.flush({});
  });
});
