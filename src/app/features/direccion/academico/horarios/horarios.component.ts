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
import {
  ContextoHorario,
  DatosHorario,
  ItemVista,
  bloquesDelTurno,
  buscarChoques,
  clasesDeDocente,
  docenteDe,
  filasParaTurnos,
  itemsDeClases,
  turnosDeClases,
} from '../../../../core/utils/horario';
import { HorarioSemanalComponent } from '../../../../shared/horario/horario-semanal.component';
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
  imports: [FaIconComponent, FormField, RouterLink, PageHeaderComponent, DrawerComponent, EmptyStateComponent, HorarioSemanalComponent],
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

  // ---------- Vistas por docente y por aula (solo lectura) ----------
  readonly vista = signal<'paralelo' | 'docente' | 'aula'>('paralelo');

  private readonly datosHorario = computed<DatosHorario | null>(() => {
    const ctx = this.contexto();
    return ctx ? { ...ctx, materias: this.materias.value(), docentes: this.docentes.value(), aulas: this.aulas.value() } : null;
  });

  // Docentes y aulas con la cantidad de clases que tienen en la semana
  readonly listaDocentes = computed(() => {
    const datos = this.datosHorario();
    return this.docentes.value()
      .map((d) => ({ id: d.id, nombre: d.nombre, detalle: d.especialidad, clases: datos ? clasesDeDocente(datos, d.id).length : 0 }))
      .sort((a, b) => b.clases - a.clases || a.nombre.localeCompare(b.nombre));
  });

  readonly listaAulas = computed(() => {
    const usadas = new Map<number, number>();
    for (const c of this.clases.value()) usadas.set(c.aulaId, (usadas.get(c.aulaId) ?? 0) + 1);
    return this.aulasActivas()
      .map((a) => ({ id: a.id, nombre: a.nombre, detalle: `${a.capacidad} personas`, clases: usadas.get(a.id) ?? 0 }))
      .sort((a, b) => b.clases - a.clases || a.nombre.localeCompare(b.nombre));
  });

  readonly docenteId = linkedSignal(() => this.listaDocentes()[0]?.id ?? 0);
  readonly aulaId = linkedSignal(() => this.listaAulas()[0]?.id ?? 0);

  // Clases, filas y celdas de la vista elegida
  readonly vistaLectura = computed(() => {
    const datos = this.datosHorario();
    const modo = this.vista();
    if (!datos || modo === 'paralelo') return { filas: [], items: [] as ItemVista[] };
    const clases = modo === 'docente' ? clasesDeDocente(datos, this.docenteId()) : datos.clases.filter((c) => c.aulaId === this.aulaId());
    const turnos = turnosDeClases(datos, clases);
    return { filas: filasParaTurnos(datos.jornada, turnos.length ? turnos : ['manana']), items: itemsDeClases(datos, clases, modo) };
  });

  // Desde una vista de lectura, abre el horario editable del paralelo de esa clase
  irAParalelo(item: ItemVista): void {
    this.seleccionadoId.set(item.paraleloId);
    this.vista.set('paralelo');
  }

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
