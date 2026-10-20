import { Component, effect, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCamera, faEye, faEyeSlash, faTrash, faUserCheck } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { NIVELES_CURSO } from '../../../core/models/aulas.model';
import type { Aula } from '../../../core/models/aulas.model';
import { AcademiaService, DatosCurso } from '../../../services/academia.service';
import { CategoriaService } from '../../../services/categoria.service';
import { PORTADA_MAX_KB } from '../../../services/aulas.service';
import { PortadaAulaComponent } from '../../../shared/aulas/portada-aula.component';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { mensajeError } from '../../direccion/academico/academico.ui';

const VACIO: DatosCurso = { nombre: '', descripcion: '', categoria: '', nivel: 'Principiante', visibilidad: 'publico', aprobacionManual: false, portada: '' };

// Formulario para crear o editar un curso de academia (nombre, categoría, nivel, visibilidad, aprobación y portada)
@Component({
  selector: 'app-curso-form',
  imports: [FaIconComponent, DrawerComponent, PortadaAulaComponent],
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
  `,
  template: `
    <app-drawer [abierto]="abierto()" [titulo]="curso() ? 'Editar curso' : 'Nuevo curso'" subtitulo="Después podrás agregar unidades, temas y quiz." (cerrar)="cerrar.emit()">
      <form class="ui-form" (submit)="$event.preventDefault(); guardar()" novalidate>
        <div class="portada">
          <app-portada-aula [imagen]="modelo().portada" [icono]="curso()?.icono ?? 'computo'" [tono]="curso()?.tono ?? 'lima'" />
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
            <select id="curso-cat" class="ui-input" (change)="cambiar('categoria', $any($event.target).value)">
              <option value="" [selected]="!modelo().categoria">Elige una categoría</option>
              @for (c of categorias.value(); track c.idCategoria) { <option [value]="c.nombre" [selected]="modelo().categoria === c.nombre">{{ c.nombre }}</option> }
            </select>
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
export class CursoFormComponent {
  private session = inject(SessionService);
  private academia = inject(AcademiaService);
  private avisos = inject(AvisosService);

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

  private categoriasService = inject(CategoriaService);
  readonly categorias = rxResource({ stream: () => this.categoriasService.getAllCategorias(), defaultValue: [] });
  readonly modelo = signal<DatosCurso>({ ...VACIO });
  readonly guardando = signal(false);

  // Al abrir: datos del curso que se edita o el formulario vacío
  private readonly alAbrir = effect(() => {
    if (!this.abierto()) return;
    const c = this.curso();
    this.modelo.set(c ? { nombre: c.nombre, descripcion: c.descripcion, categoria: c.categoria, nivel: c.nivel || 'Principiante', visibilidad: c.visibilidad, aprobacionManual: c.aprobacionManual, portada: c.portada } : { ...VACIO });
  });

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
      const aula = await firstValueFrom(c ? this.academia.actualizarCurso(c.id, this.modelo()) : this.academia.crearCurso(this.session.espacioActivo()!.id, this.session.usuarioId()!, this.modelo()));
      this.avisos.exito(c ? 'Curso actualizado.' : `Creaste "${aula.nombre}". Ahora agrega su contenido.`);
      this.guardado.emit(aula);
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }
}
