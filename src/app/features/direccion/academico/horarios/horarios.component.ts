import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faGear, faMugHot, faPlus, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../../core/auth/session.service';
import {
  BloqueHorario,
  ClaseHorario,
  DIAS_SEMANA,
  NIVELES,
  Paralelo,
  TURNOS,
  Turno,
  compararParalelos,
  paraleloLabel,
} from '../../../../core/models/academico.model';
import { ContextoHorario, bloquesDelTurno, buscarChoques, docenteDe } from '../../../../core/utils/horario';
import { bloquesNecesarios, duracionLabel } from '../../../../core/utils/jornada';
import { AcademicoService } from '../../../../services/academico.service';
import { HorariosService } from '../../../../services/horarios.service';
import { AvisosService } from '../../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { iconoMateria, mensajeError } from '../academico.ui';

interface CeldaEditada {
  dia: number;
  bloque: BloqueHorario;
  clase: ClaseHorario | null;
}

@Component({
  selector: 'app-horarios',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, RouterLink, PageHeaderComponent, DrawerComponent, EmptyStateComponent],
  templateUrl: './horarios.component.html',
  styleUrls: ['./horarios.component.css'],
})
export class HorariosComponent {
  private academico = inject(AcademicoService);
  private horarios = inject(HorariosService);
  private avisos = inject(AvisosService);
  protected readonly session = inject(SessionService);
  private readonly espacioId = this.session.espacioActivo()!.id;

  readonly paraleloLabel = paraleloLabel;
  readonly iconoMateria = iconoMateria;
  readonly duracionLabel = duracionLabel;
  readonly faPlus = faPlus;
  readonly faGear = faGear;
  readonly faMugHot = faMugHot;
  readonly faCalendarDays = faCalendarDays;
  readonly faTriangleExclamation = faTriangleExclamation;

  readonly gestion = rxResource({ stream: () => this.academico.gestionActiva(this.espacioId) });
  readonly jornada = rxResource({ stream: () => this.horarios.jornada(this.espacioId) });
  readonly paralelos = rxResource({ stream: () => this.academico.paralelosActivos(this.espacioId), defaultValue: [] });
  readonly materias = rxResource({ stream: () => this.academico.materias(this.espacioId), defaultValue: [] });
  readonly docentes = rxResource({ stream: () => this.academico.docentes(this.espacioId), defaultValue: [] });
  readonly aulas = rxResource({ stream: () => this.academico.aulas(this.espacioId), defaultValue: [] });
  readonly asignaciones = rxResource({ stream: () => this.academico.asignacionesActivas(this.espacioId), defaultValue: [] });
  readonly clases = rxResource({ stream: () => this.horarios.clasesActivas(this.espacioId), defaultValue: [] });

  readonly seleccionadoId = linkedSignal<Paralelo[], number>({
    source: () => this.paralelos.value(),
    computation: (lista, previo) => (previo && lista.some((p) => p.id === previo.value) ? previo.value : [...lista].sort(compararParalelos)[0]?.id ?? 0),
  });
  readonly seleccionado = computed(() => this.paralelos.value().find((p) => p.id === this.seleccionadoId()) ?? null);

  // Datos para ubicar clases en el tiempo y detectar choques
  private readonly contexto = computed<ContextoHorario | null>(() => {
    const jornada = this.jornada.value();
    return jornada ? { jornada, paralelos: this.paralelos.value(), asignaciones: this.asignaciones.value(), clases: this.clases.value() } : null;
  });

  private readonly nombreDocente = computed(() => new Map(this.docentes.value().map((d) => [d.id, d.nombre])));
  private readonly nombreAula = computed(() => new Map(this.aulas.value().map((a) => [a.id, a.nombre])));
  private readonly materiaPorId = computed(() => new Map(this.materias.value().map((m) => [m.id, m])));

  readonly dias = computed(() => DIAS_SEMANA.filter((d) => this.jornada.value()?.dias.includes(d.id)));

  readonly bloques = computed(() => {
    const jornada = this.jornada.value();
    const p = this.seleccionado();
    return jornada && p ? bloquesDelTurno(jornada, p.turno) : [];
  });

  readonly periodosPorSemana = computed(() => this.bloques().filter((b) => b.tipo === 'clase').length * this.dias().length);

  // Clases del paralelo elegido indexadas por "día-periodo"
  readonly celdas = computed(() => {
    const p = this.seleccionado();
    const mapa = new Map<string, ClaseHorario>();
    for (const c of this.clases.value()) if (c.paraleloId === p?.id) mapa.set(`${c.dia}-${c.bloque}`, c);
    return mapa;
  });

  // Paralelos agrupados por nivel con sus periodos ocupados
  readonly grupos = computed(() => {
    const ocupados = new Map<number, number>();
    for (const c of this.clases.value()) ocupados.set(c.paraleloId, (ocupados.get(c.paraleloId) ?? 0) + 1);
    return NIVELES.map((n) => ({
      nivel: n.label,
      paralelos: this.paralelos.value().filter((p) => p.nivel === n.id).map((p) => ({ paralelo: p, ocupados: ocupados.get(p.id) ?? 0 })),
    })).filter((g) => g.paralelos.length);
  });

