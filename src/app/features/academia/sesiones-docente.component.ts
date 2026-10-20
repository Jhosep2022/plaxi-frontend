import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faCirclePlay, faCopy, faFilm, faPen, faPlus, faTrash, faUserCheck, faVideo } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { PLATAFORMAS } from '../../core/models/sesiones.model';
import type { Plataforma } from '../../core/models/sesiones.model';
import { hoyIso } from '../../core/utils/asistencia';
import { AulasService } from '../../services/aulas.service';
import { AsistenteSesion, SesionVista, SesionesService } from '../../services/sesiones.service';
import { AvisosService } from '../../shared/ui/avisos.service';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { mensajeError } from '../direccion/academico/academico.ui';
import { TarjetaSesionComponent } from './tarjeta-sesion.component';

type Pestana = 'proximas' | 'pasadas';
const VACIA = { aulaId: '', titulo: '', descripcion: '', fecha: '', inicio: '18:00', fin: '19:00', plataforma: 'meet' as Plataforma, enlace: '' };

// Sesiones en vivo del docente de academia: programar, iniciar, asistencia y grabación
@Component({
  selector: 'app-sesiones-docente',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, DrawerComponent, EmptyStateComponent, TarjetaSesionComponent],
  styleUrls: ['./sesiones.css'],
  template: `
    <app-page-header miga="Sesiones" titulo="Sesiones en vivo" descripcion="Programa tus clases por Meet o Zoom. Cuando un estudiante entra desde la app, su asistencia queda registrada.">
      <button type="button" class="ui-btn" (click)="nueva()"><fa-icon [icon]="faPlus" /> Programar sesión</button>
    </app-page-header>

    <div class="barra">
      <div class="ui-tabs" role="tablist">
        <button type="button" class="ui-tab" [class.activa]="pestana() === 'proximas'" (click)="pestana.set('proximas')">Próximas <span class="contador">{{ proximas().length }}</span></button>
        <button type="button" class="ui-tab" [class.activa]="pestana() === 'pasadas'" (click)="pestana.set('pasadas')">Pasadas <span class="contador">{{ pasadas().length }}</span></button>
      </div>
      <select class="ui-input" aria-label="Curso" (change)="curso.set(+$any($event.target).value)">
        <option value="0" [selected]="!curso()">Todos mis cursos</option>
        @for (c of cursos(); track c.id) { <option [value]="c.id" [selected]="curso() === c.id">{{ c.nombre }}</option> }
      </select>
    </div>

    @if (datos.isLoading() && !datos.value()) {
      <p class="cargando">Cargando sesiones…</p>
    } @else {
      <div class="lista">
        @for (s of visibles(); track s.id) {
          <app-tarjeta-sesion [sesion]="s" [docente]="true">
            @if (s.estado === 'en-curso') {
              <a class="ui-btn" [href]="s.enlace" target="_blank" rel="noopener"><fa-icon [icon]="faCirclePlay" /> Iniciar</a>
            }
            @if (s.estado !== 'finalizada') {
              <button type="button" class="ui-btn ui-btn--secundario" (click)="copiar(s)"><fa-icon [icon]="copiadaId() === s.id ? faCheck : faCopy" /> {{ copiadaId() === s.id ? 'Copiado' : 'Copiar enlace' }}</button>
              <button type="button" class="ui-btn ui-btn--icono" (click)="editar(s)" [attr.aria-label]="'Editar ' + s.titulo"><fa-icon [icon]="faPen" /></button>
              <button type="button" class="ui-btn ui-btn--icono" (click)="eliminar(s)" [attr.aria-label]="'Eliminar ' + s.titulo"><fa-icon [icon]="faTrash" /></button>
            }
            @if (s.estado !== 'proxima') {
              <button type="button" class="ui-btn ui-btn--secundario" (click)="verAsistencia(s)"><fa-icon [icon]="faUserCheck" /> Asistencia ({{ s.asistentes }}/{{ s.estudiantes }})</button>
            }
            @if (s.estado === 'finalizada') {
              <button type="button" class="ui-btn ui-btn--secundario" (click)="abrirGrabacion(s)"><fa-icon [icon]="faFilm" /> {{ s.grabacion ? 'Editar grabación' : 'Agregar grabación' }}</button>
            }
          </app-tarjeta-sesion>
        } @empty {
          <div class="ui-card">
            <app-empty-state [icono]="faVideo" [titulo]="pestana() === 'proximas' ? 'No tienes sesiones programadas' : 'Todavía no hubo sesiones'" texto="Programa una clase en vivo y comparte el enlace con tus estudiantes.">
              @if (pestana() === 'proximas') { <button type="button" class="ui-btn" (click)="nueva()"><fa-icon [icon]="faPlus" /> Programar sesión</button> }
            </app-empty-state>
          </div>
        }
      </div>
    }

    <!-- Programar / editar -->
    <app-drawer [abierto]="editando() !== null" [titulo]="editando() ? 'Editar sesión' : 'Programar sesión'" subtitulo="Tus estudiantes la verán en sus próximas sesiones." (cerrar)="editando.set(null)">
      <form class="ui-form" (submit)="$event.preventDefault(); guardar()" novalidate>
        <div class="ui-campo">
          <label for="ses-curso">Curso</label>
          <select id="ses-curso" class="ui-input" (change)="cambiar('aulaId', $any($event.target).value)">
            <option value="" [selected]="!modelo().aulaId">Elige un curso</option>
            @for (c of cursos(); track c.id) { <option [value]="'' + c.id" [selected]="modelo().aulaId === '' + c.id">{{ c.nombre }}</option> }
          </select>
        </div>
        <div class="ui-campo">
          <label for="ses-titulo">Tema de la sesión</label>
          <input id="ses-titulo" class="ui-input" placeholder="Ej. Formularios reactivos" [value]="modelo().titulo" (input)="cambiar('titulo', $any($event.target).value)" />
        </div>
        <div class="ui-campo">
          <label for="ses-desc">Descripción <span class="ui-ayuda">(opcional)</span></label>
          <textarea id="ses-desc" class="ui-input area" rows="2" [value]="modelo().descripcion" (input)="cambiar('descripcion', $any($event.target).value)"></textarea>
        </div>
        <div class="ui-fila tres">
          <div class="ui-campo"><label for="ses-fecha">Fecha</label><input id="ses-fecha" type="date" class="ui-input" [min]="hoy" [value]="modelo().fecha" (change)="cambiar('fecha', $any($event.target).value)" /></div>
          <div class="ui-campo"><label for="ses-inicio">Inicio</label><input id="ses-inicio" type="time" class="ui-input" [value]="modelo().inicio" (change)="cambiar('inicio', $any($event.target).value)" /></div>
          <div class="ui-campo"><label for="ses-fin">Fin</label><input id="ses-fin" type="time" class="ui-input" [value]="modelo().fin" (change)="cambiar('fin', $any($event.target).value)" /></div>
        </div>
        <div class="ui-campo">
          <label for="ses-plataforma">Plataforma</label>
          <select id="ses-plataforma" class="ui-input" (change)="cambiar('plataforma', $any($event.target).value)">
            @for (p of plataformas; track p.id) { <option [value]="p.id" [selected]="modelo().plataforma === p.id">{{ p.label }}</option> }
          </select>
        </div>
        <div class="ui-campo">
          <label for="ses-enlace">Enlace de la reunión</label>
          <input id="ses-enlace" class="ui-input" placeholder="https://meet.google.com/…" [value]="modelo().enlace" (input)="cambiar('enlace', $any($event.target).value)" />
        </div>
      </form>
      <ng-container pie>
        <button type="button" class="ui-btn ui-btn--secundario" (click)="editando.set(null)">Cancelar</button>
        <button type="button" class="ui-btn" [disabled]="guardando()" (click)="guardar()">{{ editando() ? 'Guardar cambios' : 'Programar' }}</button>
      </ng-container>
    </app-drawer>

    <!-- Asistencia -->
    <app-drawer [abierto]="!!sesionAsistencia()" titulo="Asistencia" [subtitulo]="sesionAsistencia()?.titulo ?? ''" (cerrar)="sesionAsistencia.set(null)">
      <p class="ui-ayuda">Se marcan solos al entrar desde la app. Puedes corregirlos a mano.</p>
      <ul class="asistentes">
        @for (a of asistentes.value(); track a.estudianteId) {
          <li>
            <label class="check"><input type="checkbox" [id]="'asis-' + a.estudianteId" [checked]="a.presente" (change)="marcar(a, $any($event.target).checked)" /> {{ a.nombre }}</label>
            @if (a.presente && a.unidoEl) { <small>Entró a las {{ a.unidoEl.slice(11, 16) }}</small> }
          </li>
        } @empty {
          <li class="vacio">Este curso todavía no tiene estudiantes.</li>
        }
      </ul>
    </app-drawer>

    <!-- Grabación -->
    <app-drawer [abierto]="!!sesionGrabacion()" titulo="Grabación" [subtitulo]="sesionGrabacion()?.titulo ?? ''" (cerrar)="sesionGrabacion.set(null)">
      <div class="ui-campo">
        <label for="ses-grabacion">Enlace de la grabación</label>
        <input id="ses-grabacion" class="ui-input" placeholder="https://drive.google.com/…" [value]="grabacion()" (input)="grabacion.set($any($event.target).value)" />
        <span class="ui-ayuda">Tus estudiantes podrán verla desde sus sesiones pasadas.</span>
      </div>
      <ng-container pie>
        <button type="button" class="ui-btn ui-btn--secundario" (click)="sesionGrabacion.set(null)">Cancelar</button>
        <button type="button" class="ui-btn" (click)="guardarGrabacion()">Guardar</button>
      </ng-container>
    </app-drawer>
  `,
})
export class SesionesDocenteComponent {
  private session = inject(SessionService);
  private servicio = inject(SesionesService);
  private aulas = inject(AulasService);
  private avisos = inject(AvisosService);

