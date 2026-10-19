import { Component, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

// Panel lateral para formularios de crear/editar. Se cierra con la X, el fondo o Escape.
@Component({
  selector: 'app-drawer',
  imports: [FaIconComponent],
  host: { '(document:keydown.escape)': 'abierto() && cerrar.emit()' },
  styles: `
    .fondo { position: fixed; inset: 0; z-index: 1100; background: rgba(10, 10, 35, 0.35); }
    .panel {
      position: fixed; top: 0; right: 0; bottom: 0; z-index: 1101; width: min(460px, 100vw);
      display: flex; flex-direction: column; background: var(--text-light); box-shadow: -12px 0 32px rgba(10, 10, 35, 0.18);
    }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 22px 22px 16px; border-bottom: 1px solid var(--line); }
    h2 { margin: 0; font-size: 19px; color: var(--dark-blue); }
    header p { margin: 4px 0 0; font-size: 13px; color: var(--muted); }
    .cerrar { width: 34px; height: 34px; flex-shrink: 0; border: 1px solid var(--line); border-radius: 10px; background: none; color: var(--dark-blue); cursor: pointer; }
    .cuerpo { flex: 1; overflow-y: auto; padding: 20px 22px; }
    footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--line); }
    footer:empty { display: none; }
  `,
  template: `
    @if (abierto()) {
      <div class="fondo" (click)="cerrar.emit()"></div>
      <section class="panel" role="dialog" aria-modal="true" [attr.aria-label]="titulo()">
        <header>
          <div>
            <h2>{{ titulo() }}</h2>
            @if (subtitulo()) {
              <p>{{ subtitulo() }}</p>
            }
          </div>
          <button type="button" class="cerrar" (click)="cerrar.emit()" aria-label="Cerrar"><fa-icon [icon]="faXmark" /></button>
        </header>
        <div class="cuerpo"><ng-content /></div>
        <footer><ng-content select="[pie]" /></footer>
      </section>
    }
  `,
})
export class DrawerComponent {
  readonly abierto = input(false);
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>();
  readonly cerrar = output<void>();

  readonly faXmark = faXmark;
}
