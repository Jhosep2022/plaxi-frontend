import { Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormField, disabled, form, min, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowDown, faArrowUp, faBookOpen, faCopy, faEyeSlash, faFilePdf, faFileLines, faLink, faLock, faPen, faPlus, faTrash, faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { TIPOS_TEMA } from '../../../core/models/aulas.model';
import type { Tema, TipoTema, Unidad } from '../../../core/models/aulas.model';
import { AulaResumen, AulasService, UnidadConTemas } from '../../../services/aulas.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { mensajeError } from '../../direccion/academico/academico.ui';

export const ICONO_TEMA: Record<TipoTema, typeof faVideo> = { texto: faFileLines, video: faVideo, pdf: faFilePdf, enlace: faLink };

const UNIDAD_VACIA = { titulo: '', descripcion: '', publicada: true, requiereAnterior: false };
const TEMA_VACIO = { unidadId: '', titulo: '', tipo: 'texto' as TipoTema, contenido: '', url: '', duracionMin: 10, publicado: true };

// Editor del contenido del aula: unidades y temas, orden, borradores, bloqueo y copia a otros paralelos
@Component({
  selector: 'app-contenido-docente',
  imports: [FaIconComponent, FormField, DrawerComponent, EmptyStateComponent],
  templateUrl: './contenido-docente.component.html',
  styleUrls: ['./contenido-docente.component.css'],
})
export class ContenidoDocenteComponent {
  private servicio = inject(AulasService);
  private avisos = inject(AvisosService);

  readonly aula = input.required<AulaResumen>();
  readonly cambio = output<void>(); // avisa al aula que cambió el contenido

  readonly tipos = TIPOS_TEMA;
  readonly iconoTema = ICONO_TEMA;
  readonly faArrowDown = faArrowDown;
  readonly faArrowUp = faArrowUp;
  readonly faBookOpen = faBookOpen;
  readonly faCopy = faCopy;
  readonly faEyeSlash = faEyeSlash;
  readonly faLock = faLock;
  readonly faPen = faPen;
  readonly faPlus = faPlus;
  readonly faTrash = faTrash;

  readonly unidades = rxResource({ params: () => this.aula().id, stream: ({ params }) => this.servicio.contenido(params), defaultValue: [] });
  readonly hermanas = rxResource({ params: () => this.aula().id, stream: ({ params }) => this.servicio.aulasHermanas(params), defaultValue: [] });
  readonly totalTemas = computed(() => this.unidades.value().reduce((s, u) => s + u.temas.length, 0));
  readonly duracionTotal = computed(() => this.unidades.value().reduce((s, u) => s + u.temas.reduce((t, x) => t + x.duracionMin, 0), 0));

  private recargar(): void {
    this.unidades.reload();
    this.cambio.emit();
  }

  private async ejecutar(accion: Promise<unknown>, exito?: string): Promise<boolean> {
    try {
      await accion;
      if (exito) this.avisos.exito(exito);
      this.recargar();
      return true;
    } catch (error) {
      this.avisos.error(mensajeError(error));
      return false;
    }
  }

  // ---------- Unidades ----------
  readonly editandoUnidad = signal<Unidad | null>(null);
  readonly drawerUnidad = signal(false);
  readonly modeloUnidad = signal({ ...UNIDAD_VACIA });
  readonly esPrimera = computed(() => {
    const u = this.editandoUnidad();
    return u ? u.orden === 1 : this.unidades.value().length === 0;
  });
  readonly formUnidad = form(this.modeloUnidad, (s) => {
    required(s.titulo, { message: 'Ponle un título a la unidad.' });
    disabled(s.requiereAnterior, () => this.esPrimera());
  });

  nuevaUnidad(): void {
    this.editandoUnidad.set(null);
    this.modeloUnidad.set({ ...UNIDAD_VACIA, titulo: `Unidad ${this.unidades.value().length + 1}: ` });
    this.formUnidad().reset();
    this.drawerUnidad.set(true);
  }

  editarUnidad(u: Unidad): void {
    this.editandoUnidad.set(u);
    this.modeloUnidad.set({ titulo: u.titulo, descripcion: u.descripcion, publicada: u.publicada, requiereAnterior: u.requiereAnterior });
    this.formUnidad().reset();
    this.drawerUnidad.set(true);
  }

  guardarUnidad(): void {
    submit(this.formUnidad, async () => {
      const m = this.modeloUnidad();
      const ok = await this.ejecutar(
        firstValueFrom(this.servicio.guardarUnidad({ ...m, requiereAnterior: !this.esPrimera() && m.requiereAnterior, id: this.editandoUnidad()?.id, aulaId: this.aula().id })),
        this.editandoUnidad() ? 'Unidad actualizada.' : 'Unidad creada.'
      );
      if (ok) this.drawerUnidad.set(false);
    });
  }

  async eliminarUnidad(u: UnidadConTemas): Promise<void> {
    if (!confirm(`¿Eliminar "${u.titulo}"${u.temas.length ? ` y sus ${u.temas.length} temas` : ''}? Se perderá el avance de los estudiantes en esos temas.`)) return;
    await this.ejecutar(firstValueFrom(this.servicio.eliminarUnidad(u)), 'Unidad eliminada.');
  }

  moverUnidad(u: Unidad, direccion: -1 | 1): void {
    this.ejecutar(firstValueFrom(this.servicio.moverUnidad(u, direccion)));
  }

  alternarPublicada(u: Unidad): void {
    const { temas: _t, ...unidad } = u as UnidadConTemas;
    this.ejecutar(firstValueFrom(this.servicio.guardarUnidad({ ...unidad, publicada: !u.publicada })), u.publicada ? 'La unidad pasó a borrador: los estudiantes ya no la ven.' : 'Unidad publicada.');
  }

  // ---------- Temas ----------
  readonly editandoTema = signal<Tema | null>(null);
  readonly drawerTema = signal(false);
  readonly modeloTema = signal({ ...TEMA_VACIO });
  readonly formTema = form(this.modeloTema, (s) => {
    required(s.unidadId, { message: 'Elige la unidad.' });
    required(s.titulo, { message: 'Ponle un título al tema.' });
    min(s.duracionMin, 1, { message: 'Al menos 1 minuto.' });
  });

  nuevoTema(unidad?: Unidad): void {
    const destino = unidad ?? this.unidades.value().at(-1);
    if (!destino) {
      this.avisos.error('Primero crea una unidad.');
      return;
    }
    this.editandoTema.set(null);
    this.modeloTema.set({ ...TEMA_VACIO, unidadId: String(destino.id) });
    this.formTema().reset();
    this.drawerTema.set(true);
  }

  editarTema(t: Tema): void {
    this.editandoTema.set(t);
    this.modeloTema.set({ unidadId: String(t.unidadId), titulo: t.titulo, tipo: t.tipo, contenido: t.contenido, url: t.url, duracionMin: t.duracionMin, publicado: t.publicado });
    this.formTema().reset();
    this.drawerTema.set(true);
  }

  elegirPdf(event: Event): void {
    const nombre = (event.target as HTMLInputElement).files?.[0]?.name;
    if (nombre) this.modeloTema.update((m) => ({ ...m, url: nombre }));
  }

  guardarTema(): void {
    submit(this.formTema, async () => {
      const m = this.modeloTema();
      const ok = await this.ejecutar(
        firstValueFrom(this.servicio.guardarTema({ ...m, unidadId: Number(m.unidadId), duracionMin: Number(m.duracionMin), url: m.tipo === 'texto' ? '' : m.url.trim(), id: this.editandoTema()?.id })),
        this.editandoTema() ? 'Tema actualizado.' : 'Tema agregado.'
      );
      if (ok) this.drawerTema.set(false);
    });
  }

  async eliminarTema(t: Tema): Promise<void> {
    if (!confirm(`¿Eliminar el tema "${t.titulo}"?`)) return;
    await this.ejecutar(firstValueFrom(this.servicio.eliminarTema(t)), 'Tema eliminado.');
  }

  moverTema(t: Tema, direccion: -1 | 1): void {
    this.ejecutar(firstValueFrom(this.servicio.moverTema(t, direccion)));
  }

  // ---------- Copiar a otros paralelos ----------
  readonly drawerCopiar = signal(false);
  readonly unidadesACopiar = signal<number[]>([]);
  readonly destinos = signal<number[]>([]);
  readonly copiando = signal(false);

  abrirCopia(): void {
    this.unidadesACopiar.set(this.unidades.value().map((u) => u.id));
    this.destinos.set([]);
    this.drawerCopiar.set(true);
  }

  alternar(lista: typeof this.destinos, id: number, activo: boolean): void {
    lista.update((ids) => (activo ? [...ids, id] : ids.filter((x) => x !== id)));
  }

  async copiar(): Promise<void> {
    this.copiando.set(true);
    try {
      const n = await firstValueFrom(this.servicio.copiarContenido(this.aula().id, this.unidadesACopiar(), this.destinos()));
      this.avisos.exito(`Se copiaron ${n} ${n === 1 ? 'unidad' : 'unidades'} como borrador. Revísalas y publícalas en cada paralelo.`);
      this.drawerCopiar.set(false);
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.copiando.set(false);
    }
  }

  tipoLabel(t: TipoTema): string {
    return TIPOS_TEMA.find((x) => x.id === t)?.label ?? t;
  }
}