  readonly plataformas = PLATAFORMAS;
  readonly hoy = hoyIso();
  readonly faCheck = faCheck;
  readonly faCirclePlay = faCirclePlay;
  readonly faCopy = faCopy;
  readonly faFilm = faFilm;
  readonly faPen = faPen;
  readonly faPlus = faPlus;
  readonly faTrash = faTrash;
  readonly faUserCheck = faUserCheck;
  readonly faVideo = faVideo;

  private readonly espacioId = this.session.espacioActivo()!.id;
  private readonly docenteId = this.session.usuarioId()!;

  readonly datos = rxResource({
    stream: () => forkJoin({ sesiones: this.servicio.sesionesDocente(this.espacioId, this.docenteId), aulas: this.aulas.aulasDocente(this.espacioId, this.docenteId) }),
  });
  readonly cursos = computed(() => (this.datos.value()?.aulas ?? []).filter((a) => a.tipo === 'curso'));

  readonly pestana = signal<Pestana>('proximas');
  readonly curso = signal(0);
  private readonly delCurso = computed(() => (this.datos.value()?.sesiones ?? []).filter((s) => !this.curso() || s.aulaId === this.curso()));
  readonly proximas = computed(() => this.delCurso().filter((s) => s.estado !== 'finalizada').sort((a, b) => `${a.fecha}${a.inicio}`.localeCompare(`${b.fecha}${b.inicio}`)));
  readonly pasadas = computed(() => this.delCurso().filter((s) => s.estado === 'finalizada').sort((a, b) => `${b.fecha}${b.inicio}`.localeCompare(`${a.fecha}${a.inicio}`)));
  readonly visibles = computed(() => (this.pestana() === 'proximas' ? this.proximas() : this.pasadas()));

