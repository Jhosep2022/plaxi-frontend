import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBookOpen, faCheck, faClock, faLayerGroup, faLinkSlash, faUserCheck, faUsers } from '@fortawesome/free-solid-svg-icons';
import { SessionService, recordarVolverA } from '../../core/auth/session.service';
import { AcademiaService } from '../../services/academia.service';
import { PortadaAulaComponent } from '../../shared/aulas/portada-aula.component';
import { mensajeError } from '../direccion/academico/academico.ui';

// Página pública del link de invitación: vista previa del curso y botón para unirse (o solicitar inscripción)
@Component({
  selector: 'app-unirse',
  imports: [FaIconComponent, RouterLink, PortadaAulaComponent],
  styles: `
    :host { display: grid; place-items: center; min-height: 100vh; padding: 24px; box-sizing: border-box; background: var(--page-bg); }
    .tarjeta { width: min(560px, 100%); display: flex; flex-direction: column; gap: 16px; padding: 18px; border-radius: 22px; background: var(--text-light); box-shadow: 0 20px 50px rgba(10, 10, 35, 0.1); }
    .marca { display: flex; align-items: center; gap: 8px; font-weight: bold; color: var(--dark-blue); }
    .marca img { height: 28px; }
    .invitado { margin: 0; font-size: 13px; color: var(--muted); }
    h1 { margin: 0; font-size: 26px; color: var(--dark-blue); }
    .descripcion { margin: 0; color: var(--muted); line-height: 1.5; }
    .datos { display: flex; gap: 8px; flex-wrap: wrap; }
    .accion { display: flex; flex-direction: column; gap: 10px; padding-top: 6px; }
    .accion .ui-btn { height: 48px; justify-content: center; font-size: 16px; text-decoration: none; }
    .enlace-sesion { padding: 0; border: none; background: none; color: var(--lime-strong); font: inherit; font-weight: bold; cursor: pointer; text-decoration: underline; }
    .aviso { display: flex; align-items: center; gap: 10px; padding: 14px; border-radius: 14px; background: var(--lime-soft); color: var(--dark-blue); font-weight: bold; }
    .aviso.pendiente { background: var(--cream-soft); color: var(--cream-strong); }
    .invalido { text-align: center; align-items: center; padding: 32px; }
    .invalido .icono { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 18px; background: var(--light-cream); color: var(--cream-strong); font-size: 26px; }
    .cargando { color: var(--muted); }
  `,
  template: `
    @if (curso.isLoading() && !curso.value()) {
      <p class="cargando">Cargando invitación…</p>
    } @else if (curso.value(); as c) {
      <article class="tarjeta">
        <span class="marca">QuizWiz · {{ c.espacio.nombre }}</span>
        <app-portada-aula [imagen]="c.aula.portada" [icono]="c.aula.icono" [tono]="c.aula.tono" />
        <p class="invitado">{{ c.docente }} te invitó a su curso</p>
        <h1>{{ c.aula.nombre }}</h1>
        @if (c.aula.descripcion) { <p class="descripcion">{{ c.aula.descripcion }}</p> }
        <div class="datos">
          @if (c.aula.categoria) { <span class="ui-badge tono-lima">{{ c.aula.categoria }}</span> }
          @if (c.aula.nivel) { <span class="ui-badge">{{ c.aula.nivel }}</span> }
          <span class="ui-badge"><fa-icon [icon]="faLayerGroup" /> {{ c.unidades }} unidades · {{ c.temas }} temas</span>
          <span class="ui-badge"><fa-icon [icon]="faUsers" /> {{ c.estudiantes }} estudiantes</span>
        </div>

        <div class="accion">
          @if (estado() === 'ACTIVA') {
            <div class="aviso"><fa-icon [icon]="faCheck" /> Ya estás inscrito en este curso.</div>
            <button type="button" class="ui-btn" (click)="irAlCurso()"><fa-icon [icon]="faBookOpen" /> Ir al curso</button>
          } @else if (estado() === 'PENDIENTE') {
            <div class="aviso pendiente"><fa-icon [icon]="faClock" /> Tu solicitud está pendiente. {{ c.docente }} la revisará pronto.</div>
            <a class="ui-btn ui-btn--secundario" routerLink="/espacios">Ir a mis espacios</a>
          } @else if (!session.autenticado()) {
            <a class="ui-btn" routerLink="/auth/registro" [queryParams]="{ codigo: codigo() }">Crear cuenta y unirme</a>
            <span class="ui-ayuda">¿Ya tienes cuenta? <button type="button" class="enlace-sesion" (click)="iniciarSesion()">Inicia sesión para unirte</button></span>
          } @else {
            <button type="button" class="ui-btn" [disabled]="uniendo()" (click)="unirse()">
              <fa-icon [icon]="c.aula.aprobacionManual ? faUserCheck : faCheck" /> {{ uniendo() ? 'Un momento…' : c.aula.aprobacionManual ? 'Solicitar inscripción' : 'Unirme al curso' }}
            </button>
            @if (c.aula.aprobacionManual) { <span class="ui-ayuda">El docente aprueba cada inscripción.</span> }
          }
          @if (error()) { <span class="ui-error">{{ error() }}</span> }
        </div>
      </article>
    } @else {
      <article class="tarjeta invalido">
        <span class="icono"><fa-icon [icon]="faLinkSlash" /></span>
        <h1>Este link ya no es válido</h1>
        <p class="descripcion">Puede que el docente haya generado uno nuevo. Pídele el link actualizado.</p>
        <a class="ui-btn ui-btn--secundario" routerLink="/">Ir al inicio</a>
      </article>
    }
  `,
})
export class UnirseComponent {
  readonly session = inject(SessionService);
  private router = inject(Router);
  private academia = inject(AcademiaService);

  readonly codigo = input.required<string>();

  readonly faBookOpen = faBookOpen;
  readonly faCheck = faCheck;
  readonly faClock = faClock;
  readonly faLayerGroup = faLayerGroup;
  readonly faLinkSlash = faLinkSlash;
  readonly faUserCheck = faUserCheck;
  readonly faUsers = faUsers;

  readonly curso = rxResource({ params: () => this.codigo(), stream: ({ params }) => this.academia.cursoPorCodigo(params, this.session.usuarioId()) });
  private readonly nuevoEstado = signal<string | null>(null);
  readonly estado = computed(() => this.nuevoEstado() ?? this.curso.value()?.estado ?? 'ninguna');
  readonly uniendo = signal(false);
  readonly error = signal('');

  iniciarSesion(): void {
    recordarVolverA(`/unirse/${this.codigo()}`);
    this.router.navigate(['/auth/login']);
  }

  async unirse(): Promise<void> {
    const c = this.curso.value();
    const usuarioId = this.session.usuarioId();
    if (!c || !usuarioId) return;
    this.uniendo.set(true);
    this.error.set('');
    try {
      const estado = await firstValueFrom(this.academia.inscribirse(c.aula.id, usuarioId));
      await firstValueFrom(this.session.iniciarSesion(usuarioId)); // suma el espacio de la academia a sus espacios
      this.nuevoEstado.set(estado);
      if (estado === 'ACTIVA') this.irAlCurso();
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.uniendo.set(false);
    }
  }

  irAlCurso(): void {
    const c = this.curso.value();
    if (c) this.router.navigate(['/', c.espacio.slug, 'estudiante', 'aulas', c.aula.id]);
  }
}
