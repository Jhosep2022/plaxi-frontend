import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition, faInbox } from '@fortawesome/free-solid-svg-icons';

// Mensaje para listas vacías, con una acción opcional proyectada
@Component({
  selector: 'app-empty-state',
  imports: [FaIconComponent],
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 16px; text-align: center; }
    .icono { width: 56px; height: 56px; display: grid; place-items: center; margin-bottom: 6px; border-radius: 16px; background: var(--light-cream); color: var(--cream-strong); font-size: 22px; }
    h3 { margin: 0; font-size: 16px; color: var(--dark-blue); }
    p { margin: 0 0 8px; max-width: 360px; font-size: 14px; color: var(--muted); }
  `,
  template: `
    <span class="icono"><fa-icon [icon]="icono()" /></span>
    <h3>{{ titulo() }}</h3>
    @if (texto()) {
      <p>{{ texto() }}</p>
    }
    <ng-content />
  `,
})
export class EmptyStateComponent {
  readonly titulo = input.required<string>();
  readonly texto = input<string>();
  readonly icono = input<IconDefinition>(faInbox);
}