  // ---------- Programar / editar ----------
  readonly editando = signal<SesionVista | false | null>(null); // null = cerrado, false = nueva
  readonly modelo = signal({ ...VACIA });
  readonly guardando = signal(false);

  cambiar(campo: keyof typeof VACIA, valor: string): void {
    this.modelo.update((m) => ({ ...m, [campo]: valor }));
  }

  nueva(): void {
    this.modelo.set({ ...VACIA, aulaId: this.curso() ? String(this.curso()) : String(this.cursos()[0]?.id ?? ''), fecha: hoyIso() });
    this.editando.set(false);
  }

  editar(s: SesionVista): void {
    this.modelo.set({ aulaId: String(s.aulaId), titulo: s.titulo, descripcion: s.descripcion, fecha: s.fecha, inicio: s.inicio, fin: s.fin, plataforma: s.plataforma, enlace: s.enlace });
    this.editando.set(s);
  }

  async guardar(): Promise<void> {
    const m = this.modelo();
    if (!m.aulaId) return this.avisos.error('Elige el curso.');
    this.guardando.set(true);
    try {
      const e = this.editando();
      await firstValueFrom(this.servicio.guardar({ ...m, aulaId: Number(m.aulaId), id: e ? e.id : undefined }));
      this.avisos.exito(e ? 'Sesión actualizada.' : 'Sesión programada.');
      this.editando.set(null);
      this.pestana.set('proximas');
      this.datos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(s: SesionVista): Promise<void> {
    if (!confirm(`¿Cancelar la sesión "${s.titulo}"?`)) return;
    await firstValueFrom(this.servicio.eliminar(s.id));
    this.avisos.exito('Sesión cancelada.');
    this.datos.reload();
  }

  readonly copiadaId = signal(0);

  async copiar(s: SesionVista): Promise<void> {
    try {
      await navigator.clipboard.writeText(s.enlace);
    } catch {
      // Sin permiso de portapapeles
    }
    this.copiadaId.set(s.id);
    setTimeout(() => this.copiadaId.set(0), 2000);
  }

  // ---------- Asistencia ----------
  readonly sesionAsistencia = signal<SesionVista | null>(null);
  readonly asistentes = rxResource({
    params: () => this.sesionAsistencia(),
    stream: ({ params }) => (params ? this.servicio.asistentes(params.id) : of([])),
    defaultValue: [],
  });

  verAsistencia(s: SesionVista): void {
    this.sesionAsistencia.set(s);
  }

  async marcar(a: AsistenteSesion, presente: boolean): Promise<void> {
    const s = this.sesionAsistencia();
    if (!s) return;
    await firstValueFrom(this.servicio.marcar(s.id, a.estudianteId, presente));
    this.datos.reload();
  }

  // ---------- Grabación ----------
  readonly sesionGrabacion = signal<SesionVista | null>(null);
  readonly grabacion = signal('');

  abrirGrabacion(s: SesionVista): void {
    this.grabacion.set(s.grabacion);
    this.sesionGrabacion.set(s);
  }

  async guardarGrabacion(): Promise<void> {
    const s = this.sesionGrabacion();
    if (!s) return;
    try {
      await firstValueFrom(this.servicio.guardarGrabacion(s.id, this.grabacion()));
      this.avisos.exito(this.grabacion() ? 'Grabación guardada: tus estudiantes ya pueden verla.' : 'Quitaste la grabación.');
      this.sesionGrabacion.set(null);
      this.datos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }
}
