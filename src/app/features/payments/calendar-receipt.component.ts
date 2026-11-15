import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { readApiError } from '../../core/api/api-error';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { NotificationService } from '../../shared/ui/notification.service';
import { PaymentsApiService, type PaymentEntry, type PaymentHistory } from './payments-api.service';

const blankReceipt = () => ({ amountBs: '', paidAt: new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' }), reference: '', reason: '' });
function cents(value: string): number {
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  return Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
}
function decimal(value: number): string { return (value / 100).toFixed(2); }
const amountPattern = /^\d{1,10}(?:[.,]\d{1,2})?$/;

@Component({
  selector: 'app-calendar-receipt',
  imports: [DrawerComponent, FormField],
  templateUrl: './calendar-receipt.component.html',
  styleUrl: './calendar-receipt.component.css',
})
export class CalendarReceiptComponent {
  readonly history = input.required<PaymentHistory>();
  readonly opened = input(false);
  readonly entry = input<PaymentEntry | null>(null);
  readonly closed = output<void>();
  readonly saved = output<number>();
  private readonly api = inject(PaymentsApiService);
  private readonly notifications = inject(NotificationService);
  private submissionId = crypto.randomUUID();
  private readonly targetYear = signal<number | undefined>(undefined);
  readonly year = computed(() => this.targetYear() ?? this.entry()?.calendarYear ?? this.history().year ?? new Date().getFullYear());
  readonly preview = rxResource({
    params: () => this.opened() ? { id: this.history().space.id, year: this.year(), correctionId: this.entry()?.id } : undefined,
    stream: ({ params }) => this.api.receiptPreview(params.id, params.year, params.correctionId),
  });
  readonly model = signal(blankReceipt());
  readonly receiptForm = form(this.model, fields => {
    validate(fields.amountBs, ({ value }) => !amountPattern.test(value()) || cents(value()) <= 0 ? { kind: 'amount', message: 'Indica cuánto dinero recibiste, con hasta dos decimales.' } : undefined);
    required(fields.paidAt, { message: 'Indica qué día recibiste el dinero.' });
    maxLength(fields.reference, 200);
    validate(fields.reason, ({ value }) => this.entry() !== null && !value().trim() ? { kind: 'required', message: 'Explica por qué corriges el pago o su reparto.' } : undefined);
    maxLength(fields.reason, 500);
  });
  readonly manual = signal(false);
  readonly manualAmounts = signal<Record<number, string>>({});
  readonly reviewing = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly calendar = computed(() => this.preview.value()?.calendar);
  readonly received = computed(() => amountPattern.test(this.model().amountBs) ? cents(this.model().amountBs) : 0);
  readonly rows = computed(() => {
    let remaining = this.received();
    return (this.calendar()?.installments ?? []).map(item => {
      const pending = cents(item.remainingBs ?? '0');
      const automatic = Math.min(remaining, pending);
      remaining -= automatic;
      const value = this.manual() ? this.manualAmounts()[item.index] ?? '0' : decimal(automatic);
      const applied = amountPattern.test(value) ? cents(value) : 0;
      return { ...item, value, applied, pending, after: pending - applied };
    });
  });
  readonly allocated = computed(() => this.rows().reduce((sum, row) => sum + row.applied, 0));
  readonly credit = computed(() => Math.max(this.received() - this.allocated(), 0));
  readonly balanceAfter = computed(() => Math.max(cents(this.calendar()?.summary.remainingBs ?? '0') - this.allocated(), 0));
  readonly allocationError = computed(() => {
    if (this.rows().some(row => !amountPattern.test(row.value) || row.applied > row.pending)) return 'Revisa el reparto: usa importes positivos o cero, sin superar el saldo de cada cuota.';
    if (this.allocated() > this.received()) return 'El reparto supera el dinero recibido. Reduce los importes antes de continuar.';
    return '';
  });
  readonly canReview = computed(() => !!this.calendar()?.pricing && !this.preview.isLoading() && !this.preview.error() && !this.allocationError());

  constructor() {
    effect(() => {
      if (!this.opened()) return;
      const entry = this.entry();
      this.submissionId = crypto.randomUUID();
      this.targetYear.set(undefined);
      this.receiptForm().reset({ ...blankReceipt(), ...(entry ? { amountBs: entry.amountBs, paidAt: entry.paidAt, reference: entry.reference } : {}) });
      this.manual.set(false); this.manualAmounts.set({}); this.reviewing.set(false); this.error.set('');
    });
  }
  selectYear(value: string): void {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return;
    this.targetYear.set(year); this.resetAllocation();
  }
  adjust(): void {
    this.manualAmounts.set(Object.fromEntries(this.rows().map(row => [row.index, row.value])));
    this.manual.set(true); this.reviewing.set(false);
  }
  setAmount(index: number, value: string): void { this.manualAmounts.update(previous => ({ ...previous, [index]: value })); }
  resetAllocation(): void { this.manual.set(false); this.manualAmounts.set({}); this.reviewing.set(false); this.error.set(''); }
  refresh(): void { this.resetAllocation(); this.preview.reload(); }
  review(): void {
    if (!this.canReview()) return;
    submit(this.receiptForm, async () => { this.reviewing.set(true); });
  }
  async confirm(): Promise<void> {
    if (this.saving() || !this.reviewing() || !this.canReview() || this.receiptForm().invalid()) return;
    this.saving.set(true); this.error.set('');
    const input = {
      requestId: this.submissionId,
      amountBs: decimal(this.received()), paidAt: this.model().paidAt, reference: this.model().reference.trim(),
      ...(this.calendar()?.version ? { calendarVersion: this.calendar()!.version } : {}),
      allocations: this.rows().filter(row => row.applied > 0).map(row => ({ index: row.index, amountBs: decimal(row.applied) })),
    };
    try {
      const entry = this.entry();
      await firstValueFrom(entry ? this.api.correctCalendarReceipt(this.history().space.id, this.year(), entry.id, { ...input, reason: this.model().reason.trim() }) : this.api.recordCalendarReceipt(this.history().space.id, this.year(), input));
      this.notifications.success(entry ? 'Corrección y reparto registrados; el original se conserva.' : 'Pago y reparto registrados.');
      this.saved.emit(this.year()); this.closed.emit();
    } catch (error) { this.error.set(readApiError(error).message); }
    finally { this.saving.set(false); }
  }
  money(value: number): string { return `Bs ${(value / 100).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
  date(value: string): string { return value.split('-').reverse().join('/'); }
}
