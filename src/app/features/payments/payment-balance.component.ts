import { Component, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { readApiError } from '../../core/api/api-error';
import { NotificationService } from '../../shared/ui/notification.service';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { PaymentsApiService, type PaymentHistory } from './payments-api.service';

@Component({
  selector: 'app-payment-balance',
  imports: [DrawerComponent],
  templateUrl: './payment-balance.component.html',
  styleUrl: './payment-balance.component.css',
})
export class PaymentBalanceComponent {
  readonly history = input.required<PaymentHistory>();
  readonly editable = input(false);
  readonly changed = output<void>();
  private readonly api = inject(PaymentsApiService);
  private readonly notifications = inject(NotificationService);
  private requestId = crypto.randomUUID();
  readonly saving = signal(false);
  readonly error = signal('');
  readonly plan = computed(() => this.history().creditPlan);
  readonly account = computed(() => this.history().account);
  readonly view = signal<'origin' | 'payment' | 'credit' | null>(null);
  readonly selectedId = signal<number | null>(null);
  readonly payment = computed(() => this.history().payments.find(payment => payment.id === this.selectedId()));
  readonly breakdown = computed(() => this.account()?.payments.find(payment => payment.paymentId === this.selectedId()));
  readonly sources = computed(() => this.account()?.payments.filter(payment => Number(payment.availableBs) > 0) ?? []);
  readonly isSchool = computed(() => this.history().space.type === 'colegio');
  openPayment(id: number): void { this.selectedId.set(id); this.view.set('payment'); }
  reviewCredit(): void { this.requestId = crypto.randomUUID(); this.error.set(''); this.view.set('credit'); }
  async applyCredit(): Promise<void> {
    const plan = this.plan();
    if (!this.editable() || this.saving() || !plan?.applications.length) return;
    this.saving.set(true); this.error.set('');
    try {
      await firstValueFrom(this.api.applyCredit(this.history().space.id, { requestId: this.requestId, version: plan.version }));
      this.view.set(null); this.changed.emit();
      this.notifications.success('Saldo aplicado. No se registró otro depósito.');
    } catch (error) { this.error.set(readApiError(error).message); }
    finally { this.saving.set(false); }
  }
  money(value: string): string { return `Bs ${Number(value).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
  date(value: string): string { return value.slice(0,10).split('-').reverse().join('/'); }
}
