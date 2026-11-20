import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPrint, faQrcode, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { paraleloLabel } from '../../../core/models/academics.model';
import { formatDateWithYear } from '../../../core/utils/attendance';
import { type AccessCard, type AccessCardSheet, PeopleService } from '../../../services/people.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { QrComponent } from '../../../shared/ui/qr.component';
import { SELECT } from '../../../shared/ui/select.component';
import { getErrorMessage } from '../academics/academics.ui';

const ESTADOS: Record<Exclude<AccessCard['estado'], 'pendiente'>, string> = {
  activa: 'ya activó su cuenta',
  sin_carnet: 'no tiene carnet registrado: complétalo en su ficha para darle tarjeta',
  sin_cuenta: 'no tiene cuenta todavía',
};

// Access cards of a class group: one per student and one per parent, with a QR that opens Aulix
// already identified. The direction prints them and the teacher hands them out in class.
@Component({
  selector: 'app-access-cards',
  imports: [FaIconComponent, PageHeaderComponent, QrComponent, ...SELECT],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="no-imprimir">
      <app-page-header miga="Personas" titulo="Tarjetas de acceso" descripcion="Una tarjeta con QR por estudiante y por padre o madre. Al escanearla entran a Aulix sin escribir su usuario; el padre confirma con su carnet." />

      <section class="ui-card tarjetas-elegir">
        <div class="ui-campo">
          <label for="tarjetas-paralelo">Paralelo</label>
          <app-select inputId="tarjetas-paralelo" placeholder="Elige el paralelo" [(value)]="paraleloId">
            @for (p of paralelos.value() ?? []; track p.id) {
              <app-option [value]="p.id" [label]="label(p)" />
            }
          </app-select>
        </div>
        <button type="button" class="ui-btn" [disabled]="!paraleloId() || generando()" (click)="generar()">
          <fa-icon [icon]="faQrcode" /> {{ generando() ? 'Generando…' : 'Generar tarjetas' }}
        </button>
        <p class="ui-ayuda">
          <fa-icon [icon]="faTriangleExclamation" /> Generar de nuevo anula las tarjetas anteriores de ese paralelo que no se usaron. Los QR solo se ven ahora: imprímelos antes de salir de esta pantalla.
        </p>
      </section>

      @if (hoja(); as h) {
        <section class="ui-card tarjetas-resumen">
          <div>
            <strong>{{ h.paralelo }}</strong> · {{ conQr().length }} tarjetas · vencen el {{ formatDateWithYear(h.venceEl) }}
          </div>
          <button type="button" class="ui-btn" [disabled]="!conQr().length" (click)="imprimir()"><fa-icon [icon]="faPrint" /> Imprimir</button>
        </section>
        @if (sinQr().length) {
          <section class="ui-card">
            <p class="ui-etiqueta">Sin tarjeta</p>
            <ul class="tarjetas-sin">
              @for (t of sinQr(); track t.rol + t.personaId) {
                <li><strong>{{ t.nombre }}</strong> ({{ t.rol === 'padre' ? 'padre o madre' : 'estudiante' }}): {{ estado(t) }}</li>
              }
            </ul>
          </section>
        }
      }
    </div>

    @if (hoja(); as h) {
      <div class="hoja-tarjetas">
        @for (t of conQr(); track t.rol + t.personaId) {
          <article class="tarjeta-acceso">
            <header>
              <span class="tarjeta-colegio">{{ colegio() }}</span>
              <span class="tarjeta-rol">{{ t.rol === 'padre' ? 'Padre, madre o tutor' : 'Estudiante · ' + h.paralelo }}</span>
            </header>
            <div class="tarjeta-cuerpo">
              <app-qr class="tarjeta-qr" [texto]="t.enlace!" [etiqueta]="'QR de acceso de ' + t.nombre" />
              <div class="tarjeta-datos">
                <strong>{{ t.nombre }}</strong>
                <small>Usuario: {{ t.usuario }}</small>
                @if (t.hijos?.length) {
                  <small>Hijos: {{ hijos(t) }}</small>
                }
              </div>
            </div>
            <ol class="tarjeta-pasos">
              <li>Escanea el QR con la cámara del celular.</li>
              @if (t.rol === 'padre') { <li>Escribe tu carnet de identidad.</li> }
              <li>Crea tu contraseña y entra.</li>
            </ol>
            <footer>Sirve una sola vez · vence el {{ formatDateWithYear(h.venceEl) }}</footer>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .tarjetas-elegir { display: grid; grid-template-columns: minmax(200px, 320px) auto; gap: 12px 16px; align-items: end; margin-bottom: 16px; }
    .tarjetas-elegir .ui-ayuda { grid-column: 1 / -1; margin: 0; }
    .tarjetas-resumen { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .tarjetas-sin { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 4px; }
    .hoja-tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; margin-top: 16px; }
    .tarjeta-acceso { display: grid; gap: 10px; padding: 14px; border: 1.5px dashed #c9c3b8; border-radius: 14px; background: #fff; color: #0a0a23; break-inside: avoid; page-break-inside: avoid; }
    .tarjeta-acceso header { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
    .tarjeta-colegio { font-weight: 700; }
    .tarjeta-rol { color: #4c4c63; text-align: right; }
    .tarjeta-cuerpo { display: grid; grid-template-columns: 112px 1fr; gap: 12px; align-items: center; }
    .tarjeta-qr { width: 112px; }
    .tarjeta-datos { display: grid; gap: 4px; }
    .tarjeta-datos strong { font-size: 16px; }
    .tarjeta-datos small { color: #4c4c63; font-size: 12px; }
    .tarjeta-pasos { margin: 0; padding-left: 18px; font-size: 12px; display: grid; gap: 2px; }
    .tarjeta-acceso footer { font-size: 11px; color: #6c6c85; }
    @media (max-width: 560px) { .tarjetas-elegir { grid-template-columns: 1fr; } }
    @media print {
      body * { visibility: hidden; }
      .hoja-tarjetas, .hoja-tarjetas * { visibility: visible; }
      .hoja-tarjetas { position: absolute; inset: 0 auto auto 0; width: 100%; margin: 0; grid-template-columns: repeat(2, 1fr); gap: 8mm; }
    }
  `,
})
export class AccessCardsComponent {
  private personas = inject(PeopleService);
  private session = inject(SessionService);
  private avisos = inject(NotificationService);

  readonly faPrint = faPrint;
  readonly faQrcode = faQrcode;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly formatDateWithYear = formatDateWithYear;
  readonly label = paraleloLabel;

  readonly paralelos = rxResource({ stream: () => this.personas.classGroups() });
  readonly paraleloId = signal('');
  readonly generando = signal(false);
  readonly hoja = signal<AccessCardSheet | null>(null);

  readonly colegio = computed(() => this.session.activeSpace()?.nombre ?? '');
  readonly conQr = computed(() => (this.hoja()?.tarjetas ?? []).filter((t) => t.estado === 'pendiente' && t.enlace));
  readonly sinQr = computed(() => (this.hoja()?.tarjetas ?? []).filter((t) => t.estado !== 'pendiente'));

  async generar(): Promise<void> {
    const id = Number(this.paraleloId());
    if (!id) return;
    this.generando.set(true);
    try {
      const hoja = await firstValueFrom(this.personas.accessCards(id));
      this.hoja.set(hoja);
      if (!this.conQr().length) this.avisos.success('Nadie de este paralelo necesita tarjeta: ya activaron su cuenta o les falta un dato.');
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    } finally {
      this.generando.set(false);
    }
  }

  estado(t: AccessCard): string {
    return t.estado === 'pendiente' ? '' : ESTADOS[t.estado];
  }

  hijos(t: AccessCard): string {
    return (t.hijos ?? []).map((h) => (h.paralelo ? `${h.nombre} (${h.paralelo})` : h.nombre)).join(', ');
  }

  imprimir(): void {
    window.print();
  }
}
