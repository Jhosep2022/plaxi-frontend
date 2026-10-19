import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLock, faPen, faPlus, faStar, faTrash } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { paraleloLabel } from '../../../core/models/academico.model';
import { Actividad } from '../../../core/models/calificaciones.model';
import { fechaCorta, hoyIso } from '../../../core/utils/asistencia';
import { ResultadoMateria, aprobado, calcularNota, periodoDeFecha } from '../../../core/utils/calificaciones';
import { AcademicoService } from '../../../services/academico.service';
import { CalificacionesService, CambioNota } from '../../../services/calificaciones.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { iconoMateria } from '../../../shared/ui/iconos-academicos';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../../direccion/academico/academico.ui';

const clave = (actividadId: number, estudianteId: number) => `${actividadId}-${estudianteId}`;

// Planilla de notas del docente: actividades por criterio, notas por estudiante y promedios en vivo
@Component({
  selector: 'app-registrar-notas',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, PageHeaderComponent, EmptyStateComponent, DrawerComponent],
  templateUrl: './registrar-notas.component.html',
  styleUrls: ['./registrar-notas.component.css'],
})
export class RegistrarNotasComponent {
  private session = inject(SessionService);
  private academico = inject(AcademicoService);
  private calificaciones = inject(CalificacionesService);
  private avisos = inject(AvisosService);

  readonly faLock = faLock;
  readonly faPen = faPen;
  readonly faPlus = faPlus;
  readonly faStar = faStar;
  readonly faTrash = faTrash;
  readonly iconoMateria = iconoMateria;
  readonly fechaCorta = fechaCorta;
  readonly paraleloLabel = paraleloLabel;

  readonly espacio = this.session.espacioActivo()!;
  private readonly docenteId = this.session.usuarioId()!;

  // Clases del docente (materia + paralelo) en la gestión activa
  readonly clases = rxResource({
    stream: () =>
      this.espacio.tipo !== 'colegio'
        ? of(null)
        : forkJoin({
            gestion: this.academico.gestionActiva(this.espacio.id),
            asignaciones: this.academico.asignacionesActivas(this.espacio.id),
            paralelos: this.academico.paralelosActivos(this.espacio.id),
            materias: this.academico.materias(this.espacio.id),
          }),
  });

  readonly misClases = computed(() => {
    const d = this.clases.value();
    if (!d) return [];
    return d.asignaciones
      .filter((a) => a.docenteId === this.docenteId)
      .map((a) => ({ asignacion: a, paralelo: d.paralelos.find((p) => p.id === a.paraleloId)!, materia: d.materias.find((m) => m.id === a.materiaId)! }))
      .filter((c) => c.paralelo && c.materia)
      .sort((a, b) => a.materia.nombre.localeCompare(b.materia.nombre) || paraleloLabel(a.paralelo).localeCompare(paraleloLabel(b.paralelo)));
  });

  readonly seleccionadaId = linkedSignal(() => this.misClases()[0]?.asignacion.id ?? 0);
  readonly seleccionada = computed(() => this.misClases().find((c) => c.asignacion.id === this.seleccionadaId()) ?? null);

  readonly gestion = computed(() => this.clases.value()?.gestion);
  readonly periodo = linkedSignal(() => {
    const g = this.gestion();
    return g ? periodoDeFecha(g, hoyIso()) : 0;
  });

  // Notas, actividades y estudiantes del paralelo elegido
  readonly datos = rxResource({
    params: () => this.seleccionada()?.paralelo.id ?? 0,
    stream: ({ params }) => (params ? this.calificaciones.datosDeParalelo(this.espacio.id, params) : of(null)),
  });

  readonly config = computed(() => this.datos.value()?.config);
  readonly cerrado = computed(() => !!this.datos.value()?.cierres.some((c) => c.periodo === this.periodo()));
  readonly periodoCerrado = (i: number) => !!this.datos.value()?.cierres.some((c) => c.periodo === i);

  readonly actividades = computed(() => {
    const d = this.datos.value();
    const s = this.seleccionada();
    if (!d || !s) return [];
    return d.actividades.filter((a) => a.materiaId === s.materia.id && a.periodo === this.periodo());
  });

  // Columnas de la planilla agrupadas por criterio
  readonly grupos = computed(() => (this.config()?.criterios ?? []).map((criterio) => ({ criterio, actividades: this.actividades().filter((a) => a.criterioId === criterio.id) })));

  // ---------- Notas editables ----------
  private readonly guardadas = computed(() => new Map((this.datos.value()?.notas ?? []).map((n) => [clave(n.actividadId, n.estudianteId), n.valor])));

  // Lo que el docente escribió y aún no guardó (se vacía al recargar los datos)
  readonly cambios = linkedSignal<Map<string, string>>(() => {
    this.datos.value();
    return new Map();
  });

  texto(actividadId: number, estudianteId: number): string {
    const k = clave(actividadId, estudianteId);
    return this.cambios().get(k) ?? this.guardadas().get(k)?.toString() ?? '';
  }

  escribir(actividadId: number, estudianteId: number, valor: string): void {
    this.cambios.update((m) => new Map(m).set(clave(actividadId, estudianteId), valor.trim()));
  }

  invalida(texto: string): boolean {
    if (texto === '') return false;
    const n = Number(texto);
    return !Number.isFinite(n) || n < 0 || n > (this.config()?.notaMaxima ?? 100);
  }

