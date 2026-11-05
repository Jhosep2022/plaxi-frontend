import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { PASSWORD_RULES, getPasswordStrength } from '../../core/utils/password';

// Barra de fuerza de la contraseña + reglas que se van marcando
@Component({
  selector: 'app-password-strength',
  imports: [FaIconComponent],
  template: `
    <div class="fuerza" [attr.data-nivel]="strength().level">
      <div class="barras">@for (n of [1, 2, 3, 4]; track n) { <span [class.llena]="strength().level >= n"></span> }</div>
      <small>{{ strength().label || 'Escribe una contraseña para ver qué tan segura es' }}</small>
    </div>
    <ul class="reglas">
      @for (r of rules(); track r.label) {
        <li [class.ok]="r.ok"><fa-icon [icon]="r.ok ? faCheck : faXmark" /> {{ r.label }}</li>
      }
    </ul>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 10px; }
    .fuerza { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .barras { display: flex; gap: 4px; }
    .barras span { width: 42px; height: 6px; border-radius: 6px; background: var(--line); }
    .fuerza[data-nivel='1'] .llena { background: #e07a5f; }
    .fuerza[data-nivel='2'] .llena { background: #d9b48f; }
    .fuerza[data-nivel='3'] .llena, .fuerza[data-nivel='4'] .llena { background: var(--lime-green); }
    .fuerza small { color: var(--muted); }
    .reglas { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 6px; margin: 0; padding: 0; list-style: none; font-size: 13px; color: var(--muted); }
    .reglas li { display: flex; align-items: center; gap: 6px; }
    .reglas li.ok { color: var(--lime-strong); font-weight: bold; }
  `,
})
export class PasswordStrengthComponent {
  readonly password = input.required<string>();

  readonly faCheck = faCheck;
  readonly faXmark = faXmark;

  readonly strength = computed(() => getPasswordStrength(this.password()));
  readonly rules = computed(() => PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.matches(this.password()) })));
}
