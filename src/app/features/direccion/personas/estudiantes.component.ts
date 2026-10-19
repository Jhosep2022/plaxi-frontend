import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormField, form, maxLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChild, faMagnifyingGlass, faPen, faPlus, faUserClock, faUserGraduate } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { compararParalelos, paraleloLabel } from '../../../core/models/academico.model';
import { Estudiante } from '../../../core/models/asistencia.model';
import { PARENTESCOS, edad, iniciales } from '../../../core/models/personas.model';
import { hoyIso } from '../../../core/utils/asistencia';
import { AcademicoService } from '../../../services/academico.service';
import { PersonasService } from '../../../services/personas.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../academico/academico.ui';
import { PATRON_CI } from './personas.ui';

const ESTUDIANTE_VACIO = { nombre: '', ci: '', fechaNacimiento: '', paraleloId: '0' };
const SIN_CURSO = 'sin-curso';

// Estudiantes del colegio: datos personales, curso y padres / tutores registrados
@Component({
  selector: 'app-estudiantes',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, PageHeaderComponent, DrawerComponent],
  templateUrl: './estudiantes.component.html',
  styleUrls: ['./personas.css'],
})
export class EstudiantesComponent {
  private personas = inject(PersonasService);
  private academico = inject(AcademicoService);
  private avisos = inject(AvisosService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly SIN_CURSO = SIN_CURSO;
  readonly iniciales = iniciales;
  readonly paraleloLabel = paraleloLabel;
  readonly faChild = faChild;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faPen = faPen;
  readonly faPlus = faPlus;
  readonly faUserClock = faUserClock;
  readonly faUserGraduate = faUserGraduate;
  readonly hoy = hoyIso();

  readonly estudiantes = rxResource({ stream: () => this.personas.estudiantes(), defaultValue: [] });
  readonly paralelos = rxResource({ stream: () => this.academico.paralelosActivos(this.espacioId), defaultValue: [] });
  readonly padres = rxResource({ stream: () => this.personas.padres(), defaultValue: [] });
  readonly vinculos = rxResource({ stream: () => this.personas.vinculos(), defaultValue: [] });
  readonly cuentas = rxResource({ stream: () => this.personas.cuentas(this.espacioId), defaultValue: new Set<number>() });

  readonly cursos = computed(() => [...this.paralelos.value()].sort(compararParalelos));
  private readonly cursoPorId = computed(() => new Map(this.paralelos.value().map((p) => [p.id, paraleloLabel(p)])));

  // Padres / tutores de cada estudiante: "Rosa Quispe (Madre)"
  readonly tutoresDe = computed(() => {
    const nombres = new Map(this.padres.value().map((p) => [p.id, p.nombre]));
    const mapa = new Map<number, string[]>();
    for (const v of this.vinculos.value()) {
      const etiqueta = `${nombres.get(v.padreId) ?? '—'} (${PARENTESCOS.find((p) => p.id === v.parentesco)?.label})`;
      mapa.set(v.estudianteId, [...(mapa.get(v.estudianteId) ?? []), etiqueta]);
    }
    return mapa;
  });

  readonly busqueda = signal('');
  readonly curso = signal<string>('todos');

  readonly conteo = computed(() => {
    const todos = this.estudiantes.value();
    return {
      total: todos.length,
      inscritos: todos.filter((e) => e.paraleloId).length,
      sinCurso: todos.filter((e) => !e.paraleloId).length,
      sinTutor: todos.filter((e) => !this.tutoresDe().has(e.id)).length,
    };
  });

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const curso = this.curso();
    return this.estudiantes.value()
      .filter((e) => curso === 'todos' || (curso === SIN_CURSO ? !e.paraleloId : e.paraleloId === Number(curso)))
      .filter((e) => !texto || e.nombre.toLowerCase().includes(texto) || e.ci.includes(texto));
  });

  cursoDe(e: Estudiante): string {
    return this.cursoPorId().get(e.paraleloId) ?? '';
  }

  edadDe(e: Estudiante): number {
    return edad(e.fechaNacimiento, this.hoy);
  }

  // ---------- Formulario ----------
  readonly drawerAbierto = signal(false);
  readonly editando = signal<Estudiante | null>(null);
  readonly guardando = signal(false);
  readonly modelo = signal({ ...ESTUDIANTE_VACIO });
  readonly formulario = form(this.modelo, (s) => {
    required(s.nombre, { message: 'Escribe el nombre completo.' });
    maxLength(s.nombre, 80, { message: 'Máximo 80 caracteres.' });
    required(s.ci, { message: 'El CI es obligatorio.' });
    pattern(s.ci, PATRON_CI, { message: 'Solo números (con complemento opcional, ej. 9123456-1A).' });
    required(s.fechaNacimiento, { message: 'Indica la fecha de nacimiento.' });
    validate(s.fechaNacimiento, ({ value }) => {
      if (!value()) return undefined;
      const anios = edad(value(), this.hoy);
      return anios < 3 || anios > 25 ? { kind: 'edad', message: 'La edad debe estar entre 3 y 25 años.' } : undefined;
    });
  });

  // Un paralelo lleno solo se ofrece si es el curso actual del estudiante
  disponible(paraleloId: number, estudiantes: number, capacidad: number): boolean {
    return estudiantes < capacidad || this.editando()?.paraleloId === paraleloId;
  }

  nuevo(): void {
    this.editando.set(null);
    const curso = this.curso();
    this.abrir({ ...ESTUDIANTE_VACIO, paraleloId: curso !== 'todos' && curso !== SIN_CURSO ? curso : '0' });
  }

  editar(e: Estudiante): void {
    this.editando.set(e);
    this.abrir({ nombre: e.nombre, ci: e.ci, fechaNacimiento: e.fechaNacimiento, paraleloId: String(e.paraleloId) });
  }

  guardar(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        const m = this.modelo();
        await firstValueFrom(this.personas.guardarEstudiante({ ...m, paraleloId: Number(m.paraleloId), id: this.editando()?.id }));
        this.avisos.exito(this.editando() ? 'Estudiante actualizado.' : `${m.nombre.trim()} fue registrado.`);
        this.drawerAbierto.set(false);
        this.estudiantes.reload();
        this.paralelos.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  private abrir(valores: typeof ESTUDIANTE_VACIO): void {
    this.modelo.set(valores);
    this.formulario().reset();
    this.drawerAbierto.set(true);
  }
}
