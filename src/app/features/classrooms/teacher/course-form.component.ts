import { Component, effect, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, switchMap, timer } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCamera, faChevronDown, faEye, faEyeSlash, faPlus, faTrash, faUserCheck } from '@fortawesome/free-solid-svg-icons';
import { AcademyCourseApiService } from '../../../core/api/academy-course-api.service';
import { NIVELES_CURSO } from '../../../core/models/classrooms.model';
import type { Aula } from '../../../core/models/classrooms.model';
import type { DatosCurso } from '../../../services/academy.service';
import { CourseCategoryApiService } from '../../../core/api/course-category-api.service';
import { PORTADA_MAX_KB } from '../../../services/classrooms.service';
import { ClassroomCoverComponent } from '../../../shared/classrooms/classroom-cover.component';
import { NotificationService } from '../../../shared/ui/notification.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { getErrorMessage } from '../../management/academics/academics.ui';

const VACIO: DatosCurso = { nombre: '', descripcion: '', categoria: '', nivel: 'Principiante', visibilidad: 'publico', aprobacionManual: false, portada: '' };

// Formulario para crear o editar un curso de academia (nombre, categoría, nivel, visibilidad, aprobación y portada)
@Component({
  selector: 'app-course-form',
  imports: [FaIconComponent, DrawerComponent, ClassroomCoverComponent],
  styles: `
    .portada { position: relative; }
    .portada-acciones { position: absolute; right: 8px; bottom: 8px; display: flex; gap: 6px; }
    .subir { position: relative; height: 30px; padding: 0 10px; font-size: 12px; background: var(--text-light); cursor: pointer; }
    .subir input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .chico { width: 30px; height: 30px; }
    .area { height: auto; padding-top: 10px; resize: vertical; }
    .opciones { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .opcion { display: flex; gap: 10px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; font-size: 13px; cursor: pointer; }
    .opcion input { display: none; }
    .opcion.activa { border-color: var(--lime-green); background: var(--lime-soft); }
    .opcion div { display: flex; flex-direction: column; gap: 2px; }
    .opcion small { color: var(--muted); font-size: 12px; }
    .check { display: flex; align-items: flex-start; gap: 8px; font-size: 14px; }
    .check small { display: block; color: var(--muted); font-size: 12px; }
    .categoria-control { position: relative; }
    .categoria-trigger { display: flex; align-items: center; justify-content: space-between; width: 100%; text-align: left; cursor: pointer; }
    .categoria-menu { position: absolute; z-index: 10; top: calc(100% + 4px); left: 0; right: 0; padding: 6px; border: 1px solid var(--line); border-radius: 10px; background: var(--text-light); box-shadow: 0 12px 28px #0b0d241f; }
    .categoria-buscar { width: 100%; box-sizing: border-box; margin-bottom: 4px; }
    .categoria-resultados { max-height: 180px; overflow-y: auto; }
    .categoria-opcion { display: block; width: 100%; padding: 9px 12px; border: 0; background: transparent; color: var(--dark-blue); text-align: left; cursor: pointer; }
    .categoria-opcion:hover, .categoria-opcion[aria-selected="true"] { background: var(--lime-soft); }
    .categoria-accion { width: 100%; padding: 9px 12px; border: 0; border-top: 1px solid var(--line); background: transparent; color: var(--dark-blue); text-align: left; font: inherit; font-weight: 600; cursor: pointer; }
    .categoria-nueva { display: flex; gap: 7px; margin-top: 7px; }
    .categoria-nueva .ui-input { min-width: 0; flex: 1; }
  `,
  template: `
    <app-drawer [abierto]="abierto()" [titulo]="curso() ? 'Editar curso' : 'Nuevo curso'" subtitulo="Después podrás agregar unidades, temas y quiz." (cerrar)="cerrar.emit()">
      <form class="ui-form" (submit)="$event.preventDefault(); guardar()" novalidate>
        <div class="portada">
          <app-classroom-cover [imagen]="modelo().portada" [icono]="curso()?.icono ?? 'computo'" [tono]="curso()?.tono ?? 'lima'" />
          <div class="portada-acciones">
            <label class="ui-btn ui-btn--secundario subir"><fa-icon [icon]="faCamera" /> {{ modelo().portada ? 'Cambiar' : 'Subir portada' }}
              <input id="curso-portada" type="file" accept="image/*" (change)="elegirPortada($event)" />
            </label>
            @if (modelo().portada) { <button type="button" class="ui-btn ui-btn--icono chico" (click)="cambiar('portada', '')" aria-label="Quitar portada"><fa-icon [icon]="faTrash" /></button> }
          </div>
        </div>
        <span class="ui-ayuda">Opcional. Si no subes una imagen, usamos una ilustración con los colores del curso.</span>
        <div class="ui-campo">
          <label for="curso-nombre">Nombre del curso</label>
          <input id="curso-nombre" class="ui-input" placeholder="Ej. Excel desde cero" [value]="modelo().nombre" (input)="cambiar('nombre', $any($event.target).value)" />
        </div>
        <div class="ui-campo">
          <label for="curso-desc">Descripción</label>
          <textarea id="curso-desc" class="ui-input area" rows="3" placeholder="¿Qué aprenderán tus estudiantes?" [value]="modelo().descripcion" (input)="cambiar('descripcion', $any($event.target).value)"></textarea>
        </div>
        <div class="ui-fila">
          <div class="ui-campo">
            <label for="curso-cat">Categoría</label>
            <div class="categoria-control">
              <button id="curso-cat" type="button" class="ui-input categoria-trigger" [attr.aria-expanded]="categoriasAbiertas()" aria-controls="curso-categorias" (click)="categoriasAbiertas.set(!categoriasAbiertas())">
                {{ modelo().categoria || 'Elige una categoría' }} <fa-icon [icon]="faChevronDown" />
              </button>
              @if (categoriasAbiertas()) {
                <div id="curso-categorias" class="categoria-menu">
                  <input class="ui-input categoria-buscar" aria-label="Buscar categoría" placeholder="Buscar categoría…" autocomplete="off" [value]="busquedaCategoria()" (input)="busquedaCategoria.set($any($event.target).value)" (keydown.escape)="categoriasAbiertas.set(false)" />
                  <div class="categoria-resultados" role="listbox" aria-label="Categorías disponibles">
                    @for (c of categorias.value(); track c.id) {
                      <button type="button" role="option" class="categoria-opcion" [attr.aria-selected]="modelo().categoria === c.name" (click)="seleccionarCategoria(c.name)">{{ c.name }}</button>
                    } @empty {
                      <span class="ui-ayuda">{{ categorias.isLoading() ? 'Buscando…' : categorias.error() ? 'No se pudieron cargar las categorías.' : 'No hay coincidencias.' }}</span>
                    }
                  </div>
                  <button type="button" class="categoria-accion" (click)="categoriasAbiertas.set(false); agregandoCategoria.set(true); nombreCategoria.set(busquedaCategoria())"><fa-icon [icon]="faPlus" /> Agregar categoría</button>
                </div>
              }
            </div>
            @if (agregandoCategoria()) {
              <div class="categoria-nueva">
                <input class="ui-input" aria-label="Nueva categoría" maxlength="50" placeholder="Nombre de la categoría" [value]="nombreCategoria()" (input)="nombreCategoria.set($any($event.target).value)" />
                <button type="button" class="ui-btn ui-btn--secundario" [disabled]="guardandoCategoria()" (click)="agregarCategoria()">{{ guardandoCategoria() ? 'Guardando…' : 'Agregar' }}</button>
              </div>
            }
            @if (errorCategoria()) { <span class="ui-error">{{ errorCategoria() }}</span> }
          </div>
          <div class="ui-campo">
            <label for="curso-nivel">Nivel</label>
            <select id="curso-nivel" class="ui-input" (change)="cambiar('nivel', $any($event.target).value)">
              @for (n of niveles; track n) { <option [value]="n" [selected]="modelo().nivel === n">{{ n }}</option> }
            </select>
          </div>
        </div>
        <span class="ui-etiqueta">¿Quién puede encontrarlo?</span>
        <div class="opciones">
          <label class="opcion" [class.activa]="modelo().visibilidad === 'publico'">
            <input type="radio" name="visibilidad" id="curso-publico" [checked]="modelo().visibilidad === 'publico'" (change)="cambiar('visibilidad', 'publico')" />
            <fa-icon [icon]="faEye" /><div><strong>Público</strong><small>Aparece en el catálogo</small></div>
          </label>
          <label class="opcion" [class.activa]="modelo().visibilidad === 'privado'">
            <input type="radio" name="visibilidad" id="curso-privado" [checked]="modelo().visibilidad === 'privado'" (change)="cambiar('visibilidad', 'privado')" />
            <fa-icon [icon]="faEyeSlash" /><div><strong>Privado</strong><small>Solo con tu link de invitación</small></div>
          </label>
        </div>
        <label class="check">
          <input type="checkbox" id="curso-aprobacion" [checked]="modelo().aprobacionManual" (change)="cambiar('aprobacionManual', $any($event.target).checked)" />
          <span><fa-icon [icon]="faUserCheck" /> Aprobar cada inscripción<small>Las inscripciones quedan pendientes hasta que las apruebes.</small></span>
        </label>
      </form>
      <ng-container pie>
        <button type="button" class="ui-btn ui-btn--secundario" (click)="cerrar.emit()">Cancelar</button>
        <button type="button" class="ui-btn" [disabled]="guardando()" (click)="guardar()">{{ guardando() ? 'Guardando…' : curso() ? 'Guardar cambios' : 'Crear curso' }}</button>
      </ng-container>
    </app-drawer>
  `,
})
export class CourseFormComponent {
  private academia = inject(AcademyCourseApiService);
  private avisos = inject(NotificationService);

