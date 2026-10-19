import { Component, computed, input } from '@angular/core';

const TONOS = ['var(--lime-green)', 'var(--light-cream)', 'var(--blue-soft)'];

// Avatares superpuestos con iniciales y "+N" para el resto
@Component({
  selector: 'app-avatar-stack',
  styles: `
    :host { display: inline-flex; align-items: center; }
    .avatar {
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
      margin-left: -8px;
      border: 2px solid var(--text-light);
      border-radius: 50%;
      color: var(--dark-blue);
      font-size: 11px;
      font-weight: bold;
    }
    .avatar:first-child { margin-left: 0; }
    .mas { margin-left: 6px; font-size: 12px; color: var(--muted); }
  `,
  template: `
    @for (persona of visibles(); track $index) {
      <span class="avatar" [style.background]="persona.color" [title]="persona.nombre">{{ persona.iniciales }}</span>
    }
    @if (resto() > 0) {
      <span class="mas">+{{ resto() }}</span>
    }
  `,
})
export class AvatarStackComponent {
  readonly nombres = input.required<string[]>();
  readonly total = input<number>();
  readonly max = input(3);

  readonly visibles = computed(() =>
    this.nombres()
      .slice(0, this.max())
      .map((nombre, i) => ({
        nombre,
        iniciales: nombre.split(' ').map((p) => p.charAt(0)).join('').slice(0, 2).toUpperCase(),
        color: TONOS[i % TONOS.length],
      }))
  );

  readonly resto = computed(() => (this.total() ?? this.nombres().length) - this.visibles().length);
}
