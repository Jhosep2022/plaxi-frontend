import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBookOpen, faCheck, faClock, faCompass, faLayerGroup, faMagnifyingGlass, faUserCheck, faUsers } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { AcademiaService, CursoPublico } from '../../../services/academia.service';
import { PortadaAulaComponent } from '../../../shared/aulas/portada-aula.component';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../../direccion/academico/academico.ui';

// Catálogo de la academia: cursos públicos con filtro por categoría e inscripción (directa o con aprobación)
@Component({
  selector: 'app-catalogo',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, PageHeaderComponent, EmptyStateComponent, PortadaAulaComponent],
  styles: `
    .barra { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
    .buscar { position: relative; min-width: 220px; flex: 1; max-width: 320px; }
    .buscar fa-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 13px; }
    .buscar .ui-input { width: 100%; padding-left: 34px; }
    .categorias { display: flex; gap: 6px; flex-wrap: wrap; }
    .categoria { padding: 7px 14px; border: 1px solid var(--line); border-radius: 20px; background: var(--text-light); color: var(--dark-blue); font: inherit; font-size: 13px; cursor: pointer; }
    .categoria.activa { border-color: var(--dark-blue); background: var(--dark-blue); color: var(--text-light); font-weight: bold; }
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }
    .curso { display: flex; flex-direction: column; gap: 12px; padding: 12px; }
    .cuerpo { display: flex; flex-direction: column; gap: 10px; padding: 0 6px; flex: 1; }
    h3 { margin: 0; font-size: 17px; }
    .docente { margin: 0; font-size: 13px; color: var(--muted); }
    .descripcion { margin: 0; font-size: 13px; line-height: 1.5; color: var(--dark-blue); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .pie { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--line); font-size: 12px; color: var(--muted); }
    .pie a, .pie button { text-decoration: none; }
    .vacio { grid-column: 1 / -1; }
    .cargando { color: var(--muted); }
  `,
  template: `
    <app-page-header miga="Aprendizaje" titulo="Catálogo" descripcion="Cursos abiertos de esta academia. Inscríbete y empieza cuando quieras." />

    <div class="barra">
      <label class="buscar">
        <fa-icon [icon]="faMagnifyingGlass" />
        <input class="ui-input" placeholder="Buscar curso o docente" [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" aria-label="Buscar curso" />
      </label>
      <div class="categorias" role="tablist">
        <button type="button" class="categoria" [class.activa]="!categoria()" (click)="categoria.set('')">Todas</button>
        @for (c of categorias(); track c) {
          <button type="button" class="categoria" [class.activa]="categoria() === c" (click)="categoria.set(c)">{{ c }}</button>
        }
      </div>
    </div>

    @if (cursos.isLoading() && !cursos.value().length) {
      <p class="cargando">Cargando cursos…</p>
    } @else {
      <div class="grilla">
        @for (c of visibles(); track c.aula.id) {
          <article class="ui-card curso">
            <app-portada-aula [imagen]="c.aula.portada" [icono]="c.aula.icono" [tono]="c.aula.tono" />
            <div class="cuerpo">
              <div>
                <h3>{{ c.aula.nombre }}</h3>
                <p class="docente">Prof. {{ c.docente }}</p>
              </div>
              @if (c.aula.descripcion) { <p class="descripcion">{{ c.aula.descripcion }}</p> }
              <div class="chips">
                @if (c.aula.categoria) { <span class="ui-badge tono-lima">{{ c.aula.categoria }}</span> }
                @if (c.aula.nivel) { <span class="ui-badge">{{ c.aula.nivel }}</span> }
                @if (c.aula.aprobacionManual) { <span class="ui-badge tono-crema"><fa-icon [icon]="faUserCheck" /> Con aprobación</span> }
              </div>
              <div class="pie">
                <span><fa-icon [icon]="faLayerGroup" /> {{ c.temas }} temas · <fa-icon [icon]="faUsers" /> {{ c.estudiantes }}</span>
                @switch (c.estado) {
                  @case ('ACTIVA') { <a class="ui-btn ui-btn--secundario" [routerLink]="session.rutaRol('aulas', c.aula.id)"><fa-icon [icon]="faBookOpen" /> Ir al curso</a> }
                  @case ('PENDIENTE') { <span class="ui-badge tono-crema"><fa-icon [icon]="faClock" /> Solicitud pendiente</span> }
                  @default {
                    <button type="button" class="ui-btn" [disabled]="inscribiendo() === c.aula.id" (click)="inscribirse(c)">
                      <fa-icon [icon]="c.aula.aprobacionManual ? faUserCheck : faCheck" /> {{ c.aula.aprobacionManual ? 'Solicitar' : 'Inscribirme' }}
                    </button>
                  }
                }
              </div>
            </div>
          </article>
        } @empty {
          <div class="ui-card vacio"><app-empty-state [icono]="faCompass" titulo="No hay cursos con ese filtro" /></div>
        }
      </div>
    }
  `,
})
export class CatalogoComponent {
  readonly session = inject(SessionService);
  private academia = inject(AcademiaService);
  private avisos = inject(AvisosService);

  readonly faBookOpen = faBookOpen;
  readonly faCheck = faCheck;
  readonly faClock = faClock;
  readonly faCompass = faCompass;
  readonly faLayerGroup = faLayerGroup;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faUserCheck = faUserCheck;
  readonly faUsers = faUsers;

  private readonly espacio = this.session.espacioActivo()!;
  readonly cursos = rxResource({ stream: () => this.academia.catalogo(this.espacio.id, this.session.usuarioId()!), defaultValue: [] });

  readonly busqueda = signal('');
  readonly categoria = signal('');
  readonly categorias = computed(() => [...new Set(this.cursos.value().map((c) => c.aula.categoria).filter(Boolean))].sort());
  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return this.cursos.value()
      .filter((c) => !this.categoria() || c.aula.categoria === this.categoria())
      .filter((c) => !texto || c.aula.nombre.toLowerCase().includes(texto) || c.docente.toLowerCase().includes(texto));
  });

  readonly inscribiendo = signal(0);

  async inscribirse(c: CursoPublico): Promise<void> {
    this.inscribiendo.set(c.aula.id);
    try {
      const estado = await firstValueFrom(this.academia.inscribirse(c.aula.id, this.session.usuarioId()!));
      this.avisos.exito(estado === 'ACTIVA' ? `¡Listo! Ya estás en "${c.aula.nombre}".` : 'Solicitud enviada: el docente la revisará.');
      this.cursos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.inscribiendo.set(0);
    }
  }
}
