import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPen, faPlus, faUserShield } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { environment } from '../../../../environments/environment';
import { iniciales } from '../../../core/models/people.model';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { NotificationService } from '../../../shared/ui/notification.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { getErrorMessage } from '../academics/academics.ui';

interface Secretaria {
  id: number;
  nombre: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  ci: string;
  correo: string;
  telefono: string;
  activa: boolean;
  usuario: string | null;
  cuentaActivada: boolean;
}

const VACIA = { nombres: '', primerApellido: '', segundoApellido: '', ci: '', correo: '', telefono: '' };

// Secretaría del colegio: la crea y la desactiva la dirección. Opera como la dirección, salvo cierres,
// escala, marcación del personal, institución, continuidad y pagos (cerebro: Roles y permisos).
@Component({
  selector: 'app-secretaries',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, DrawerComponent, EmptyStateComponent],
  styleUrls: ['./people.css'],
  template: `
    <app-page-header miga="Personas" titulo="Secretaría"
      descripcion="Inscribe y edita personas, arma horarios, registra licencias, envía comunicados y ve los reportes. No cierra periodos, no cambia la escala ni ve la marcación del personal ni los pagos.">
      <button type="button" class="ui-btn" (click)="nueva()"><fa-icon [icon]="faPlus" /> Nueva secretaría</button>
    </app-page-header>

    @if (lista.isLoading() && !lista.hasValue()) {
      <p class="cargando">Cargando…</p>
    } @else if (!lista.value()?.length) {
      <div class="ui-card"><app-empty-state titulo="Todavía no hay secretaría" texto="Crea su cuenta: recibe una invitación por correo o activa su acceso con su carnet." /></div>
    } @else {
      <div class="ui-card ui-tabla-contenedor">
        <table class="ui-tabla">
          <thead><tr><th>Nombre</th><th>CI</th><th>Cuenta</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (s of lista.value(); track s.id) {
              <tr>
                <td><strong>{{ s.nombre }}</strong>@if (s.correo) { <small class="secundario">{{ s.correo }}</small> }</td>
                <td>{{ s.ci }}</td>
                <td>{{ s.usuario ?? '—' }} · {{ s.cuentaActivada ? 'activada' : 'pendiente de activar' }}</td>
                <td><span class="ui-badge" [class.tono-lima]="s.activa">{{ s.activa ? 'Con acceso' : 'Sin acceso' }}</span></td>
                <td class="acciones">
                  <button type="button" class="ui-btn ui-btn--icono" (click)="editar(s)" [attr.aria-label]="'Editar a ' + s.nombre"><fa-icon [icon]="faPen" /></button>
                  <button type="button" class="ui-btn ui-btn--secundario" [disabled]="guardando()" (click)="cambiarAcceso(s)">{{ s.activa ? 'Quitar acceso' : 'Devolver acceso' }}</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <app-drawer [abierto]="abierto()" [titulo]="editandoId() ? 'Editar secretaría' : 'Nueva secretaría'" subtitulo="Si tiene correo, recibe una invitación; si no, activa su cuenta con su usuario y carnet." (cerrar)="guardando() || abierto.set(false)">
      <form id="form-secretaria" class="ui-form" (submit)="$event.preventDefault(); guardar()" novalidate>
        <div class="ui-campo"><label for="sec-nombres">Nombres</label><input id="sec-nombres" class="ui-input" [value]="modelo().nombres" (input)="campo('nombres', $event)" /></div>
        <div class="ui-fila">
          <div class="ui-campo"><label for="sec-ap1">Primer apellido</label><input id="sec-ap1" class="ui-input" [value]="modelo().primerApellido" (input)="campo('primerApellido', $event)" /></div>
          <div class="ui-campo"><label for="sec-ap2">Segundo apellido</label><input id="sec-ap2" class="ui-input" [value]="modelo().segundoApellido" (input)="campo('segundoApellido', $event)" /></div>
        </div>
        <div class="ui-fila">
          <div class="ui-campo"><label for="sec-ci">CI</label><input id="sec-ci" class="ui-input" [value]="modelo().ci" (input)="campo('ci', $event)" /></div>
          <div class="ui-campo"><label for="sec-tel">Celular (opcional)</label><input id="sec-tel" class="ui-input" inputmode="tel" [value]="modelo().telefono" (input)="campo('telefono', $event)" /></div>
        </div>
        <div class="ui-campo"><label for="sec-correo">Correo (opcional)</label><input id="sec-correo" class="ui-input" type="email" [value]="modelo().correo" (input)="campo('correo', $event)" /></div>
        @if (error()) { <p class="ui-error" role="alert">{{ error() }}</p> }
      </form>
      <div pie><button type="submit" form="form-secretaria" class="ui-btn" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button></div>
    </app-drawer>
  `,
})
export class SecretariesComponent {
  private readonly http = inject(HttpClient);
  private readonly avisos = inject(NotificationService);
  private readonly base = `${environment.API_URL}/espacios/${inject(SessionService).activeSpace()!.slug}/secretarias`;

