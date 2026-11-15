import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../shared/ui/notification.service';
import { PaymentBalanceComponent } from './payment-balance.component';
import type { PaymentHistory } from './payments-api.service';

const history: PaymentHistory = {
  space: { id: 1, name: 'Colegio San José', type: 'colegio', plan: 'pagado', status: 'activo', paidUntil: '2027-11-11' },
  payments: [4,5,6].map(id => ({ id, concept: 'abono_gestion', amountBs: id === 6 ? '10000.00' : '5000.00', periodFrom: '2025-12-01', periodTo: '2026-11-30', seats: id === 4 ? 500 : 245, paidAt: '2026-11-14', createdAt: '2026-11-15T01:00:00Z', reference: '', recordedByName: 'Equipo', replacesPaymentId: null, correctionReason: null, isCurrent: true })),
  uncoveredPeriods: [], year: 2026,
  account: {
    receivedBs: '20000.00', agreedBs: '14700.00', appliedBs: '14700.00', outstandingBs: '0.00', creditBs: '5300.00', availableBs: '5300.00', pendingInstallmentsBs: '0.00', hasAgreements: true, undeterminedCount: 0, hasPendingAllocation: false, years: [2026],
    payments: [{ paymentId: 4, receivedBs: '5000.00', appliedBs: '1176.00', availableBs: '3824.00', historical: true, applications: [] },{ paymentId: 5, receivedBs: '5000.00', appliedBs: '5000.00', availableBs: '0.00', historical: false, applications: [] },{ paymentId: 6, receivedBs: '10000.00', appliedBs: '8524.00', availableBs: '1476.00', historical: false, applications: [] }],
  },
};

describe('PaymentBalanceComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PaymentBalanceComponent], providers: [
    provideHttpClient(), provideHttpClientTesting(), { provide: NotificationService, useValue: { success: jasmine.createSpy() } },
  ] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function render(value = history) {
    const fixture = TestBed.createComponent(PaymentBalanceComponent);
    fixture.componentRef.setInput('history', value);
    fixture.detectChanges();
    return fixture;
  }
  it('shows the complete credit prominently even when viewing a year with no calendar', () => {
    const fixture = render({ ...history, year: 2027, calendar: null });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Saldo del colegio');
    expect(text).toContain('Saldo a favor');
    expect(text).toContain(fixture.componentInstance.money('5300.00'));
    expect(text).toContain('Ver origen del saldo');
  });
  it('opens the originating payment and explains its available amount and historical count', () => {
    const fixture = render();
    fixture.componentInstance.view.set('origin');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(fixture.componentInstance.money('3824.00'));
    expect(fixture.nativeElement.textContent).toContain(fixture.componentInstance.money('1476.00'));
    fixture.componentInstance.openPayment(4);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Detalle del pago #4');
    expect(fixture.nativeElement.textContent).toContain('Disponible de este pago');
    expect(fixture.nativeElement.textContent).toContain('500 estudiantes');
    expect(fixture.nativeElement.textContent).not.toContain('Confirmar pago');
  });
  it('does not declare a missing agreement to have zero debt', () => {
    const fixture = render({ ...history, account: { ...history.account!, hasAgreements: false, years: [] } });
    expect(fixture.nativeElement.textContent).toContain('Por definir');
    expect(fixture.nativeElement.textContent).toContain('Dinero disponible');
  });
  it('requires an explicit confirmation to apply existing money and keeps the same key on retry', async () => {
    const fixture = render({ ...history, creditPlan: { version: 'a'.repeat(64), amountBs: '5300.00', remainingCreditBs: '0.00', applications: [{ paymentId: 4, year: 2027, index: 0, label: 'Febrero', concept: 'cuota_mensual', periodFrom: '2027-02-01', periodTo: '2027-02-28', amountBs: '5300.00' }] } });
    fixture.componentRef.setInput('editable', true);
    fixture.componentInstance.reviewCredit(); fixture.detectChanges();
    const requests = TestBed.inject(HttpTestingController);
    const url = `${environment.API_URL}/admin/spaces/1/payments/credit-applications`;
    requests.expectNone(url);
    expect(fixture.nativeElement.textContent).toContain('Confirmar aplicación del saldo');
    const first = fixture.componentInstance.applyCredit();
    const request = requests.expectOne(url);
    const input = request.request.body;
    expect(input).toEqual({ requestId: jasmine.any(String), version: 'a'.repeat(64) });
    request.flush('Unavailable', { status: 503, statusText: 'Service Unavailable' }); await first;
    const retry = fixture.componentInstance.applyCredit();
    const second = requests.expectOne(url); expect(second.request.body).toEqual(input);
    second.flush(history); await retry;
    expect(fixture.componentInstance.view()).toBeNull();
  });
});
