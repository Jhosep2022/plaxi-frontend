import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from '../../core/auth/session.service';
import { NotificationService } from '../../shared/ui/notification.service';
import { PaymentsComponent } from './payments.component';
import type { PaymentHistory } from './payments-api.service';

const history: PaymentHistory = {
  year: 2027,
  space: { id: 42, name: 'Colegio de prueba', type: 'colegio', plan: 'pagado', status: 'activo', paidUntil: '2027-02-28' },
  uncoveredPeriods: [],
  payments: [{
    id: 7, concept: 'cuota_mensual', periodFrom: '2027-02-01', periodTo: '2027-02-28', seats: 100,
    amountBs: '480.00', paidAt: '2027-02-05', reference: 'QR-001', recordedByName: 'Alclick',
    createdAt: '2027-02-05T12:00:00Z', replacesPaymentId: null, correctionReason: null, isCurrent: true,
  }],
};

describe('PaymentsComponent', () => {
  const admin = signal(true);
  let requests: HttpTestingController;
  beforeEach(() => {
    admin.set(true);
    const params = convertToParamMap({ spaceId: '42' });
    TestBed.configureTestingModule({ imports: [PaymentsComponent], providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: params }, paramMap: of(params) } },
      { provide: SessionService, useValue: { isPlatformAdmin: admin, activeSpace: signal({ slug: 'school' }) } },
      { provide: NotificationService, useValue: { success: jasmine.createSpy() } },
    ] });
    requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => requests.verify());

  it('opens a correction with the original receipt and requires a reason', async () => {
    const fixture = TestBed.createComponent(PaymentsComponent);
    fixture.detectChanges();
    requests.expectOne(`${environment.API_URL}/admin/spaces/42/payments`).flush(history);
    await fixture.whenStable();
    fixture.componentInstance.open(history.payments[0]);
    fixture.detectChanges();
    requests.expectOne(`${environment.API_URL}/admin/spaces/42/payments/calendar/2027/receipt-preview?correctionId=7`).flush(history);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Corregir pago #7');
    expect(fixture.componentInstance.model().amountBs).toBe('480.00');
    expect(fixture.componentInstance.paymentForm.reason().invalid()).toBeTrue();
    fixture.componentInstance.model.update((value) => ({ ...value, reason: 'Monto verificado con el banco' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.paymentForm.reason().valid()).toBeTrue();
  });

  it('shows the client its coverage without register or correction actions', async () => {
    admin.set(false);
    const fixture = TestBed.createComponent(PaymentsComponent);
    fixture.detectChanges();
    requests.expectOne(`${environment.API_URL}/espacios/school/payments`).flush(history);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('28/02/2027');
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    expect(buttons.some((button) => /Registrar pago|Corregir/.test(button.textContent ?? ''))).toBeFalse();
  });
});
