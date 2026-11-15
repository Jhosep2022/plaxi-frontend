import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { SELECT } from '../../shared/ui/select.component';
import { NotificationService } from '../../shared/ui/notification.service';
import { readApiError } from '../../core/api/api-error';
import { PaymentsApiService, type CalendarMode, type PaymentHistory, type ScheduledInstallment, type SchoolPriceTier } from './payments-api.service';

const CONFIG_LABELS: Record<CalendarMode, string> = {
  first_year: 'Primera gestión: anticipo y 10 cuotas', renewal: 'Renovación: 10 cuotas sin anticipo', annual: 'Un pago anual', academy: 'Academia: meses por confirmar',
};
const STATUS_LABELS: Record<string, string> = { paid: 'Pagado', partial: 'Parcial', overdue: 'Vencido', pending: 'Pendiente', undetermined: 'Por determinar' };

@Component({
  selector: 'app-payment-calendar',
  imports: [EmptyStateComponent, DrawerComponent, FormField, ...SELECT],
  templateUrl: './payment-calendar.component.html',
  styleUrl: './payment-calendar.component.css',
})
export class PaymentCalendarComponent {
  readonly history = input.required<PaymentHistory>();
  readonly editable = input(false);
  readonly yearChange = output<number>();
  readonly changed = output<void>();
  private readonly api = inject(PaymentsApiService);
  private readonly notifications = inject(NotificationService);
  readonly calendar = computed(() => this.history().calendar);
  readonly year = computed(() => this.history().year ?? new Date().getFullYear());
  readonly isAcademy = computed(() => this.history().space.type === 'academia');
  readonly modes = computed<CalendarMode[]>(() => this.isAcademy() ? ['academy'] : this.history().suggestedMode === 'renewal' ? ['renewal', 'annual'] : ['first_year', 'renewal', 'annual']);
  readonly modeLabels = CONFIG_LABELS;
  readonly statusLabels = STATUS_LABELS;
  readonly openConfig = signal(false);
  readonly amountIndex = signal<number | null>(null);
  readonly amountLabel = signal('');
  readonly saving = signal(false);
  readonly error = signal('');
  readonly config = signal({ mode: 'first_year' as CalendarMode, priceTier: 'normal' as SchoolPriceTier, dueDate: '', reason: '' });
  readonly quote = computed(() => this.history().schoolPricing?.quotes.find((quote) => quote.mode === this.config().mode && quote.priceTier === this.config().priceTier));
  readonly advanceBs = computed(() => (Math.floor(Number(this.quote()?.totalBs ?? 0) * 100 * 0.2) / 100).toFixed(2));
  readonly monthlyBs = computed(() => ((Number(this.quote()?.totalBs ?? 0) - (this.config().mode === 'first_year' ? Number(this.advanceBs()) : 0)) / 10).toFixed(2));
  readonly enrollmentReady = computed(() => !!this.history().schoolPricing?.gestionId && (this.history().schoolPricing?.studentCount ?? 0) > 0);
  readonly pricingChanged = computed(() => !!this.calendar() && !this.isAcademy() &&
    (!this.calendar()?.pricing || this.calendar()?.pricing?.studentCount !== this.history().schoolPricing?.studentCount));
  readonly deadlineMismatch = computed(() => {
    const calendar = this.calendar();
    const deadline = calendar?.installments[0]?.dueDate;
    if (!deadline || !calendar || !['first_year','annual'].includes(calendar.mode)) return false;
    return deadline < `${this.year() - 1}-01-01` || deadline > `${this.year()}-${calendar.mode === 'first_year' ? '01-31' : '11-30'}`;
  });
  readonly configForm = form(this.config, (fields) => {
    validate(fields.dueDate, ({ value }) => {
      const mode = this.config().mode;
      if (!['first_year', 'annual'].includes(mode)) return undefined;
      if (!value()) return { kind: 'required', message: 'Indica la fecha límite para pagar.' };
      const lastDate = mode === 'first_year' ? `${this.year()}-01-31` : `${this.year()}-11-30`;
      return value() < `${this.year() - 1}-01-01` || value() > lastDate ? { kind: 'range', message: mode === 'first_year' ? `El anticipo de la gestión ${this.year()} debe vencer antes de febrero de ${this.year()}. Revisa la gestión seleccionada.` : `El pago anual debe vencer dentro del período de la gestión ${this.year()}.` } : undefined;
    });
    validate(fields.reason, ({ value }) => !value().trim() ? { kind: 'required', message: 'Indica el acuerdo o motivo de este calendario.' } : undefined);
    maxLength(fields.reason, 500);
  });
  readonly amount = signal({ amountBs: '', reason: '' });
  readonly amountForm = form(this.amount, (fields) => {
    validate(fields.amountBs, ({ value }) => !validAmount(value(), 0.01) ? { kind: 'amount', message: 'Indica un monto confirmado mayor a cero.' } : undefined);
    validate(fields.reason, ({ value }) => !value().trim() ? { kind: 'required', message: 'Explica cómo se confirmó el monto.' } : undefined);
    maxLength(fields.reason, 500);
  });

  selectYear(value: string): void {
    const year = Number(value);
    if (Number.isInteger(year) && year >= 2000 && year <= 2100) this.yearChange.emit(year);
  }
  configure(): void {
    this.configForm().reset({
      mode: this.calendar()?.mode ?? this.history().suggestedMode ?? (this.isAcademy() ? 'academy' : 'first_year'),
      priceTier: this.calendar()?.pricing?.priceTier ?? 'normal',
      dueDate: this.calendar()?.installments[0]?.dueDate ?? `${this.year() - 1}-12-05`, reason: '',
    });
    this.error.set('');
    this.openConfig.set(true);
  }
  editAmount(installment: ScheduledInstallment): void {
    this.amountIndex.set(installment.index);
    this.amountLabel.set(installment.label);
    this.amountForm().reset({ amountBs: installment.amountBs ?? '', reason: '' });
    this.error.set('');
  }
  saveConfig(): void {
    if (this.saving() || !this.editable() || (!this.isAcademy() && !this.enrollmentReady())) return;
    submit(this.configForm, async () => {
      const config = this.config();
      await this.persist(() => firstValueFrom(this.api.configureCalendar(this.history().space.id, this.year(), {
        mode: config.mode, reason: config.reason.trim(),
        ...(config.mode !== 'academy' ? { priceTier: config.priceTier } : {}),
        ...(['first_year', 'annual'].includes(config.mode) ? { dueDate: config.dueDate } : {}),
      })));
    });
  }
  saveAmount(): void {
    if (this.saving() || !this.editable() || this.amountIndex() === null) return;
    submit(this.amountForm, async () => {
      await this.persist(() => firstValueFrom(this.api.setInstallmentAmount(this.history().space.id, this.year(), this.amountIndex()!, this.amount().amountBs.replace(',', '.'), this.amount().reason.trim())));
    });
  }
  private async persist(operation: () => Promise<unknown>): Promise<void> {
    this.saving.set(true); this.error.set('');
    try {
      await operation();
      this.openConfig.set(false); this.amountIndex.set(null);
      this.changed.emit(); this.notifications.success('Calendario de pagos actualizado.');
    } catch (error) { this.error.set(readApiError(error).message); }
    finally { this.saving.set(false); }
  }
  date(value: string): string { return value.split('-').reverse().join('/'); }
  money(value: string | null): string { return value === null ? 'Por determinar' : `Bs ${Number(value).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
}

function validAmount(value: string, minimum = 1): boolean {
  return /^\d{1,10}(?:[.,]\d{1,2})?$/.test(value) && Number(value.replace(',', '.')) >= minimum;
}