  readonly abierto = input(false);
  readonly curso = input<Aula | null>(null);
  readonly cerrar = output<void>();
  readonly guardado = output<Aula>();

  readonly niveles = NIVELES_CURSO;
  readonly faCamera = faCamera;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faTrash = faTrash;
  readonly faUserCheck = faUserCheck;
  readonly faPlus = faPlus;
  readonly faChevronDown = faChevronDown;

  private readonly categoriasApi = inject(CourseCategoryApiService);
  readonly busquedaCategoria = signal('');
  readonly categoriasAbiertas = signal(false);
  readonly categorias = rxResource({
    params: () => this.busquedaCategoria(),
    stream: ({ params }) => timer(params ? 250 : 0).pipe(switchMap(() => this.categoriasApi.search(params))),
    defaultValue: [],
  });
  readonly agregandoCategoria = signal(false);
  readonly guardandoCategoria = signal(false);
  readonly nombreCategoria = signal('');
  readonly errorCategoria = signal('');
  readonly modelo = signal<DatosCurso>({ ...VACIO });
  readonly guardando = signal(false);

  // Al abrir: datos del curso que se edita o el formulario vacío
  private readonly alAbrir = effect(() => {
    if (!this.abierto()) return;
    const c = this.curso();
    this.modelo.set(c ? { nombre: c.nombre, descripcion: c.descripcion, categoria: c.categoria, nivel: c.nivel || 'Principiante', visibilidad: c.visibilidad, aprobacionManual: c.aprobacionManual, portada: c.portada } : { ...VACIO });
    this.busquedaCategoria.set('');
    this.categoriasAbiertas.set(false);
    this.agregandoCategoria.set(false);
    this.errorCategoria.set('');
  });

