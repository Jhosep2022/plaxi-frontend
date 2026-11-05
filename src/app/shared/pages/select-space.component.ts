import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRight, faChalkboardTeacher, faKey, faSchool, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { createSlug } from '../../core/models/auth.model';
import { SPACE_ROLE_LABEL, SPACE_TYPE_LABEL } from '../../core/models/space.model';
import { AuthService } from '../../services/auth.service';
import { getErrorMessage } from '../../features/management/academics/academics.ui';

// Choose a space after login, or join a course or create an academy.
@Component({
  selector: 'app-select-space',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div class="pagina">
      <header class="barra">
        <img src="assets/Logo_icon.png" alt="QuizWiz" class="logo" />
        <button type="button" class="ui-btn ui-btn--secundario" (click)="session.signOut()"><fa-icon [icon]="faSignOutAlt" /> Cerrar sesión</button>
      </header>

      <main class="contenido">
        @if (session.memberships().length) {
          <h1>¿Dónde quieres trabajar hoy?</h1>
          <p class="sub">Perteneces a {{ session.memberships().length }} espacios. Elige uno para continuar; puedes cambiar desde el menú cuando quieras.</p>
          <ul class="espacios">
            @for (m of session.memberships(); track m.espacio.id) {
              <li>
                <a class="ui-card espacio" [routerLink]="session.homeRoute(m)">
                  <span class="logo-espacio" [class.academia]="m.espacio.tipo === 'academia'"><fa-icon [icon]="m.espacio.tipo === 'colegio' ? faSchool : faChalkboardTeacher" /></span>
                  <span class="texto">
                    <strong>{{ m.espacio.nombre }}</strong>
                    <small>{{ spaceTypeLabel[m.espacio.tipo] }}</small>
                    <span class="ui-badge tono-azul">{{ roleLabel[m.rol] }}</span>
                  </span>
                  <fa-icon [icon]="faArrowRight" class="flecha" />
                </a>
              </li>
            }
          </ul>
        } @else {
          <h1>¡Bienvenido a QuizWiz!</h1>
          <p class="sub">Todavía no perteneces a ningún curso ni academia. ¿Qué quieres hacer?</p>
          <div class="opciones">
            <section class="ui-card opcion">
              <span class="ui-icono tono-lima"><fa-icon [icon]="faKey" /></span>
              <h2>Unirme a un curso</h2>
              <p>Escribe el código que te compartió tu docente.</p>
              <form (submit)="$event.preventDefault(); joinCourse()" novalidate>
                <input id="esp-codigo" class="ui-input codigo" placeholder="ANG-7K2Q" maxlength="8" aria-label="Código del curso" [value]="courseCode()" (input)="courseCode.set($any($event.target).value); error.set('')" />
                <button type="submit" class="ui-btn" [disabled]="!courseCode().trim()">Buscar</button>
              </form>
              @if (error()) { <span class="ui-error">{{ error() }}</span> }
            </section>
            <section class="ui-card opcion">
              <span class="ui-icono tono-crema"><fa-icon [icon]="faChalkboardTeacher" /></span>
              <h2>Crear mi academia</h2>
              <p>¿Eres docente? Crea tu academia para subir tus cursos e invitar a tus estudiantes.</p>
              <form (submit)="$event.preventDefault(); createAcademy()" novalidate>
                <input id="esp-academia" class="ui-input" placeholder="Ej. Academia de Ana López" aria-label="Nombre de la academia" [value]="academyName()" (input)="academyName.set($any($event.target).value); academyError.set('')" />
                <button type="submit" class="ui-btn" [disabled]="!academyName().trim() || isCreating()">{{ isCreating() ? 'Creando…' : 'Crear' }}</button>
              </form>
              @if (academyName().trim()) { <span class="ui-ayuda">Dirección web: quizwiz.app/{{ slug() }}</span> }
              @if (academyError()) { <span class="ui-error">{{ academyError() }}</span> }
            </section>
          </div>
        }
      </main>
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--page-bg); }
    .pagina { max-width: 880px; margin: 0 auto; padding: 20px 16px 48px; }
    .barra { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; }
    .logo { height: 40px; }
    h1 { margin: 0 0 8px; font-size: 30px; text-align: center; }
    .sub { margin: 0 auto 28px; max-width: 520px; color: var(--muted); text-align: center; line-height: 1.5; }
    .espacios { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
    .espacio { display: flex; align-items: center; gap: 16px; border: 2px solid transparent; color: var(--dark-blue); text-decoration: none; transition: border-color 0.15s, transform 0.15s; }
    .espacio:hover { border-color: var(--lime-green); transform: translateY(-2px); }
    .logo-espacio { width: 56px; height: 56px; display: grid; place-items: center; flex-shrink: 0; border-radius: 16px; background: var(--dark-blue); color: var(--lime-green); font-size: 22px; }
    .logo-espacio.academia { background: var(--light-cream); color: var(--dark-blue); }
    .texto { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; flex: 1; min-width: 0; }
    .texto strong { font-size: 17px; }
    .texto small { color: var(--muted); }
    .flecha { color: var(--muted); }
    .opciones { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    .opcion { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
    .opcion .ui-icono { width: 46px; height: 46px; font-size: 20px; }
    .opcion h2 { margin: 0; font-size: 18px; }
    .opcion p { margin: 0; color: var(--muted); }
    .opcion form { display: flex; gap: 8px; width: 100%; }
    .opcion form .ui-input { flex: 1; min-width: 0; }
    .codigo { text-transform: uppercase; letter-spacing: 0.12em; font-weight: bold; }
  `,
})
export class SelectSpaceComponent {
  protected readonly session = inject(SessionService);
  private router = inject(Router);
  private auth = inject(AuthService);

  readonly roleLabel = SPACE_ROLE_LABEL;
  readonly spaceTypeLabel = SPACE_TYPE_LABEL;
  readonly faArrowRight = faArrowRight;
  readonly faChalkboardTeacher = faChalkboardTeacher;
  readonly faKey = faKey;
  readonly faSchool = faSchool;
  readonly faSignOutAlt = faSignOutAlt;

  readonly courseCode = signal('');
  readonly error = signal('');
  readonly normalizedCode = computed(() => this.courseCode().trim().toUpperCase());

  // Academy creation
  readonly academyName = signal('');
  readonly slug = computed(() => createSlug(this.academyName()));
  readonly isCreating = signal(false);
  readonly academyError = signal('');

  async createAcademy(): Promise<void> {
    this.isCreating.set(true);
    try {
      const userId = this.session.userId()!;
      const { slug } = await firstValueFrom(this.auth.createAcademy(userId, this.academyName(), this.slug()));
      await firstValueFrom(this.session.startSession(userId));
      this.router.navigate(['/', slug, 'docente', 'inicio']);
    } catch (e) {
      this.academyError.set(getErrorMessage(e));
      this.isCreating.set(false);
    }
  }

  joinCourse(): void {
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{4}$/.test(this.normalizedCode())) return this.error.set('El código tiene el formato ABC-1234.');
    this.router.navigate(['/unirse', this.normalizedCode()]);
  }
}
