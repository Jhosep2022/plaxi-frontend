import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlugCircleXmark, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { ConnectivityService } from '../../core/api/connectivity.service';

// Band on top of every screen while there is no connection. It never covers the form: what was written stays.
@Component({
  selector: 'app-connection-banner',
  imports: [FaIconComponent],
  styles: `
    .banda {
      position: fixed; z-index: 2000; top: 12px; left: 50%; transform: translateX(-50%);
      display: flex; align-items: center; gap: 12px; width: min(640px, calc(100vw - 24px)); box-sizing: border-box;
      padding: 12px 14px; border-radius: 14px; background: var(--dark-blue); color: #fff;
      box-shadow: 0 12px 30px rgba(10, 10, 35, 0.25); font-size: 14px; line-height: 1.4;
    }
    .icono { flex-shrink: 0; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: var(--lime-green); color: var(--dark-blue); }
    .texto { flex: 1; min-width: 0; }
    .texto strong { display: block; }
    .texto span { opacity: 0.8; font-size: 13px; }
    button {
      flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px;
      border: 0; border-radius: 9px; background: var(--lime-green); color: var(--dark-blue); font: inherit; font-weight: 700; cursor: pointer;
    }
    button:disabled { opacity: 0.6; cursor: wait; }
  `,
  template: `
    @if (connectivity.problem(); as problem) {
      <div class="banda" role="status" aria-live="polite">
        <span class="icono" aria-hidden="true"><fa-icon [icon]="faPlugCircleXmark" /></span>
        <span class="texto">
          <strong>{{ problem === 'sin_internet' ? 'Sin conexión a internet' : 'No pudimos conectar con Aulix' }}</strong>
          <span>Lo que escribiste se conserva. {{ problem === 'sin_internet' ? 'Cuando vuelva la conexión, intenta de nuevo.' : 'Puede ser la señal; vuelve a intentarlo.' }}</span>
        </span>
        @if (problem === 'sin_respuesta') {
          <button type="button" [disabled]="connectivity.checking()" (click)="connectivity.check()">
            <fa-icon [icon]="faRotateRight" /> {{ connectivity.checking() ? 'Probando…' : 'Reintentar' }}
          </button>
        }
      </div>
    }
  `,
})
export class ConnectionBannerComponent {
  protected readonly connectivity = inject(ConnectivityService);
  protected readonly faPlugCircleXmark = faPlugCircleXmark;
  protected readonly faRotateRight = faRotateRight;
}