  seleccionarCategoria(nombre: string): void {
    this.cambiar('categoria', nombre);
    this.busquedaCategoria.set(nombre);
    this.categoriasAbiertas.set(false);
    this.errorCategoria.set('');
  }

  async agregarCategoria(): Promise<void> {
    const nombre = this.nombreCategoria().trim().replace(/\s+/g, ' ');
    if (!nombre || nombre.length > 50) {
      this.errorCategoria.set('Escribe una categoría de 1 a 50 caracteres.');
      return;
    }
    this.guardandoCategoria.set(true);
    this.errorCategoria.set('');
    try {
      const categoria = await firstValueFrom(this.categoriasApi.create(nombre));
      this.seleccionarCategoria(categoria.name);
      this.agregandoCategoria.set(false);
      this.nombreCategoria.set('');
      this.categorias.reload();
    } catch (error) {
      this.errorCategoria.set(getErrorMessage(error));
    } finally {
      this.guardandoCategoria.set(false);
    }
  }

  cambiar<K extends keyof DatosCurso>(campo: K, valor: DatosCurso[K]): void {
    this.modelo.update((m) => ({ ...m, [campo]: valor }));
  }

  elegirPortada(event: Event): void {
    const entrada = event.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) return this.avisos.error('La portada debe ser una imagen.');
    if (archivo.size > PORTADA_MAX_KB * 1024) return this.avisos.error(`La imagen debe pesar menos de ${PORTADA_MAX_KB} KB.`);
    const lector = new FileReader();
    lector.onload = () => this.cambiar('portada', String(lector.result));
    lector.readAsDataURL(archivo);
  }

  async guardar(): Promise<void> {
    this.guardando.set(true);
    try {
      const c = this.curso();
      const aula = await firstValueFrom(c ? this.academia.update(c.id, this.modelo()) : this.academia.create(this.modelo()));
      this.avisos.success(c ? 'Curso actualizado.' : `Creaste "${aula.nombre}". Ahora agrega su contenido.`);
      this.guardado.emit(aula);
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    } finally {
      this.guardando.set(false);
    }
  }
}
