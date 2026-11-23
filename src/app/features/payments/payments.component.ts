import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormField, form, max, maxLength, min, pattern, required, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../core/auth/session.service';
import { readApiError } from '../../core/api/api-error';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { SELECT } from '../../shared/ui/select.component';
import { NotificationService } from '../../shared/ui/notification.service';
import { PAYMENT_LABELS, PaymentsApiService, type PaymentConcept, type PaymentEntry, type PaymentInput, type PaymentScope } from './payments-api.service';
import { PaymentCalendarComponent } from './payment-calendar.component';
import { CalendarReceiptComponent } from './calendar-receipt.component';
import { PaymentBalanceComponent } from './payment-balance.component';
import { fechaBolivia } from '../../core/utils/bolivia-time';

const blankPayment = (): PaymentInput & { reason: string } => ({
  concept: 'cuota_mensual', periodFrom: '', periodTo: '', seats: 1, amountBs: '',
  paidAt: new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' }), reference: '', reason: '',
});

@Component({
  selector: 'app-payments',
  host: { class: 'ui-pagina' },
  imports: [PageHeaderComponent, EmptyStateComponent, DrawerComponent, FormField, PaymentCalendarComponent, CalendarReceiptComponent, PaymentBalanceComponent, ...SELECT],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css',
})
export class PaymentsComponent {
  private readonly api = inject(PaymentsApiService);
  private readonly session = inject(SessionService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly canRecord = this.session.isPlatformAdmin;
  readonly scope = computed<PaymentScope>(() => this.canRecord()
    ? { spaceId: Number(this.params().get('spaceId')) }
    : { slug: this.session.activeSpace()!.slug });
  readonly selectedYear = signal<number | undefined>(undefined);
  readonly history = rxResource({ params: () => ({ scope: this.scope(), year: this.selectedYear() }), stream: ({ params }) => this.api.history(params.scope, params.year) });
  readonly space = computed(() => this.history.value()?.space);
  readonly coverageNeedsReview = computed(() => this.history.value()?.account?.payments.some(payment => payment.historical) ?? false);
  readonly labels = PAYMENT_LABELS;

  // ---------- History: search, filters and pages ----------
  // A school records tens of payments a year: they come whole from the API and are filtered here
  readonly search = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly amountMin = signal('');
  readonly amountMax = signal('');
  readonly onlyCurrent = signal(false);
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly filteredPayments = computed(() => {
    const text = this.search().trim().toLowerCase().replace(/^#/, '');
    const min = Number(this.amountMin()) || 0;
    const max = Number(this.amountMax()) || Infinity;
    return (this.history.value()?.payments ?? [])
      .filter((p) => !this.onlyCurrent() || p.isCurrent)
      .filter((p) => !this.dateFrom() || p.paidAt >= this.dateFrom())
      .filter((p) => !this.dateTo() || p.paidAt <= this.dateTo())
      .filter((p) => Number(p.amountBs) >= min && Number(p.amountBs) <= max)
      .filter((p) => !text || String(p.id) === text || (p.reference ?? '').toLowerCase().includes(text) || (this.labels[p.concept] ?? p.concept).toLowerCase().includes(text))
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt) || b.id - a.id);
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filteredPayments().length / this.pageSize)));
  readonly pagedPayments = computed(() => {
    const page = Math.min(this.page(), this.pages());
    return this.filteredPayments().slice((page - 1) * this.pageSize, page * this.pageSize);
  });
  readonly hasFilters = computed(() => !!(this.search() || this.dateFrom() || this.dateTo() || this.amountMin() || this.amountMax() || this.onlyCurrent()));
  readonly filteredTotal = computed(() => this.filteredPayments().filter((p) => p.isCurrent).reduce((sum, p) => sum + Number(p.amountBs), 0));

  setFilter(filter: 'search' | 'dateFrom' | 'dateTo' | 'amountMin' | 'amountMax', value: string): void {
    this[filter].set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    for (const filter of ['search', 'dateFrom', 'dateTo', 'amountMin', 'amountMax'] as const) this[filter].set('');
    this.onlyCurrent.set(false);
    this.page.set(1);
  }
  readonly balancePanel = viewChild(PaymentBalanceComponent);
  readonly paymentBalances = computed(() => new Map((this.history.value()?.account?.payments ?? []).map(payment => [payment.paymentId, payment] as const)));
  readonly conceptOptions = computed(() => (this.space()?.type === 'academia'
    ? ['mes_academia'] : ['anticipo', 'cuota_mensual', 'pago_anual']) as PaymentConcept[]);
  readonly isOpen = signal(false);
  readonly correctingId = signal<number | null>(null);
  readonly correctingEntry = computed(() => this.history.value()?.payments.find(entry => entry.id === this.correctingId()) ?? null);
  readonly saving = signal(false);
  readonly error = signal('');
  private submissionId = crypto.randomUUID();
  readonly model = signal(blankPayment());
  readonly paymentForm = form(this.model, (fields) => {
    required(fields.periodFrom, { message: 'Indica el inicio del período.' });
    required(fields.periodTo, { message: 'Indica el fin del período.' });
    validate(fields.periodTo, ({ value }) => value() < this.model().periodFrom ? { kind: 'range', message: 'El fin no puede ser anterior al inicio.' } : undefined);
    required(fields.paidAt, { message: 'Indica la fecha del pago.' });
    min(fields.seats, 1, { message: 'Debe ser al menos 1.' });
    max(fields.seats, 1_000_000, { message: 'Revisa el número de estudiantes.' });
    required(fields.amountBs, { message: 'Indica el monto recibido.' });
    pattern(fields.amountBs, /^\d{1,10}(?:[.,]\d{1,2})?$/, { message: 'Usa un monto con hasta dos decimales.' });
    validate(fields.amountBs, ({ value }) => Number(value().replace(',', '.')) <= 0 ? { kind: 'positive', message: 'El monto debe ser mayor a cero.' } : undefined);
    maxLength(fields.reference, 200, { message: 'Máximo 200 caracteres.' });
    maxLength(fields.reason, 500, { message: 'Máximo 500 caracteres.' });
    validate(fields.reason, ({ value }) => this.correctingId() !== null && !value().trim() ? { kind: 'required', message: 'Explica el motivo de la corrección.' } : undefined);
  });

  open(entry?: PaymentEntry): void {
    this.submissionId = crypto.randomUUID();
    this.correctingId.set(entry?.id ?? null);
    this.paymentForm().reset({
      ...blankPayment(), concept: this.space()?.type === 'academia' ? 'mes_academia' : 'cuota_mensual',
      seats: this.history.value()?.payments.find((payment) => payment.isCurrent)?.seats ?? 1,
      ...(entry ? {
        concept: entry.concept, periodFrom: entry.periodFrom, periodTo: entry.periodTo, seats: entry.seats,
        amountBs: entry.amountBs, paidAt: entry.paidAt, reference: entry.reference,
      } : {}),
    });
    this.error.set('');
    this.isOpen.set(true);
  }

  save(): void {
    if (this.saving() || !this.canRecord() || !this.space()) return;
    submit(this.paymentForm, async () => {
      this.saving.set(true);
      this.error.set('');
      const { reason, ...input } = this.model();
      const payment = { ...input, requestId: this.submissionId, amountBs: input.amountBs.replace(',', '.'), reference: input.reference.trim() };
      try {
        const correctionId = this.correctingId();
        await firstValueFrom(correctionId === null ? this.api.record(this.space()!.id, payment)
          : this.api.correct(this.space()!.id, correctionId, { ...payment, reason: reason.trim() }));
        this.isOpen.set(false);
        this.history.reload();
        this.notifications.success(correctionId === null ? 'Pago registrado.' : 'Corrección registrada; el original se conserva.');
      } catch (error) {
        this.error.set(readApiError(error).message);
      } finally { this.saving.set(false); }
    });
  }

  receiptSaved(year: number): void {
    this.isOpen.set(false);
    this.selectedYear.set(year);
    this.history.reload();
  }

  allocationLabel(concept: string, period: string): string {
    if (concept === 'anticipo') return 'Anticipo';
    if (concept === 'pago_anual') return 'Pago anual';
    return new Date(`${period}T12:00:00Z`).toLocaleDateString('es-BO', { month: 'long', timeZone: 'UTC' });
  }

  formatDate(date: string | null): string {
    return date ? fechaBolivia(date).split('-').reverse().join('/') : 'Sin pago registrado';
  }
  formatAmount(amount: string): string {
    return `Bs ${Number(amount).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
