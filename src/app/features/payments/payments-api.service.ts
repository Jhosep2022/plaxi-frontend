import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export type PaymentConcept = 'anticipo' | 'cuota_mensual' | 'pago_anual' | 'mes_academia' | 'abono_gestion';
export interface PaymentAllocation { year: number; concept: string; periodFrom: string; periodTo: string; amountBs: string }
export interface CalendarReceiptInput { requestId?: string; amountBs: string; paidAt: string; reference?: string; calendarVersion?: string; allocations: { index: number; amountBs: string }[] }
export interface PaymentInput {
  requestId?: string;
  concept: PaymentConcept;
  periodFrom: string;
  periodTo: string;
  seats: number;
  amountBs: string;
  paidAt: string;
  reference: string;
}
export interface PaymentEntry extends PaymentInput {
  id: number;
  replacesPaymentId: number | null;
  correctionReason: string | null;
  recordedByName: string;
  createdAt: string;
  isCurrent: boolean;
  calendarYear?: number | null;
  allocations?: PaymentAllocation[] | null;
}
export interface PaymentHistory {
  suggestedMode?: CalendarMode;
  creditPlan?: CreditPlan;
  creditApplications?: { id: number; recordedBy: number; createdAt: string; applications: CreditAllocation[] }[];
  account?: AccountBalance;
  space: { id: number; name: string; type: 'colegio' | 'academia'; plan: 'gratis' | 'pagado'; status: string; paidUntil: string | null };
  payments: PaymentEntry[];
  uncoveredPeriods: { periodFrom: string; periodTo: string }[];
  year?: number;
  availableYears?: number[];
  calendar?: PaymentCalendar | null;
  schoolPricing?: { gestionId: number | null; studentCount: number; quotes: (SchoolPricing & { mode: CalendarMode })[] } | null;
  // Paid academy: what a month would cost today (active students and storage), with both rates
  academyPricing?: { studentCount: number; storageGb: number; quotes: AcademyPricing[] } | null;
}
export interface AcademyPricing {
  priceTier: 'normal' | 'founder'; studentCount: number; perStudentBs: string; minimumBs: string; minimumApplied: boolean;
  studentsBs: string; storageGb: number; extraStorageBlocks: number; extraStorageBs: string; totalBs: string;
}
export interface PaymentBalance {
  paymentId: number; receivedBs: string; appliedBs: string; availableBs: string; historical: boolean;
  applications: { creditApplicationId?: number; year: number; index: number; label: string; periodFrom: string; periodTo: string; amountBs: string }[];
}
export interface CreditAllocation extends PaymentAllocation { paymentId: number; index: number; label: string }
export interface CreditPlan { version: string; amountBs: string; remainingCreditBs: string; applications: CreditAllocation[] }
export interface AccountBalance {
  receivedBs: string; agreedBs: string; appliedBs: string; outstandingBs: string; creditBs: string;
  availableBs: string; pendingInstallmentsBs: string; hasAgreements: boolean; undeterminedCount: number;
  hasPendingAllocation: boolean; years: number[]; payments: PaymentBalance[];
}
export type CalendarMode = 'first_year' | 'renewal' | 'annual' | 'academy';
export type SchoolPriceTier = 'normal' | 'founder';
export interface SchoolPricing {
  studentCount: number; priceTier: SchoolPriceTier; annualRateBs: string; volumeRateBs: string;
  minimumBs: string; minimumApplied: boolean; baseBs: string; discountPercent: number; discountBs: string; totalBs: string;
}
export interface CalendarInput { mode: CalendarMode; priceTier?: SchoolPriceTier; dueDate?: string; reason: string }
export interface ScheduledInstallment {
  index: number; label: string; concept: PaymentConcept; periodFrom: string; periodTo: string; dueDate: string;
  amountBs: string | null; paidBs: string; remainingBs: string | null; isOverdue: boolean; status: string; paymentIds: number[];
}
export interface PaymentCalendar {
  version?: string;
  year: number; mode: CalendarMode; reason: string; installments: ScheduledInstallment[];
  pricing?: SchoolPricing | null;
  summary: { totalCount: number; paidCount: number; monthlyCount: number; monthlyPaidCount: number; remainingCount: number; overdueCount: number; undeterminedCount: number; expectedBs: string; paidBs: string; remainingBs: string };
  unappliedBs: string;
  creditBs?: string;
}
export type PaymentScope = { spaceId: number } | { slug: string };

export const PAYMENT_LABELS: Record<PaymentConcept, string> = {
  anticipo: 'Anticipo', cuota_mensual: 'Cuota mensual', pago_anual: 'Pago anual', mes_academia: 'Mes de academia', abono_gestion: 'Abono a la gestión',
};

@Injectable({ providedIn: 'root' })
export class PaymentsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.API_URL;

  history(scope: PaymentScope, year?: number) {
    const path = 'spaceId' in scope ? `admin/spaces/${scope.spaceId}` : `espacios/${encodeURIComponent(scope.slug)}`;
    return this.http.get<PaymentHistory>(`${this.url}/${path}/payments`, { params: year === undefined ? new HttpParams() : new HttpParams().set('year', year) });
  }
  configureCalendar(spaceId: number, year: number, config: CalendarInput) {
    return this.http.put<PaymentHistory>(`${this.url}/admin/spaces/${spaceId}/payments/calendar/${year}`, config);
  }
  applyCredit(spaceId: number, input: { requestId: string; version: string }) {
    return this.http.post<PaymentHistory>(`${this.url}/admin/spaces/${spaceId}/payments/credit-applications`, input);
  }
  receiptPreview(spaceId: number, year: number, correctionId?: number) {
    return this.http.get<PaymentHistory>(`${this.url}/admin/spaces/${spaceId}/payments/calendar/${year}/receipt-preview`, { params: correctionId === undefined ? new HttpParams() : new HttpParams().set('correctionId', correctionId) });
  }
  recordCalendarReceipt(spaceId: number, year: number, input: CalendarReceiptInput) {
    return this.http.post<PaymentHistory>(`${this.url}/admin/spaces/${spaceId}/payments/calendar/${year}/receipts`, input);
  }
  correctCalendarReceipt(spaceId: number, year: number, paymentId: number, input: CalendarReceiptInput & { reason: string }) {
    return this.http.post<PaymentHistory>(`${this.url}/admin/spaces/${spaceId}/payments/calendar/${year}/receipts/${paymentId}/corrections`, input);
  }
  setInstallmentAmount(spaceId: number, year: number, index: number, amountBs: string, reason: string) {
    return this.http.put<PaymentHistory>(`${this.url}/admin/spaces/${spaceId}/payments/calendar/${year}/installments/${index}`, { amountBs, reason });
  }
  record(spaceId: number, payment: PaymentInput) {
    return this.http.post<PaymentHistory>(`${this.url}/admin/spaces/${spaceId}/payments`, payment);
  }
  correct(spaceId: number, paymentId: number, payment: PaymentInput & { reason: string }) {
    return this.http.post<PaymentHistory>(`${this.url}/admin/spaces/${spaceId}/payments/${paymentId}/corrections`, payment);
  }
}
