import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Asignacion, Docente, Gestion, Materia, Paralelo } from '../core/models/academico.model';
import { Estudiante } from '../core/models/asistencia.model';
import { Actividad, CierrePeriodo, ConfigCalificacion, Nota, configPorDefecto } from '../core/models/calificaciones.model';
import { TipoEspacio } from '../core/models/espacio.model';
import { hoyIso } from '../core/utils/asistencia';
import { MOCK_ASIGNACIONES } from '../mocks/academico.mock';
import { MOCK_ESTUDIANTES } from '../mocks/asistencia.mock';
import { MOCK_ACTIVIDADES, MOCK_CIERRES, MOCK_CONFIG_CALIFICACIONES, MOCK_NOTAS } from '../mocks/calificaciones.mock';
import { AcademicoService } from './academico.service';
import { AsistenciaService } from './asistencia.service';
import { RepositorioMock } from './repositorio-mock';

// Todo lo necesario para calcular las notas de un paralelo en la gestión activa
export interface DatosParalelo {
  config: ConfigCalificacion;
  gestion: Gestion;
  paralelo: Paralelo;
  materias: Materia[]; // las que tienen docente asignado en el paralelo
  asignaciones: Asignacion[];
  docentes: Docente[];
  estudiantes: Estudiante[];
  actividades: Actividad[];
  notas: Nota[];
  cierres: CierrePeriodo[];
}

export interface CambioNota {
  actividadId: number;
  estudianteId: number;
  valor: number | null; // null = borrar la nota
}

export interface ProgresoPeriodo {
  actividades: number;
  notasCargadas: number;
  notasEsperadas: number;
  materiasSinActividades: number;
}

