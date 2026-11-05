import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ClaseHorario, ConfigJornada, paraleloLabel } from '../core/models/academics.model';
import { ContextoHorario, DatosHorario, buscarChoques, clasesFueraDeJornada } from '../core/utils/schedule';
import { MOCK_ASIGNACIONES, MOCK_CLASES, MOCK_DOCENTES, MOCK_JORNADAS, MOCK_PARALELOS } from '../mocks/academics.mock';
import { AcademicsService } from './academics.service';
import { MockRepository } from './mock-repository';

// Jornada escolar (configuración de horarios) y horario semanal de cada paralelo.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class SchedulesService {
  private academico = inject(AcademicsService);
  private jornadasRepo = new MockRepository<ConfigJornada & { id: number }>(MOCK_JORNADAS);
  private clasesRepo = new MockRepository<ClaseHorario>(MOCK_CLASES);

  // ---------- Jornada ----------
  jornada(espacioId: number): Observable<ConfigJornada> {
    return this.jornadasRepo.list((j) => j.espacioId === espacioId).pipe(
      map(([j]) => j ?? { espacioId, duracionPeriodoMin: 90, dias: [1, 2, 3, 4, 5], turnos: [] })
    );
  }

  // Clases que quedarían fuera del horario con la nueva configuración
  clasesAfectadas(jornada: ConfigJornada): number {
    return clasesFueraDeJornada(this.contexto(jornada)).length;
  }

  // Guarda la jornada y quita las clases que ya no caben en ella
  guardarJornada(jornada: ConfigJornada): Observable<{ quitadas: number }> {
    const fuera = clasesFueraDeJornada(this.contexto(jornada));
    for (const clase of fuera) this.clasesRepo.delete(clase.id).subscribe();
    return this.jornadasRepo.save({ ...jornada, id: jornada.espacioId }).pipe(map(() => ({ quitadas: fuera.length })));
  }

  // ---------- Clases ----------
  clasesActivas(espacioId: number): Observable<ClaseHorario[]> {
    return this.academico.gestionActiva(espacioId).pipe(
      switchMap((g) => (g ? this.clasesRepo.list((c) => c.espacioId === espacioId && c.gestionId === g.id) : of([])))
    );
  }

  // Crea o reemplaza la clase de un paralelo en un día y periodo; rechaza choques de docente o aula
  guardarClase(clase: Omit<ClaseHorario, 'id'>): Observable<ClaseHorario> {
    const existente = this.clasesRepo.readNow((c) => c.paraleloId === clase.paraleloId && c.dia === clase.dia && c.bloque === clase.bloque)[0];
    const jornada = MOCK_JORNADAS.find((j) => j.espacioId === clase.espacioId);
    if (jornada) {
      const [choque] = buscarChoques(this.contexto(jornada), { ...clase, id: existente?.id });
      if (choque) {
        const otro = MOCK_PARALELOS.find((p) => p.id === choque.conParaleloId);
        const quien = choque.tipo === 'docente' ? MOCK_DOCENTES.find((d) => d.id === choque.docenteId)?.nombre ?? 'El docente' : 'El aula';
        return throwError(() => new Error(`${quien} ya tiene clase con ${otro ? paraleloLabel(otro) : 'otro paralelo'} de ${choque.inicio} a ${choque.fin}.`));
      }
    }
    return this.clasesRepo.save({ ...clase, id: existente?.id });
  }

  // Todo lo necesario para mostrar horarios con nombres (vistas de solo lectura y resúmenes)
  datos(espacioId: number): Observable<DatosHorario> {
    return forkJoin({
      jornada: this.jornada(espacioId),
      paralelos: this.academico.paralelosActivos(espacioId),
      asignaciones: this.academico.asignacionesActivas(espacioId),
      clases: this.clasesActivas(espacioId),
      materias: this.academico.materias(espacioId),
      docentes: this.academico.docentes(espacioId),
      aulas: this.academico.aulas(espacioId),
    });
  }

  eliminarClase(id: number): Observable<void> {
    return this.clasesRepo.delete(id);
  }

  private contexto(jornada: ConfigJornada): ContextoHorario {
    return { jornada, paralelos: MOCK_PARALELOS, asignaciones: MOCK_ASIGNACIONES, clases: this.clasesRepo.readNow() };
  }
}
