import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClipboardCheck, faClock, faPlus, faStar, faTasks, faTrash } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { hoyIso } from '../../../core/utils/asistencia';
import { porcentaje } from '../../../core/utils/reportes';
import { urgente, vencida, venceLabel } from '../../../core/utils/tareas';
import { AulasService } from '../../../services/aulas.service';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { TareaDocente, TareasService } from '../../../services/tareas.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { iconoMateria } from '../../../shared/ui/iconos-academicos';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../../direccion/academico/academico.ui';

type Filtro = 'activas' | 'por-revisar' | 'todas';

const NUEVA = { clase: '', titulo: '', instrucciones: '', entrega: '', hora: '23:59', criterioId: '0' };

// Tareas del docente: lista por estado, creación (opcionalmente con nota en la planilla) y acceso a la revisión
@Component({
  selector: 'app-tareas-docente',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, RouterLink, PageHeaderComponent, DrawerComponent, EmptyStateComponent],
  templateUrl: './tareas-docente.component.html',
  styleUrls: ['./tareas-docente.component.css'],
})
export class TareasDocenteComponent {
  private session = inject(SessionService);
  private servicio = inject(TareasService);
  private aulas = inject(AulasService);
  private calificaciones = inject(CalificacionesService);
  private avisos = inject(AvisosService);

  readonly iconoMateria = iconoMateria;
  readonly venceLabel = venceLabel;
  readonly vencida = vencida;
  readonly urgente = urgente;
  readonly porcentaje = porcentaje;
  readonly faClipboardCheck = faClipboardCheck;
  readonly faClock = faClock;
  readonly faPlus = faPlus;
  readonly faStar = faStar;
  readonly faTasks = faTasks;
  readonly faTrash = faTrash;

  readonly espacio = this.session.espacioActivo()!;
  private readonly espacioId = this.espacio.id;
  private readonly docenteId = this.session.usuarioId()!;
  readonly hoy = hoyIso();

  readonly tareas = rxResource({ stream: () => this.servicio.tareasDocente(this.espacioId, this.docenteId), defaultValue: [] });

  // Aulas del docente (clases del colegio o cursos de la academia) y criterios de la planilla (solo colegio)
  readonly datos = rxResource({
    stream: () =>
      forkJoin({
        aulas: this.aulas.aulasDocente(this.espacioId, this.docenteId),
        config: this.calificaciones.config(this.espacioId, this.espacio.tipo),
      }),
  });
  readonly clases = computed(() =>
    (this.datos.value()?.aulas ?? [])
      .map((a) => ({ valor: String(a.id), label: a.nombre, tipo: a.tipo }))
      .sort((a, b) => a.label.localeCompare(b.label))
  );
  readonly criterios = computed(() => (this.espacio.tipo === 'colegio' ? this.datos.value()?.config.criterios ?? [] : []));

  readonly filtro = signal<Filtro>('activas');
  readonly clase = input<string>(); // ?clase=aulaId (desde el aula)
  readonly claseFiltro = linkedSignal(() => this.clase() ?? '');
  readonly conteo = computed(() => ({
    activas: this.tareas.value().filter((t) => !vencida(t)).length,
    porRevisar: this.tareas.value().filter((t) => t.porRevisar > 0).length,
    todas: this.tareas.value().length,
    entregasPorRevisar: this.tareas.value().reduce((s, t) => s + t.porRevisar, 0),
  }));
  readonly visibles = computed(() =>
    this.tareas.value()
      .filter((t) => !this.claseFiltro() || String(t.aulaId) === this.claseFiltro())
      .filter((t) => this.filtro() === 'todas' || (this.filtro() === 'activas' ? !vencida(t) : t.porRevisar > 0))
  );

  ruta(...segmentos: (string | number)[]) {
    return this.session.rutaRol(...segmentos);
  }

  // ---------- Nueva tarea ----------
  readonly creando = signal(false);
  readonly guardando = signal(false);
  readonly modelo = signal({ ...NUEVA });
  readonly formulario = form(this.modelo, (s) => {
    required(s.clase, { message: 'Elige la clase.' });
    required(s.titulo, { message: 'Ponle un título.' });
    maxLength(s.titulo, 100, { message: 'Máximo 100 caracteres.' });
    required(s.entrega, { message: 'Elige la fecha de entrega.' });
    validate(s.entrega, ({ value }) => (value() && value() < this.hoy ? { kind: 'pasado', message: 'No puede ser una fecha pasada.' } : undefined));
    required(s.hora, { message: 'Indica la hora límite.' });
  });

  // Las tareas de los cursos de la academia no van a una planilla de notas
  readonly cuentaParaNota = computed(() => this.clases().find((c) => c.valor === this.modelo().clase)?.tipo === 'clase' && this.criterios().length > 0);

  nueva(): void {
    this.modelo.set({ ...NUEVA, clase: this.claseFiltro() || (this.clases()[0]?.valor ?? '') });
    this.formulario().reset();
    this.creando.set(true);
  }

  crear(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        const m = this.modelo();
        const criterioId = this.cuentaParaNota() ? Number(m.criterioId) : 0;
        await firstValueFrom(this.servicio.crear(this.espacioId, this.docenteId, { aulaId: Number(m.clase), titulo: m.titulo, instrucciones: m.instrucciones, entrega: m.entrega, hora: m.hora }, criterioId));
        this.avisos.exito(criterioId ? 'Tarea asignada y agregada a la planilla de notas.' : 'Tarea asignada.');
        this.creando.set(false);
        this.filtro.set('activas');
        this.tareas.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  async eliminar(t: TareaDocente): Promise<void> {
    const aviso = t.entregadas ? ` Se perderán ${t.entregadas} entregas.` : '';
    if (!confirm(`¿Eliminar la tarea "${t.titulo}"?${aviso}`)) return;
    try {
      await firstValueFrom(this.servicio.eliminar(t));
      this.avisos.exito('Tarea eliminada.');
      this.tareas.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }
}