// Escala y ponderación, actividades, notas y cierre de periodos.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class CalificacionesService {
  private academico = inject(AcademicoService);
  private asistencia = inject(AsistenciaService);

  private configRepo = new RepositorioMock<ConfigCalificacion>(MOCK_CONFIG_CALIFICACIONES);
  private actividadesRepo = new RepositorioMock<Actividad>(MOCK_ACTIVIDADES);
  private notasRepo = new RepositorioMock<Nota>(MOCK_NOTAS);
  private cierresRepo = new RepositorioMock<CierrePeriodo>(MOCK_CIERRES);

  // ---------- Escala y ponderación ----------
  config(espacioId: number, tipo: TipoEspacio = 'colegio'): Observable<ConfigCalificacion> {
    return this.configRepo.listar((c) => c.id === espacioId).pipe(map(([c]) => c ?? configPorDefecto(espacioId, tipo)));
  }

  guardarConfig(config: ConfigCalificacion): Observable<ConfigCalificacion> {
    const suma = config.criterios.reduce((s, c) => s + c.porcentaje, 0);
    if (suma !== 100) return throwError(() => new Error(`Los pesos deben sumar 100% (ahora suman ${suma}%).`));
    if (config.notaAprobacion <= 0 || config.notaAprobacion > config.notaMaxima) {
      return throwError(() => new Error('La nota de aprobación debe estar entre 1 y la nota máxima.'));
    }
    const nombres = config.criterios.map((c) => c.nombre.trim().toLowerCase());
    if (new Set(nombres).size !== nombres.length) return throwError(() => new Error('Hay dos criterios con el mismo nombre.'));

    const actual = this.configRepo.ahora((c) => c.id === config.id)[0];
    const actividades = this.actividadesRepo.ahora((a) => a.espacioId === config.id);
    if (actual && actual.notaMaxima !== config.notaMaxima && actividades.length) {
      return throwError(() => new Error(`Ya hay notas registradas sobre ${actual.notaMaxima}. La nota máxima se puede cambiar al iniciar una nueva gestión.`));
    }
    const quitado = actual?.criterios.find((c) => !config.criterios.some((n) => n.id === c.id) && actividades.some((a) => a.criterioId === c.id));
    if (quitado) return throwError(() => new Error(`"${quitado.nombre}" tiene actividades registradas; no se puede quitar.`));

    // Los criterios nuevos (id 0) reciben un id propio
    let siguiente = Math.max(0, ...config.criterios.map((c) => c.id), ...(actual?.criterios.map((c) => c.id) ?? [])) + 1;
    const criterios = config.criterios.map((c) => ({ ...c, nombre: c.nombre.trim(), id: c.id || siguiente++ }));
    return this.configRepo.guardar({ ...config, criterios });
  }

  // ---------- Cierre de periodos ----------
  cierres(espacioId: number, gestionId: number): Observable<CierrePeriodo[]> {
    return this.cierresRepo.listar((c) => c.espacioId === espacioId && c.gestionId === gestionId);
  }

  cerrarPeriodo(espacioId: number, gestion: Gestion, periodo: number): Observable<CierrePeriodo> {
    if (gestion.periodos[periodo].inicio > hoyIso()) return throwError(() => new Error('No se puede cerrar un periodo que todavía no empezó.'));
    if (this.estaCerrado(gestion.id, periodo)) return throwError(() => new Error('El periodo ya está cerrado.'));
    return this.cierresRepo.guardar({ espacioId, gestionId: gestion.id, periodo, cerradoEl: hoyIso() });
  }

  reabrirPeriodo(cierre: CierrePeriodo): Observable<void> {
    return this.cierresRepo.eliminar(cierre.id);
  }

  // Avance de la carga de notas de cada periodo (para decidir si se puede cerrar)
  progreso(espacioId: number, gestion: Gestion): Observable<ProgresoPeriodo[]> {
    const asignaciones = MOCK_ASIGNACIONES.filter((a) => a.espacioId === espacioId && a.gestionId === gestion.id);
    const alumnos = (paraleloId: number) => MOCK_ESTUDIANTES.filter((e) => e.paraleloId === paraleloId).length;
    const progreso = gestion.periodos.map((_, periodo) => {
      const actividades = this.actividadesRepo.ahora((a) => a.gestionId === gestion.id && a.periodo === periodo);
      const ids = new Set(actividades.map((a) => a.id));
      return {
        actividades: actividades.length,
        notasCargadas: this.notasRepo.ahora((n) => ids.has(n.actividadId)).length,
        notasEsperadas: actividades.reduce((s, a) => s + alumnos(a.paraleloId), 0),
        materiasSinActividades: asignaciones.filter((asig) => !actividades.some((a) => a.paraleloId === asig.paraleloId && a.materiaId === asig.materiaId)).length,
      };
    });
    return of(progreso);
  }

  // ---------- Actividades ----------
  guardarActividad(actividad: Omit<Actividad, 'id'> & { id?: number }): Observable<Actividad> {
    if (this.estaCerrado(actividad.gestionId, actividad.periodo)) return throwError(() => new Error('El periodo está cerrado: ya no se pueden modificar sus actividades.'));
    if (!actividad.nombre.trim()) return throwError(() => new Error('La actividad necesita un nombre.'));
    return this.actividadesRepo.guardar({ ...actividad, nombre: actividad.nombre.trim() });
  }

  // Elimina la actividad y sus notas
  eliminarActividad(actividad: Actividad): Observable<void> {
    if (this.estaCerrado(actividad.gestionId, actividad.periodo)) return throwError(() => new Error('El periodo está cerrado: ya no se pueden modificar sus actividades.'));
    for (const nota of this.notasRepo.ahora((n) => n.actividadId === actividad.id)) this.notasRepo.eliminar(nota.id).subscribe();
    return this.actividadesRepo.eliminar(actividad.id);
  }

  // ---------- Notas ----------
  notasDeActividad(actividadId: number): Observable<Nota[]> {
    return this.notasRepo.listar((n) => n.actividadId === actividadId);
  }

  notasDeEstudiante(estudianteId: number): Observable<Nota[]> {
    return this.notasRepo.listar((n) => n.estudianteId === estudianteId);
  }

  // Actividad por id (lectura síncrona para otros servicios mock)
  actividad(actividadId: number): Actividad | undefined {
    return this.actividadesRepo.ahora((a) => a.id === actividadId)[0];
  }

  // ¿El periodo de esta actividad está cerrado? (lectura síncrona para otros servicios mock)
  actividadCerrada(actividadId: number): boolean {
    const act = this.actividadesRepo.ahora((a) => a.id === actividadId)[0];
    return !!act && this.estaCerrado(act.gestionId, act.periodo);
  }

  guardarNotas(espacioId: number, cambios: CambioNota[]): Observable<number> {
    const config = this.configRepo.ahora((c) => c.id === espacioId)[0];
    const maxima = config?.notaMaxima ?? 100;
    const actividades = new Map(this.actividadesRepo.ahora().map((a) => [a.id, a]));
    for (const c of cambios) {
      const act = actividades.get(c.actividadId);
      if (!act) return throwError(() => new Error('La actividad ya no existe.'));
      if (this.estaCerrado(act.gestionId, act.periodo)) return throwError(() => new Error('El periodo está cerrado: las notas ya no se pueden modificar.'));
      if (c.valor !== null && (c.valor < 0 || c.valor > maxima)) return throwError(() => new Error(`Las notas deben estar entre 0 y ${maxima}.`));
    }
    for (const c of cambios) {
      const previa = this.notasRepo.ahora((n) => n.actividadId === c.actividadId && n.estudianteId === c.estudianteId)[0];
      if (c.valor === null) {
        if (previa) this.notasRepo.eliminar(previa.id).subscribe();
      } else {
        this.notasRepo.guardar({ id: previa?.id, actividadId: c.actividadId, estudianteId: c.estudianteId, valor: c.valor }).subscribe();
      }
    }
    return this.notasRepo.listar(() => false).pipe(map(() => cambios.length));
  }

  // ---------- Datos completos de un paralelo ----------
  datosDeParalelo(espacioId: number, paraleloId: number): Observable<DatosParalelo | null> {
    return this.academico.gestionActiva(espacioId).pipe(
      switchMap((gestion) => {
        if (!gestion) return of(null);
        return forkJoin({
          config: this.config(espacioId),
          paralelos: this.academico.paralelos(espacioId, gestion.id),
          materias: this.academico.materias(espacioId),
          asignaciones: this.academico.asignaciones(espacioId, gestion.id),
          docentes: this.academico.docentes(espacioId),
          estudiantes: this.asistencia.estudiantesDeParalelo(paraleloId),
          actividades: this.actividadesRepo.listar((a) => a.gestionId === gestion.id && a.paraleloId === paraleloId),
          cierres: this.cierres(espacioId, gestion.id),
        }).pipe(
          switchMap((d) => {
            const paralelo = d.paralelos.find((p) => p.id === paraleloId);
            if (!paralelo) return of(null);
            const ids = new Set(d.actividades.map((a) => a.id));
            const asignaciones = d.asignaciones.filter((a) => a.paraleloId === paraleloId);
            return this.notasRepo.listar((n) => ids.has(n.actividadId)).pipe(
              map((notas): DatosParalelo => ({
                ...d,
                gestion,
                paralelo,
                asignaciones,
                materias: d.materias.filter((m) => asignaciones.some((a) => a.materiaId === m.id)),
                actividades: d.actividades.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id),
                notas,
              }))
            );
          })
        );
      })
    );
  }

  private estaCerrado(gestionId: number, periodo: number): boolean {
    return this.cierresRepo.ahora((c) => c.gestionId === gestionId && c.periodo === periodo).length > 0;
  }
}
