import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconoMateria } from '../../core/models/academico.model';
import { Tono } from '../dashboard/dashboard.models';
import { iconoMateria } from '../ui/iconos-academicos';

// Colores de la ilustración por tono (paleta QuizWiz)
const FONDOS: Record<Tono, { fondo: string; forma: string; acento: string; icono: string }> = {
  lima: { fondo: 'var(--lime-soft)', forma: 'var(--lime-green)', acento: 'var(--dark-blue)', icono: 'var(--dark-blue)' },
  azul: { fondo: 'var(--blue-soft)', forma: 'var(--dark-blue)', acento: 'var(--lime-green)', icono: 'var(--lime-green)' },
  crema: { fondo: 'var(--light-cream)', forma: '#d9b48f', acento: 'var(--lime-green)', icono: 'var(--dark-blue)' },
};

// Portada de un aula: la imagen que subió el docente o, por defecto, una ilustración con el ícono y el color de la materia
@Component({
  selector: 'app-portada-aula',
  imports: [FaIconComponent],
  styles: `
    :host { display: block; position: relative; overflow: hidden; border-radius: 12px; aspect-ratio: 16 / 7; }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .ilustracion { position: absolute; inset: 0; }
    svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .icono {
      position: absolute; right: 12%; top: 50%; transform: translateY(-50%) rotate(-8deg);
      width: 30%; aspect-ratio: 1; display: grid; place-items: center; border-radius: 22%;
      background: var(--text-light); box-shadow: 0 10px 24px rgba(10, 10, 35, 0.15); font-size: clamp(22px, 3vw, 40px);
    }
    .icono.chico { font-size: 22px; }
  `,
  template: `
    @if (imagen()) {
      <img [src]="imagen()" alt="" />
    } @else {
      <div class="ilustracion" [style.background]="colores().fondo">
        <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <circle cx="40" cy="120" r="70" [attr.fill]="colores().forma" opacity="0.35" />
          <rect x="70" y="18" width="120" height="78" rx="12" [attr.fill]="colores().forma" opacity="0.22" transform="rotate(-6 130 57)" />
          <rect x="88" y="34" width="70" height="8" rx="4" [attr.fill]="colores().acento" opacity="0.8" />
          <rect x="88" y="50" width="96" height="6" rx="3" [attr.fill]="colores().acento" opacity="0.35" />
          <rect x="88" y="62" width="84" height="6" rx="3" [attr.fill]="colores().acento" opacity="0.35" />
          <circle cx="292" cy="22" r="10" [attr.fill]="colores().acento" opacity="0.7" />
          <path d="M20 26 l8 -8 l8 8 l-8 8 z" [attr.fill]="colores().acento" opacity="0.6" />
          <circle cx="250" cy="122" r="6" [attr.fill]="colores().forma" opacity="0.6" />
        </svg>
        <span class="icono" [style.color]="colores().icono === 'var(--lime-green)' ? 'var(--dark-blue)' : colores().icono">
          <fa-icon [icon]="iconoMateria(icono())" />
        </span>
      </div>
    }
    <ng-content />
  `,
})
export class PortadaAulaComponent {
  readonly imagen = input('');
  readonly icono = input<IconoMateria>('libro');
  readonly tono = input<Tono>('lima');

  readonly iconoMateria = iconoMateria;
  readonly colores = computed(() => FONDOS[this.tono()] ?? FONDOS.lima);
}