  readonly iniciales = iniciales;
  readonly faPen = faPen;
  readonly faPlus = faPlus;
  readonly faUserShield = faUserShield;

  readonly lista = rxResource({ stream: () => this.http.get<Secretaria[]>(this.base) });
  readonly abierto = signal(false);
  readonly editandoId = signal(0);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly modelo = signal({ ...VACIA });
  readonly editando = computed(() => this.lista.value()?.find((s) => s.id === this.editandoId()) ?? null);

  campo(nombre: keyof typeof VACIA, evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.modelo.update((m) => ({ ...m, [nombre]: valor }));
  }

  nueva(): void {
    this.abrir(0, { ...VACIA });
  }

  editar(s: Secretaria): void {
    this.abrir(s.id, { nombres: s.nombres, primerApellido: s.primerApellido, segundoApellido: s.segundoApellido, ci: s.ci, correo: s.correo ?? '', telefono: s.telefono ?? '' });
  }

  async guardar(): Promise<void> {
    const m = this.modelo();
    if (!m.nombres.trim() || !m.primerApellido.trim() || !m.ci.trim()) {
      this.error.set('Escribe los nombres, el primer apellido y el CI.');
      return;
    }
    const cuerpo = { ...m, nombres: m.nombres.trim(), primerApellido: m.primerApellido.trim(), segundoApellido: m.segundoApellido.trim(), ci: m.ci.trim(), correo: m.correo.trim() || undefined, activa: this.editando()?.activa ?? true };
    await this.enviar(this.editandoId() ? this.http.patch(`${this.base}/${this.editandoId()}`, cuerpo) : this.http.post(`${this.base}`, cuerpo), this.editandoId() ? 'Datos guardados.' : 'Secretaría creada.');
    if (!this.error()) this.abierto.set(false);
  }

  async cambiarAcceso(s: Secretaria): Promise<void> {
    if (s.activa && !confirm(`¿Quitar el acceso de ${s.nombre} al colegio? Puedes devolvérselo cuando quieras.`)) return;
    const cuerpo = { nombres: s.nombres, primerApellido: s.primerApellido, segundoApellido: s.segundoApellido, ci: s.ci, correo: s.correo || undefined, telefono: s.telefono, activa: !s.activa };
    await this.enviar(this.http.patch(`${this.base}/${s.id}`, cuerpo), s.activa ? `${s.nombre} ya no entra al colegio.` : `${s.nombre} recuperó el acceso.`);
  }

  private abrir(id: number, valores: typeof VACIA): void {
    this.editandoId.set(id);
    this.modelo.set(valores);
    this.error.set('');
    this.abierto.set(true);
  }

  private async enviar(peticion: ReturnType<HttpClient['post']>, mensaje: string): Promise<void> {
    this.guardando.set(true);
    this.error.set('');
    try {
      await firstValueFrom(peticion);
      this.avisos.success(mensaje);
      this.lista.reload();
    } catch (e) {
      this.error.set(getErrorMessage(e));
      this.avisos.error(getErrorMessage(e));
    } finally {
      this.guardando.set(false);
    }
  }
}
