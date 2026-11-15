import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../shared/ui/notification.service';
import { CalendarReceiptComponent } from './calendar-receipt.component';
import type { PaymentHistory, ScheduledInstallment } from './payments-api.service';

const installments: ScheduledInstallment[] = [
  { index: 0, label: 'Anticipo de instalación', concept: 'anticipo', periodFrom: '2026-12-01', periodTo: '2027-01-31', dueDate: '2026-12-05', amountBs: '2940.00', paidBs: '0.00', remainingBs: '2940.00', status: 'pending', isOverdue: false, paymentIds: [] },
  ...Array.from({ length: 10 }, (_, index): ScheduledInstallment => ({ index: index + 1, label: ['Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre'][index], concept: 'cuota_mensual', periodFrom: `2027-${String(index + 2).padStart(2,'0')}-01`, periodTo: new Date(Date.UTC(2027,index + 2,0)).toISOString().slice(0,10), dueDate: `2027-${String(index + 2).padStart(2,'0')}-05`, amountBs: '1176.00', paidBs: '0.00', remainingBs: '1176.00', status: 'pending', isOverdue: false, paymentIds: [] })),
];
const history: PaymentHistory = {
  year: 2027, space: { id: 42, name: 'Colegio de prueba', type: 'colegio', plan: 'pagado', status: 'activo', paidUntil: null }, payments: [], uncoveredPeriods: [],
  calendar: { year: 2027, mode: 'first_year', reason: 'Contrato', unappliedBs: '0.00', installments,
    pricing: { studentCount: 245, priceTier: 'normal', annualRateBs: '60.00', volumeRateBs: '30.00', minimumBs: '6000.00', minimumApplied: false, baseBs: '14700.00', discountPercent: 0, discountBs: '0.00', totalBs: '14700.00' },
    summary: { totalCount: 11, paidCount: 0, monthlyCount: 10, monthlyPaidCount: 0, remainingCount: 11, overdueCount: 0, undeterminedCount: 0, expectedBs: '14700.00', paidBs: '0.00', remainingBs: '14700.00' },
  },
};

describe('CalendarReceiptComponent', () => {
  let requests: HttpTestingController;
  const base = `${environment.API_URL}/admin/spaces/42/payments/calendar/2027`;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CalendarReceiptComponent], providers: [provideHttpClient(), provideHttpClientTesting(), { provide: NotificationService, useValue: { success: jasmine.createSpy() } }] });
    requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => requests.verify());
  async function open() {
    const fixture = TestBed.createComponent(CalendarReceiptComponent);
    fixture.componentRef.setInput('history', history);
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();
    requests.expectOne(`${base}/receipt-preview`).flush(history);
    await fixture.whenStable();
    fixture.componentInstance.model.set({ amountBs: '5000.00', paidAt: '2026-11-11', reference: 'TEST-5000', reason: '' });
    fixture.detectChanges();
    return fixture;
  }

  it('shows the 5000 allocation to 2027 without manual coverage dates', async () => {
    const fixture = await open();
    expect(fixture.componentInstance.rows().slice(0,3).map(row => row.applied)).toEqual([294000,117600,88400]);
    expect(fixture.componentInstance.balanceAfter()).toBe(970000);
    expect(fixture.nativeElement.textContent).toContain('Pago para la gestión 2027');
    expect(fixture.nativeElement.querySelector('#receipt-date')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#payment-from')).toBeNull();
    expect(fixture.nativeElement.querySelector('#payment-to')).toBeNull();
  });

  it('waits for confirmation before sending the receipt and its reviewed allocation', async () => {
    const fixture = await open();
    fixture.componentInstance.review();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.reviewing()).toBeTrue();
    requests.expectNone(`${base}/receipts`);
    const completed = fixture.componentInstance.confirm();
    const request = requests.expectOne(`${base}/receipts`);
    expect(request.request.body).toEqual({ requestId: jasmine.any(String), amountBs: '5000.00', paidAt: '2026-11-11', reference: 'TEST-5000', allocations: [{ index: 0, amountBs: '2940.00' },{ index: 1, amountBs: '1176.00' },{ index: 2, amountBs: '884.00' }] });
    request.flush(history);
    await completed;
  });

  it('allows adjustments and blocks an allocation larger than the received amount', async () => {
    const fixture = await open();
    fixture.componentInstance.adjust();
    fixture.componentInstance.setAmount(2, '1176.00');
    expect(fixture.componentInstance.allocationError()).toContain('supera el dinero recibido');
    fixture.componentInstance.setAmount(2, '0.00');
    expect(fixture.componentInstance.credit()).toBe(88400);
    expect(fixture.componentInstance.allocationError()).toBe('');
    fixture.componentInstance.resetAllocation();
    expect(fixture.componentInstance.credit()).toBe(0);
  });

  it('lets the administrator continue without a reference and retries with the same automatic id', async () => {
    const fixture = await open();
    fixture.componentInstance.model.update(value => ({ ...value, reference: '' }));
    fixture.componentInstance.review();
    await fixture.whenStable();
    expect(fixture.componentInstance.reviewing()).toBeTrue();
    const first = fixture.componentInstance.confirm();
    const firstRequest = requests.expectOne(`${base}/receipts`);
    const id = firstRequest.request.body.requestId;
    firstRequest.flush('Network failure', { status: 503, statusText: 'Service Unavailable' });
    await first;
    const retry = fixture.componentInstance.confirm();
    const retryRequest = requests.expectOne(`${base}/receipts`);
    expect(retryRequest.request.body.requestId).toBe(id);
    expect(retryRequest.request.body.reference).toBe('');
    retryRequest.flush(history);
    await retry;
  });
});
