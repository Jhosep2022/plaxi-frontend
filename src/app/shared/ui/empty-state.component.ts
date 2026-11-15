import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition, faInbox } from '@fortawesome/free-solid-svg-icons';

// Shared Aulix illustration, contextual message and optional projected action.
@Component({
  selector: 'app-empty-state',
  imports: [FaIconComponent],
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 16px; text-align: center; }
    :host:has(.compact) { padding: 20px 12px; }
    .illustration { position: relative; width: 140px; margin: 0 0 4px; }
    .illustration.compact { width: 104px; }
    img { display: block; width: 100%; height: 144px; object-fit: contain; }
    .compact img { height: 108px; }
    .icono { position: absolute; bottom: 2px; right: -2px; width: 30px; height: 30px; display: grid; place-items: center; border: 3px solid white; border-radius: 50%; background: var(--light-cream); color: var(--dark-blue); font-size: 12px; }
    h3 { margin: 0; font-size: 16px; color: var(--dark-blue); }
    p { margin: 0 0 8px; max-width: 360px; font-size: 14px; color: var(--muted); }
  `,
  template: `
    <div class="illustration" [class.compact]="compact()" aria-hidden="true">
      <img [src]="kind() === 'error' ? 'assets/mascot/help.svg' : 'assets/mascot/thinking.svg'" alt="" width="140" height="144" />
      <span class="icono"><fa-icon [icon]="icono()" /></span>
    </div>
    <h3>{{ titulo() }}</h3>
    @if (texto()) {
      <p>{{ texto() }}</p>
    }
    <ng-content />
  `,
})
export class EmptyStateComponent {
  readonly compact = input(false);
  readonly kind = input<'empty' | 'error'>('empty');
  readonly titulo = input.required<string>();
  readonly texto = input<string>();
  readonly icono = input<IconDefinition>(faInbox);
}