  readonly pendientes = computed(() => {
    const lista: CambioNota[] = [];
    for (const [k, texto] of this.cambios()) {
      const [actividadId, estudianteId] = k.split('-').map(Number);
      const previa = this.guardadas().get(k);
      const valor = texto === '' ? null : Number(texto);
      if (valor !== (previa ?? null)) lista.push({ actividadId, estudianteId, valor });
    }
    return lista;
  });

  readonly hayErrores = computed(() => [...this.cambios().values()].some((t) => this.invalida(t)));

  // Resultado de cada estudiante con lo que se ve en pantalla (incluye cambios sin guardar)
  readonly resultados = computed(() => {
    const d = this.datos.value();
    const config = this.config();
    const resultados = new Map<number, ResultadoMateria>();
    if (!d || !config) return resultados;
    const buscar = (actividadId: number, estudianteId: number) => {
      const t = this.texto(actividadId, estudianteId);
      return t === '' || this.invalida(t) ? undefined : Number(t);
    };
    for (const e of d.estudiantes) resultados.set(e.id, calcularNota(config.criterios, this.actividades(), buscar, e.id));
    return resultados;
  });

  readonly resumen = computed(() => {
    const config = this.config();
    const finales = [...this.resultados().values()].map((r) => r.final).filter((f): f is number => f !== null);
    const aprobados = config ? finales.filter((f) => aprobado(config, f)).length : 0;
    return {
      promedio: finales.length ? Math.round(finales.reduce((s, f) => s + f, 0) / finales.length) : null,
      aprobados,
      reprobados: finales.length - aprobados,
    };
  });

  aprueba(nota: number): boolean {
    return !!this.config() && aprobado(this.config()!, nota);
  }

  readonly guardando = signal(false);

  async guardar(): Promise<void> {
    if (this.hayErrores() || !this.pendientes().length) return;
    this.guardando.set(true);
    try {
      const n = await firstValueFrom(this.calificaciones.guardarNotas(this.espacio.id, this.pendientes()));
      this.avisos.exito(`${n} ${n === 1 ? 'nota guardada' : 'notas guardadas'}.`);
      this.datos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  // ---------- Actividades ----------
  readonly drawerAbierto = signal(false);
  readonly editando = signal<Actividad | null>(null);
  readonly modelo = signal({ nombre: '', criterioId: '', fecha: '' });
  readonly formulario = form(this.modelo, (s) => {
    required(s.nombre, { message: 'Ponle un nombre a la actividad.' });
    required(s.criterioId, { message: 'Elige el criterio que evalúa.' });
    required(s.fecha, { message: 'Elige la fecha.' });
    validate(s.fecha, ({ value }) => {
      const p = this.gestion()?.periodos[this.periodo()];
      return p && value() && (value() < p.inicio || value() > p.fin)
        ? { kind: 'periodo', message: `Debe estar dentro del ${p.nombre} (${fechaCorta(p.inicio)} – ${fechaCorta(p.fin)}).` }
        : undefined;
    });
  });

  nuevaActividad(): void {
    const p = this.gestion()?.periodos[this.periodo()];
    const hoy = hoyIso();
    this.editando.set(null);
    this.modelo.set({ nombre: '', criterioId: '', fecha: p && hoy >= p.inicio && hoy <= p.fin ? hoy : (p?.inicio ?? hoy) });
    this.formulario().reset();
    this.drawerAbierto.set(true);
  }

  editarActividad(a: Actividad): void {
    this.editando.set(a);
    this.modelo.set({ nombre: a.nombre, criterioId: String(a.criterioId), fecha: a.fecha });
    this.formulario().reset();
    this.drawerAbierto.set(true);
  }

  guardarActividad(): void {
    const s = this.seleccionada();
    const g = this.gestion();
    if (!s || !g) return;
    submit(this.formulario, async () => {
      try {
        const m = this.modelo();
        await firstValueFrom(this.calificaciones.guardarActividad({
          id: this.editando()?.id,
          espacioId: this.espacio.id,
          gestionId: g.id,
          periodo: this.periodo(),
          paraleloId: s.paralelo.id,
          materiaId: s.materia.id,
          criterioId: Number(m.criterioId),
          nombre: m.nombre,
          fecha: m.fecha,
          docenteId: this.docenteId,
        }));
        this.avisos.exito(this.editando() ? 'Actividad actualizada.' : `"${m.nombre.trim()}" agregada a la planilla.`);
        this.drawerAbierto.set(false);
        this.datos.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      }
    });
  }

  async eliminarActividad(a: Actividad): Promise<void> {
    if (!confirm(`¿Eliminar "${a.nombre}"? También se borrarán sus notas.`)) return;
    try {
      await firstValueFrom(this.calificaciones.eliminarActividad(a));
      this.avisos.exito('Actividad eliminada.');
      this.datos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  cambiarClase(id: number): void {
    if (this.pendientes().length && !confirm('Tienes notas sin guardar. ¿Cambiar de clase y descartarlas?')) return;
    this.seleccionadaId.set(id);
  }

  cambiarPeriodo(i: number): void {
    if (this.pendientes().length && !confirm('Tienes notas sin guardar. ¿Cambiar de periodo y descartarlas?')) return;
    this.cambios.set(new Map());
    this.periodo.set(i);
  }
}
