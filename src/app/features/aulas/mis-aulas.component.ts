import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import type { Aula } from '../../core/models/aulas.model';
import { CursoFormComponent } from './docente/curso-form.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowDownWideShort, faBookOpen, faCompass, faMagnifyingGlass, faPlus } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { AulaResumen, AulasService } from '../../services/aulas.service';
import { TarjetaAulaComponent } from '../../shared/aulas/tarjeta-aula.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

type Filtro = 'todas' | 'pendientes';
type Orden = 'recientes' | 'nombre' | 'avance';

// Lista de aulas virtuales: "Mis clases"/"Mis cursos" del docente y "Mis materias"/"Mis cursos" del estudiante
@Component({
  selector: 'app-mis-aulas',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, PageHeaderComponent, EmptyStateComponent, TarjetaAulaComponent, CursoFormComponent],
  styles: `
    .barra { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
    .contador { font-size: 14px; font-weight: bold; }
    .buscar { position: relative; flex: 1; min-width: 200px; max-width: 320px; }
    .buscar fa-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 13px; }
    .buscar .ui-input { width: 100%; padding-left: 34px; }
    .orden { display: flex; align-items: center; gap: 8px; margin-left: auto; font-size: 13px; color: var(--muted); }
    .orden select { width: 170px; }
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }
    .cargando { color: var(--muted); }
    a.ui-btn { text-decoration: none; }
  `,
  template: `
    <app-page-header [miga]="textos().miga" [titulo]="textos().titulo" [descripcion]="textos().descripcion">
      @if (esDocente && espacio.tipo === 'academia') {
        <button type="button" class="ui-btn" (click)="formAbierto.set(true)"><fa-icon [icon]="faPlus" /> Crear curso</button>
      }
      @if (!esDocente && espacio.tipo === 'academia') {
        <a class="ui-btn ui-btn--secundario" [routerLink]="session.rutaRol('catalogo')"><fa-icon [icon]="faCompass" /> Explorar cursos</a>
      }
    </app-page-header>

    <div class="barra">
      <div class="ui-tabs" role="tablist">
        <button type="button" class="ui-tab" [class.activa]="filtro() === 'todas'" (click)="filtro.set('todas')">Todas <span class="contador">{{ aulas.value().length }}</span></button>
        <button type="button" class="ui-tab" [class.activa]="filtro() === 'pendientes'" (click)="filtro.set('pendientes')">{{ esDocente ? 'Por revisar' : 'Con pendientes' }} <span class="contador">{{ conPendientes() }}</span></button>
      </div>
      <label class="buscar">
        <fa-icon [icon]="faMagnifyingGlass" />
        <input class="ui-input" placeholder="Buscar…" [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" aria-label="Buscar" />
      </label>
      <label class="orden">
        <fa-icon [icon]="faArrowDownWideShort" />
        <select class="ui-input" aria-label="Ordenar" (change)="orden.set($any($event.target).value)">
          <option value="recientes" [selected]="orden() === 'recientes'">Actualizadas recientemente</option>
          <option value="nombre" [selected]="orden() === 'nombre'">Nombre</option>
          <option value="avance" [selected]="orden() === 'avance'">{{ esDocente ? 'Avance del grupo' : 'Mi progreso' }}</option>
        </select>
      </label>
    </div>

    @if (aulas.isLoading() && aulas.value().length === 0) {
      <p class="cargando">Cargando…</p>
    } @else {
      <div class="grilla">
        @for (a of visibles(); track a.id) {
          <app-tarjeta-aula [aula]="a" [link]="session.rutaRol(esDocente ? 'clases' : 'aulas', a.id)"
            [subtitulo]="esDocente ? '' : 'Prof. ' + a.docente" [textoPendientes]="esDocente ? 'por revisar' : 'por entregar'" />
        } @empty {
          <div class="ui-card" style="grid-column: 1 / -1">
            <app-empty-state [icono]="faBookOpen" [titulo]="aulas.value().length ? 'Nada coincide con el filtro' : textos().vacio" />
          </div>
        }
      </div>
    }
    @if (esDocente && espacio.tipo === 'academia') {
      <app-curso-form [abierto]="formAbierto()" (cerrar)="formAbierto.set(false)" (guardado)="alCrear($event)" />
    }
  `,
})
export class MisAulasComponent {
  readonly session = inject(SessionService);
  private servicio = inject(AulasService);
  private router = inject(Router);

  readonly crear = input<boolean>(); // la ruta "cursos/nuevo" abre el formulario de entrada
  readonly formAbierto = linkedSignal(() => !!this.crear());

  readonly faArrowDownWideShort = faArrowDownWideShort;
  readonly faBookOpen = faBookOpen;
  readonly faCompass = faCompass;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faPlus = faPlus;

  readonly espacio = this.session.espacioActivo()!;
  readonly esDocente = this.session.rolActivo() === 'docente';
  private readonly usuarioId = this.session.usuarioId()!;

  readonly aulas = rxResource({
    stream: () => (this.esDocente ? this.servicio.aulasDocente(this.espacio.id, this.usuarioId) : this.servicio.aulasEstudiante(this.espacio.id, this.usuarioId)),
    defaultValue: [],
  });

  readonly textos = computed(() => {
    const colegio = this.espacio.tipo === 'colegio';
    if (this.esDocente) {
      return colegio
        ? { miga: 'Mis clases', titulo: 'Mis clases', descripcion: 'El aula virtual de cada materia que dictas: contenido, quiz, tareas, estudiantes y notas.', vacio: 'Todavía no tienes clases asignadas' }
        : { miga: 'Cursos', titulo: 'Mis cursos', descripcion: 'Tus cursos con su contenido, estudiantes y avance.', vacio: 'Todavía no creaste cursos' };
    }
    return colegio
      ? { miga: 'Aprendizaje', titulo: 'Mis materias', descripcion: 'Tus materias de este año: contenido, tareas y tu avance en cada una.', vacio: 'Todavía no estás inscrito en un curso' }
      : { miga: 'Aprendizaje', titulo: 'Mis cursos', descripcion: 'Los cursos en los que estás inscrito.', vacio: 'Todavía no te inscribiste en ningún curso' };
  });

  readonly filtro = signal<Filtro>('todas');
  readonly busqueda = signal('');
  readonly orden = signal<Orden>(this.esDocente ? 'recientes' : 'nombre');

  alCrear(aula: Aula): void {
    this.formAbierto.set(false);
    this.router.navigate(this.session.rutaRol('clases', aula.id), { queryParams: { tab: 'contenido' } });
  }

  readonly conPendientes = computed(() => this.aulas.value().filter((a) => a.pendientes > 0).length);

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const lista = this.aulas.value()
      .filter((a) => this.filtro() === 'todas' || a.pendientes > 0)
      .filter((a) => !texto || a.nombre.toLowerCase().includes(texto) || a.docente.toLowerCase().includes(texto));
    const avance = (a: AulaResumen) => a.anillos[0].valor ?? -1;
    return [...lista].sort((a, b) =>
      this.orden() === 'nombre' ? a.nombre.localeCompare(b.nombre)
      : this.orden() === 'avance' ? avance(b) - avance(a)
      : b.actualizado.localeCompare(a.actualizado)
    );
  });
}
