import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faClock, faStar, faXmark } from '@fortawesome/free-solid-svg-icons';
import { EstadoDia, ResumenPerfil } from './dashboard.models';

const ESTADO_LABEL: Record<EstadoDia, string> = {
  ok: 'A tiempo',
  atraso: 'Con atraso',
  falta: 'Falta',
  hoy: 'Hoy',
  pendiente: 'Pendiente',
};

// Perfil del usuario con su semana (marcaciones, racha de estudio…)
@Component({
  selector: 'app-profile-card',
  imports: [FaIconComponent],
  styles: `
    :host { display: flex; flex-direction: column; gap: 14px; }
    .persona { display: flex; align-items: center; gap: 12px; }
    .anillo {
      width: 54px; height: 54px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%;
      background: conic-gradient(var(--lime-green) 0 75%, var(--line) 75% 100%);
    }
    .foto {
      width: 46px; height: 46px; display: grid; place-items: center; border-radius: 50%; overflow: hidden;
      border: 2px solid var(--text-light); background: var(--light-cream); color: var(--dark-blue); font-weight: bold;
    }
    .foto img { width: 100%; height: 100%; object-fit: cover; }
    .datos { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .datos strong { font-size: 17px; color: var(--dark-blue); }
    .datos small { color: var(--muted); }
    .insignia {
      display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px;
      background: var(--light-cream); color: var(--cream-strong); font-size: 12px; font-weight: bold; white-space: nowrap;
    }
    .semana { padding: 14px; border: 1px solid var(--line); border-radius: 12px; }
    .resumen { margin: 0 0 12px; color: var(--muted); font-size: 13px; }
    .resumen strong { font-size: 26px; color: var(--dark-blue); margin-right: 4px; }
    .dias { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 6px; text-align: center; }
    .dia {
      width: 32px; height: 32px; margin: 0 auto 8px; display: grid; place-items: center; border-radius: 50%;
      background: var(--page-bg); color: var(--muted); font-size: 12px;
    }
    .dia.hoy { background: var(--dark-blue); color: var(--lime-green); font-weight: bold; }
    .dia.pendiente { background: none; border: 1px dashed var(--line); }
    .estado { font-size: 13px; }
    .estado.ok { color: var(--lime-strong); }
    .estado.atraso { color: var(--cream-strong); }
    .estado.falta { color: #c0392b; }
    .estado.hoy, .estado.pendiente { color: var(--line); }
  `,
  template: `
    <div class="persona">
      <span class="anillo">
        <span class="foto">
          @if (data().imagenUrl; as url) {
            <img [src]="url" alt="" />
          } @else {
            {{ iniciales() }}
          }
        </span>
      </span>
      <span class="datos">
        <strong>{{ data().nombre }}</strong>
        <small>{{ data().organizacion }}</small>
      </span>
      <span class="insignia"><fa-icon [icon]="faStar" /> {{ data().insignia }}</span>
    </div>

    <div class="semana">
      <p class="resumen"><strong>{{ data().semana.valor }}</strong>{{ data().semana.texto }}</p>
      <div class="dias" [style.--n]="data().semana.dias.length">
        @for (dia of data().semana.dias; track dia.etiqueta) {
          <div [title]="estadoLabel[dia.estado]">
            <span class="dia" [class]="dia.estado">{{ dia.etiqueta }}</span>
            <span class="estado" [class]="dia.estado">
              @switch (dia.estado) {
                @case ('ok') { <fa-icon [icon]="faCheck" /> }
                @case ('atraso') { <fa-icon [icon]="faClock" /> }
                @case ('falta') { <fa-icon [icon]="faXmark" /> }
                @default { ○ }
              }
            </span>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProfileCardComponent {
  readonly data = input.required<ResumenPerfil>();

  readonly iniciales = computed(() =>
    this.data().nombre.split(' ').map((p) => p.charAt(0)).join('').slice(0, 2).toUpperCase()
  );

  readonly estadoLabel = ESTADO_LABEL;
  readonly faStar = faStar;
  readonly faCheck = faCheck;
  readonly faClock = faClock;
  readonly faXmark = faXmark;
}
