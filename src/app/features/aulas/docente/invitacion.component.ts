import { Component, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faCopy, faEye, faEyeSlash, faLink, faRotateRight, faUserCheck } from '@fortawesome/free-solid-svg-icons';
import type { Aula } from '../../../core/models/aulas.model';
import { AcademiaService } from '../../../services/academia.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { mensajeError } from '../../direccion/academico/academico.ui';

// Link de invitación de un curso: copiar, ver el código y generar uno nuevo
@Component({
  selector: 'app-invitacion',
  imports: [FaIconComponent],
  styles: `
    :host { display: flex; flex-direction: column; gap: 10px; }
    .link { display: flex; gap: 8px; }
    .link .ui-input { flex: 1; font-size: 13px; background: var(--page-bg); }
    .codigo { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--muted); }
    .codigo strong { padding: 4px 10px; border-radius: 8px; background: var(--dark-blue); color: var(--lime-green); font-size: 15px; letter-spacing: 0.08em; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .regenerar { padding: 0; border: none; background: none; color: var(--lime-strong); font: inherit; font-size: 13px; font-weight: bold; cursor: pointer; }
  `,
  template: `
    <div class="link">
      <input class="ui-input" readonly [value]="url()" aria-label="Link de invitación" />
      <button type="button" class="ui-btn" (click)="copiar()"><fa-icon [icon]="copiado() ? faCheck : faCopy" /> {{ copiado() ? 'Copiado' : 'Copiar' }}</button>
    </div>
    <div class="codigo">
      <span>Código: <strong>{{ codigo() }}</strong></span>
      <button type="button" class="regenerar" (click)="regenerar()"><fa-icon [icon]="faRotateRight" /> Generar un link nuevo</button>
    </div>
    <div class="chips">
      <span class="ui-badge" [class]="aula().visibilidad === 'publico' ? 'tono-lima' : ''"><fa-icon [icon]="aula().visibilidad === 'publico' ? faEye : faEyeSlash" /> {{ aula().visibilidad === 'publico' ? 'También aparece en el catálogo' : 'Solo con este link' }}</span>
      @if (aula().aprobacionManual) { <span class="ui-badge tono-crema"><fa-icon [icon]="faUserCheck" /> Apruebas cada inscripción</span> }
    </div>
  `,
})
export class InvitacionComponent {
  private academia = inject(AcademiaService);
  private avisos = inject(AvisosService);

  readonly aula = input.required<Aula>();
  readonly cambio = output<string>();

  readonly faCheck = faCheck;
  readonly faCopy = faCopy;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faLink = faLink;
  readonly faRotateRight = faRotateRight;
  readonly faUserCheck = faUserCheck;

  private readonly nuevo = signal('');
  readonly codigo = computed(() => this.nuevo() || this.aula().codigo);
  readonly url = computed(() => `${location.origin}/unirse/${this.codigo()}`);
  readonly copiado = signal(false);

  async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url());
    } catch {
      // Sin permiso de portapapeles: el link queda seleccionable en el campo
    }
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }

  async regenerar(): Promise<void> {
    if (!confirm('¿Generar un link nuevo? El link anterior dejará de funcionar.')) return;
    try {
      const codigo = await firstValueFrom(this.academia.regenerarCodigo(this.aula().id));
      this.nuevo.set(codigo);
      this.cambio.emit(codigo);
      this.avisos.exito('Generaste un link nuevo.');
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }
}