  // Avance de cada materia del nivel: periodos asignados vs. necesarios según sus horas semanales
  readonly cobertura = computed(() => {
    const p = this.seleccionado();
    const jornada = this.jornada.value();
    if (!p || !jornada) return [];
    const usados = new Map<number, number>();
    for (const c of this.celdas().values()) usados.set(c.materiaId, (usados.get(c.materiaId) ?? 0) + 1);
    return this.materias.value()
      .filter((m) => m.nivel === p.nivel)
      .map((m) => ({
        materia: m,
        docente: this.nombreDocente().get(docenteDe(this.asignaciones.value(), p.id, m.id)) ?? '',
        usados: usados.get(m.id) ?? 0,
        necesarios: bloquesNecesarios(m.horasSemanales, jornada.duracionPeriodoMin),
      }))
      .sort((a, b) => a.usados / a.necesarios - b.usados / b.necesarios);
  });

  readonly necesariosTotal = computed(() => this.cobertura().reduce((s, c) => s + c.necesarios, 0));

  // ---------- Edición de una celda ----------
  readonly editando = signal<CeldaEditada | null>(null);
  readonly guardando = signal(false);
  readonly modelo = signal({ materiaId: '', aulaId: '0' });
  readonly formulario = form(this.modelo, (s) => {
    required(s.materiaId, { message: 'Elige la materia de este periodo.' });
  });

  readonly materiasDelNivel = computed(() => this.materias.value().filter((m) => m.nivel === this.seleccionado()?.nivel));
  readonly aulasActivas = computed(() => this.aulas.value().filter((a) => a.activa));

  readonly docenteElegido = computed(() => {
    const p = this.seleccionado();
    const materiaId = Number(this.modelo().materiaId);
    return p && materiaId ? this.nombreDocente().get(docenteDe(this.asignaciones.value(), p.id, materiaId)) ?? null : null;
  });

  // Choques de la clase que se está editando, en vivo
  readonly choques = computed(() => {
    const ctx = this.contexto();
    const celda = this.editando();
    const p = this.seleccionado();
    const { materiaId, aulaId } = this.modelo();
    if (!ctx || !celda || !p || !materiaId) return [];
    return buscarChoques(ctx, {
      id: celda.clase?.id, paraleloId: p.id, dia: celda.dia, bloque: celda.bloque.indice, materiaId: Number(materiaId), aulaId: Number(aulaId),
    }).map((c) => {
      const otro = this.paralelos.value().find((x) => x.id === c.conParaleloId);
      const donde = otro ? paraleloLabel(otro) : 'otro paralelo';
      return c.tipo === 'docente'
        ? `${this.nombreDocente().get(c.docenteId!) ?? 'El docente'} ya tiene clase con ${donde} de ${c.inicio} a ${c.fin}.`
        : `${this.nombreAula().get(c.aulaId!) ?? 'El aula'} está ocupada por ${donde} de ${c.inicio} a ${c.fin}.`;
    });
  });

  abrirCelda(dia: number, bloque: BloqueHorario): void {
    const p = this.seleccionado();
    if (!p) return;
    const clase = this.celdas().get(`${dia}-${bloque.indice}`) ?? null;
    this.editando.set({ dia, bloque, clase });
    this.modelo.set({ materiaId: clase ? String(clase.materiaId) : '', aulaId: String(clase ? clase.aulaId : p.aulaId) });
    this.formulario().reset();
  }

  guardar(): void {
    const celda = this.editando();
    const p = this.seleccionado();
    const gestion = this.gestion.value();
    if (!celda || !p || !gestion || this.choques().length) return;
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        await firstValueFrom(this.horarios.guardarClase({
          espacioId: this.espacioId,
          gestionId: gestion.id,
          paraleloId: p.id,
          dia: celda.dia,
          bloque: celda.bloque.indice,
          materiaId: Number(this.modelo().materiaId),
          aulaId: Number(this.modelo().aulaId),
        }));
        this.avisos.exito('Clase guardada en el horario.');
        this.editando.set(null);
        this.clases.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  async quitar(): Promise<void> {
    const clase = this.editando()?.clase;
    if (!clase) return;
    try {
      await firstValueFrom(this.horarios.eliminarClase(clase.id));
      this.avisos.exito('Clase quitada del horario.');
      this.editando.set(null);
      this.clases.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  // ---------- Presentación ----------
  materia(id: number) {
    return this.materiaPorId().get(id);
  }

  docenteCorto(clase: ClaseHorario): string {
    const nombre = this.nombreDocente().get(docenteDe(this.asignaciones.value(), clase.paraleloId, clase.materiaId));
    return nombre ? nombre.split(' ').slice(0, 2).map((p, i) => (i ? `${p.charAt(0)}.` : p)).join(' ') : 'Sin docente';
  }

  aulaDistinta(clase: ClaseHorario): string | null {
    const p = this.seleccionado();
    return p && clase.aulaId && clase.aulaId !== p.aulaId ? this.nombreAula().get(clase.aulaId) ?? null : null;
  }

  turnoLabel(turno: Turno): string {
    return TURNOS.find((t) => t.id === turno)?.label ?? turno;
  }

  diaLargo(dia: number): string {
    return DIAS_SEMANA.find((d) => d.id === dia)?.largo ?? '';
  }

  aulaFija(p: Paralelo): string {
    return p.aulaId ? this.nombreAula().get(p.aulaId) ?? 'Sin aula fija' : 'Sin aula fija';
  }
}
