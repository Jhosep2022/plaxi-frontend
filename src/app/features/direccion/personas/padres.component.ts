import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChild, faEnvelope, faMagnifyingGlass, faMobileScreen, faPen, faPhone, faPlus, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { compararParalelos, paraleloLabel } from '../../../core/models/academico.model';
import { PARENTESCOS, Parentesco, Tutor, iniciales } from '../../../core/models/personas.model';
import { AcademicoService } from '../../../services/academico.service';
import { PersonasService } from '../../../services/personas.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../academico/academico.ui';
import { PATRON_CI, PATRON_EMAIL, PATRON_TELEFONO } from './personas.ui';

const PADRE_VACIO = { nombre: '', ci: '', telefono: '', email: '', ocupacion: '' };

interface HijoEditable {
  estudianteId: string; // '' = sin elegir
  parentesco: Parentesco;
}

// Padres y tutores legales: datos de contacto y estudiantes a su cargo
@Component({
  selector: 'app-padres',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, PageHeaderComponent, DrawerComponent],
  templateUrl: './padres.component.html',
  styleUrls: ['./personas.css'],
  styles: `
    .hijos { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
    .hijo { display: grid; grid-template-columns: 1fr 120px 38px; gap: 8px; align-items: center; }
    .seccion { margin: 8px 0 0; font-size: 14px; }
  `,
})
export class PadresComponent {
  private personas = inject(PersonasService);
  private academico = inject(AcademicoService);
  private avisos = inject(AvisosService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly parentescos = PARENTESCOS;
  readonly paraleloLabel = paraleloLabel;
  readonly iniciales = iniciales;
  readonly faChild = faChild;
  readonly faEnvelope = faEnvelope;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faMobileScreen = faMobileScreen;
  readonly faPen = faPen;
  readonly faPhone = faPhone;
  readonly faPlus = faPlus;
  readonly faTrash = faTrash;
  readonly faUsers = faUsers;

  readonly padres = rxResource({ stream: () => this.personas.padres(), defaultValue: [] });
  readonly vinculos = rxResource({ stream: () => this.personas.vinculos(), defaultValue: [] });
  readonly estudiantes = rxResource({ stream: () => this.personas.estudiantes(), defaultValue: [] });
  readonly paralelos = rxResource({ stream: () => this.academico.paralelosActivos(this.espacioId), defaultValue: [] });
  readonly cuentas = rxResource({ stream: () => this.personas.cuentas(this.espacioId), defaultValue: new Set<number>() });

  private readonly cursoPorId = computed(() => new Map(this.paralelos.value().map((p) => [p.id, paraleloLabel(p)])));
  readonly cursos = computed(() => [...this.paralelos.value()].sort(compararParalelos));

  // Estudiantes a cargo de cada padre, con su curso y parentesco
  readonly hijosDe = computed(() => {
    const estudiantes = new Map(this.estudiantes.value().map((e) => [e.id, e]));
    const mapa = new Map<number, { id: number; nombre: string; curso: string; parentesco: string }[]>();
    for (const v of this.vinculos.value()) {
      const e = estudiantes.get(v.estudianteId);
      if (!e) continue;
      const hijo = { id: e.id, nombre: e.nombre, curso: this.cursoPorId().get(e.paraleloId) ?? 'Sin inscribir', parentesco: this.parentescoLabel(v.parentesco) };
      mapa.set(v.padreId, [...(mapa.get(v.padreId) ?? []), hijo]);
    }
    return mapa;
  });

  readonly busqueda = signal('');
  readonly curso = signal('todos');

  readonly conteo = computed(() => {
    const conTutor = new Set(this.vinculos.value().map((v) => v.estudianteId));
    return {
      total: this.padres.value().length,
      conCuenta: this.padres.value().filter((p) => this.cuentas.value().has(p.id)).length,
      estudiantesSinTutor: this.estudiantes.value().filter((e) => !conTutor.has(e.id)).length,
    };
  });

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const curso = this.curso();
    const estudiantes = new Map(this.estudiantes.value().map((e) => [e.id, e]));
    return this.padres.value().filter((p) => {
      const hijos = this.vinculos.value().filter((v) => v.padreId === p.id).map((v) => estudiantes.get(v.estudianteId)).filter((e) => !!e);
      if (curso !== 'todos' && !hijos.some((h) => String(h.paraleloId) === curso)) return false;
      return !texto || p.nombre.toLowerCase().includes(texto) || p.ci.includes(texto) || hijos.some((h) => h.nombre.toLowerCase().includes(texto));
    });
  });

  parentescoLabel(p: Parentesco): string {
    return PARENTESCOS.find((x) => x.id === p)?.label ?? p;
  }

  // ---------- Formulario ----------
  readonly drawerAbierto = signal(false);
  readonly editando = signal<Tutor | null>(null);
  readonly guardando = signal(false);
  readonly modelo = signal({ ...PADRE_VACIO });
  readonly hijos = signal<HijoEditable[]>([]);
  readonly formulario = form(this.modelo, (s) => {
    required(s.nombre, { message: 'Escribe el nombre completo.' });
    maxLength(s.nombre, 80, { message: 'Máximo 80 caracteres.' });
    required(s.ci, { message: 'El CI es obligatorio.' });
    pattern(s.ci, PATRON_CI, { message: 'Solo números (con complemento opcional).' });
    required(s.telefono, { message: 'El teléfono es necesario para avisos del colegio.' });
    pattern(s.telefono, PATRON_TELEFONO, { message: 'Debe tener 7 u 8 dígitos.' });
    pattern(s.email, PATRON_EMAIL, { message: 'Correo no válido.' });
  });

  // Opciones de estudiante agrupadas por curso
  readonly opcionesEstudiante = computed(() => {
    const grupos = this.cursos().map((p) => ({ label: paraleloLabel(p), estudiantes: this.estudiantes.value().filter((e) => e.paraleloId === p.id) }));
    const sinCurso = this.estudiantes.value().filter((e) => !e.paraleloId);
    return sinCurso.length ? [{ label: 'Sin inscribir', estudiantes: sinCurso }, ...grupos] : grupos;
  });

  nuevo(): void {
    this.editando.set(null);
    this.modelo.set({ ...PADRE_VACIO });
    this.hijos.set([{ estudianteId: '', parentesco: 'madre' }]);
    this.abrir();
  }

  editar(p: Tutor): void {
    this.editando.set(p);
    const { nombre, ci, telefono, email, ocupacion } = p;
    this.modelo.set({ nombre, ci, telefono, email, ocupacion });
    this.hijos.set(this.vinculos.value().filter((v) => v.padreId === p.id).map((v) => ({ estudianteId: String(v.estudianteId), parentesco: v.parentesco })));
    this.abrir();
  }

  agregarHijo(): void {
    this.hijos.update((h) => [...h, { estudianteId: '', parentesco: 'madre' }]);
  }

  quitarHijo(indice: number): void {
    this.hijos.update((h) => h.filter((_, i) => i !== indice));
  }

  cambiarHijo(indice: number, cambio: Partial<HijoEditable>): void {
    this.hijos.update((h) => h.map((x, i) => (i === indice ? { ...x, ...cambio } : x)));
  }

  guardar(): void {
    submit(this.formulario, async () => {
      const hijos = this.hijos().filter((h) => h.estudianteId).map((h) => ({ estudianteId: Number(h.estudianteId), parentesco: h.parentesco }));
      this.guardando.set(true);
      try {
        await firstValueFrom(this.personas.guardarPadre({ ...this.modelo(), id: this.editando()?.id }, hijos));
        this.avisos.exito(this.editando() ? 'Datos actualizados.' : `${this.modelo().nombre.trim()} fue registrado.`);
        this.drawerAbierto.set(false);
        this.padres.reload();
        this.vinculos.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  async eliminar(p: Tutor): Promise<void> {
    if (!confirm(`¿Eliminar a ${p.nombre}? Se quitará su vínculo con los estudiantes a su cargo.`)) return;
    try {
      await firstValueFrom(this.personas.eliminarPadre(p));
      this.avisos.exito(`${p.nombre} fue eliminado.`);
      this.padres.reload();
      this.vinculos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  private abrir(): void {
    this.formulario().reset();
    this.drawerAbierto.set(true);
  }
}
