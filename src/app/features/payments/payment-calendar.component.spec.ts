import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '../../shared/ui/notification.service';
import { PaymentCalendarComponent } from './payment-calendar.component';
import type { PaymentHistory, SchoolPricing } from './payments-api.service';

const normalPricing: SchoolPricing = { studentCount: 300, priceTier: 'normal', annualRateBs: '60.00', volumeRateBs: '30.00', minimumBs: '6000.00', minimumApplied: false, baseBs: '18000.00', discountPercent: 0, discountBs: '0.00', totalBs: '18000.00' };

const history: PaymentHistory = {
  space: { id: 42, name: 'Colegio', type: 'colegio', plan: 'pagado', status: 'activo', paidUntil: '2027-02-28' },
  payments: [], uncoveredPeriods: [], year: 2027,
  schoolPricing: { gestionId: 12, studentCount: 300, quotes: [
    { ...normalPricing, mode: 'first_year' },
    { ...normalPricing, mode: 'annual', discountPercent: 10, discountBs: '1800.00', totalBs: '16200.00' },
  ] },
  calendar: {
    year: 2027, mode: 'first_year', reason: 'Contrato', unappliedBs: '0.00',
    summary: { totalCount: 11, paidCount: 5, monthlyCount: 10, monthlyPaidCount: 4, remainingCount: 6, overdueCount: 1, undeterminedCount: 0, expectedBs: '18000.00', paidBs: '9360.00', remainingBs: '8640.00' },
    installments: [{ index: 1, label: 'Febrero', concept: 'cuota_mensual', periodFrom: '2027-02-01', periodTo: '2027-02-28', dueDate: '2027-02-05', amountBs: '1440.00', paidBs: '720.00', remainingBs: '720.00', status: 'partial', isOverdue: true, paymentIds: [7] }],
  },
};

describe('PaymentCalendarComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PaymentCalendarComponent], providers: [
    provideHttpClient(), provideHttpClientTesting(), { provide: NotificationService, useValue: { success: jasmine.createSpy() } },
  ] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows the client how many monthly installments are paid, the balance and the partial overdue fee', () => {
    const fixture = TestBed.createComponent(PaymentCalendarComponent);
    fixture.componentRef.setInput('history', history);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('4 de 10');
    expect(text).toContain('cuotas mensuales pagadas');
    expect(text).toContain('Parcial · vencido');
    expect(text).toContain('Movimientos #7');
    expect(text).not.toContain('Configurar acuerdo');
  });

  it('makes missing agreements explicit instead of displaying a zero debt', () => {
    const fixture = TestBed.createComponent(PaymentCalendarComponent);
    fixture.componentRef.setInput('history', { ...history, calendar: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay calendario de cuotas');
    expect(fixture.nativeElement.textContent).not.toContain('saldo de la gestión');
  });

  it('requires the platform to give a reason when configuring an agreement', () => {
    const fixture = TestBed.createComponent(PaymentCalendarComponent);
    fixture.componentRef.setInput('history', history);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    fixture.componentInstance.configure();
    fixture.detectChanges();
    expect(fixture.componentInstance.configForm.reason().invalid()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Acuerdo de la gestión 2027');
  });

  it('shows enrollment, automatic prices and the advance instead of asking for a manual total', () => {
    const fixture = TestBed.createComponent(PaymentCalendarComponent);
    fixture.componentRef.setInput('history', history);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    fixture.componentInstance.configure();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('300 estudiantes inscritos en 2027');
    expect(fixture.nativeElement.textContent).toContain('Total calculado:');
    expect(fixture.componentInstance.advanceBs()).toBe('3600.00');
    expect(fixture.componentInstance.monthlyBs()).toBe('1440.00');
    expect(fixture.nativeElement.querySelector('#calendar-total')).toBeNull();
    fixture.componentInstance.config.update(value => ({ ...value, mode: 'annual' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.quote()?.totalBs).toBe('16200.00');
    expect(fixture.nativeElement.textContent).toContain('Descuento por pago anual: 10 %');
  });

  it('blocks school calculation when the selected year has no enrollments', () => {
    const fixture = TestBed.createComponent(PaymentCalendarComponent);
    fixture.componentRef.setInput('history', { ...history, schoolPricing: { gestionId: null, studentCount: 0, quotes: [] } });
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    fixture.componentInstance.configure();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[form="calendar-config"]').disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('todavía no tiene esta gestión registrada');
  });

  it('explains the service year and rejects an advance deadline in the following school year', () => {
    const fixture = TestBed.createComponent(PaymentCalendarComponent);
    fixture.componentRef.setInput('history', history);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    fixture.componentInstance.configure();
    fixture.componentInstance.config.update(value => ({ ...value, dueDate: '2028-12-05' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.configForm.dueDate().invalid()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('el anticipo vence antes de febrero');
    expect(fixture.nativeElement.textContent).toContain('1 de diciembre de 2026 al 30 de noviembre de 2027');
  });
  it('defaults the next agreement to renewal and offers no second installation advance', () => {
    const fixture = TestBed.createComponent(PaymentCalendarComponent);
    fixture.componentRef.setInput('history', { ...history, calendar: null, suggestedMode: 'renewal' });
    fixture.componentRef.setInput('editable', true); fixture.detectChanges();
    fixture.componentInstance.configure(); fixture.detectChanges();
    expect(fixture.componentInstance.config().mode).toBe('renewal');
    expect(fixture.componentInstance.modes()).toEqual(['renewal','annual']);
    expect(fixture.nativeElement.querySelector('#calendar-due')).toBeNull();
  });
});
