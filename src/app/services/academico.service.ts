import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Asignacion, Aula, Docente, Gestion, Materia, Paralelo } from '../core/models/academico.model';
import {
  MOCK_ASIGNACIONES,
  MOCK_AULAS,
  MOCK_DOCENTES,
  MOCK_GESTIONES,
  MOCK_MATERIAS,
  MOCK_MATRICULAS,
  MOCK_PARALELOS,
  MOCK_TUTORES,
} from '../mocks/academico.mock';
import { RepositorioMock } from './repositorio-mock';

// Módulo Académico del colegio: gestiones, aulas, paralelos, materias y asignaciones.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class AcademicoService {
  private gestionesRepo = new RepositorioMock<Gestion>(MOCK_GESTIONES);
  private aulasRepo = new RepositorioMock<Aula>(MOCK_AULAS);
  private paralelosRepo = new RepositorioMock<Paralelo>(MOCK_PARALELOS);
  private materiasRepo = new RepositorioMock<Materia>(MOCK_MATERIAS);
  private asignacionesRepo = new RepositorioMock<Asignacion>(MOCK_ASIGNACIONES);
  private docentesRepo = new RepositorioMock<Docente>(MOCK_DOCENTES);

  // ---------- Gestiones ----------
  gestiones(espacioId: number): Observable<Gestion[]> {
    return this.gestionesRepo.listar((g) => g.espacioId === espacioId).pipe(map((gs) => gs.sort((a, b) => b.anio - a.anio)));
  }

  gestionActiva(espacioId: number): Observable<Gestion | undefined> {
    return this.gestiones(espacioId).pipe(map((gs) => gs.find((g) => g.estado === 'activa')));
  }

  guardarGestion(gestion: Omit<Gestion, 'id'> & { id?: number }): Observable<Gestion> {
    const repetida = this.gestionesRepo.ahora((g) => g.espacioId === gestion.espacioId && g.anio === gestion.anio && g.id !== gestion.id);
    if (repetida.length) return throwError(() => new Error(`Ya existe la gestión ${gestion.anio}.`));
    return this.gestionesRepo.guardar(gestion);
  }

  // Activa una gestión y cierra la que estaba activa
  activarGestion(gestion: Gestion): Observable<Gestion> {
    for (const g of this.gestionesRepo.ahora((g) => g.espacioId === gestion.espacioId && g.estado === 'activa')) {
      g.estado = 'cerrada';
    }
    return this.gestionesRepo.guardar({ ...gestion, estado: 'activa' });
  }

  eliminarGestion(gestion: Gestion): Observable<void> {
    if (gestion.estado === 'activa') return throwError(() => new Error('No puedes eliminar la gestión activa.'));
    if (this.paralelosRepo.ahora((p) => p.gestionId === gestion.id).length) {
      return throwError(() => new Error('La gestión tiene paralelos registrados.'));
    }
    return this.gestionesRepo.eliminar(gestion.id);
  }

  // ---------- Aulas ----------
  aulas(espacioId: number): Observable<Aula[]> {
    return this.aulasRepo.listar((a) => a.espacioId === espacioId);
  }

  guardarAula(aula: Omit<Aula, 'id'> & { id?: number }): Observable<Aula> {
    const repetida = this.aulasRepo.ahora((a) => a.espacioId === aula.espacioId && a.id !== aula.id && a.nombre.trim().toLowerCase() === aula.nombre.trim().toLowerCase());
    if (repetida.length) return throwError(() => new Error(`Ya existe un espacio llamado "${aula.nombre}".`));
    return this.aulasRepo.guardar(aula);
  }

  eliminarAula(aula: Aula): Observable<void> {
    const usada = this.paralelosRepo.ahora((p) => p.aulaId === aula.id);
    if (usada.length) return throwError(() => new Error('El aula es el aula fija de uno o más paralelos.'));
    return this.aulasRepo.eliminar(aula.id);
  }

  // ---------- Paralelos ----------
  paralelos(espacioId: number, gestionId: number): Observable<Paralelo[]> {
    return this.paralelosRepo
      .listar((p) => p.espacioId === espacioId && p.gestionId === gestionId)
      .pipe(map((ps) => ps.sort((a, b) => a.grado - b.grado || a.letra.localeCompare(b.letra))));
  }

  // Paralelos de la gestión activa (vacío si no hay gestión activa)
  paralelosActivos(espacioId: number): Observable<Paralelo[]> {
    return this.gestionActiva(espacioId).pipe(switchMap((g) => (g ? this.paralelos(espacioId, g.id) : of([]))));
  }

  guardarParalelo(paralelo: Omit<Paralelo, 'id'> & { id?: number }): Observable<Paralelo> {
    const repetido = this.paralelosRepo.ahora((p) =>
      p.gestionId === paralelo.gestionId && p.id !== paralelo.id && p.nivel === paralelo.nivel &&
      p.grado === paralelo.grado && p.letra === paralelo.letra && p.turno === paralelo.turno);
    if (repetido.length) return throwError(() => new Error('Ya existe ese paralelo en el mismo turno.'));
    return this.paralelosRepo.guardar(paralelo);
  }

  eliminarParalelo(paralelo: Paralelo): Observable<void> {
    for (const asignacion of this.asignacionesRepo.ahora((a) => a.paraleloId === paralelo.id)) {
      this.asignacionesRepo.eliminar(asignacion.id).subscribe();
    }
    return this.paralelosRepo.eliminar(paralelo.id);
  }

  // ---------- Materias ----------
  materias(espacioId: number): Observable<Materia[]> {
    return this.materiasRepo.listar((m) => m.espacioId === espacioId);
  }

  guardarMateria(materia: Omit<Materia, 'id'> & { id?: number }): Observable<Materia> {
    const repetida = this.materiasRepo.ahora((m) => m.espacioId === materia.espacioId && m.id !== materia.id &&
      m.nivel === materia.nivel && m.nombre.trim().toLowerCase() === materia.nombre.trim().toLowerCase());
    if (repetida.length) return throwError(() => new Error(`"${materia.nombre}" ya existe en ese nivel.`));
    return this.materiasRepo.guardar(materia);
  }

  eliminarMateria(materia: Materia): Observable<void> {
    if (this.asignacionesRepo.ahora((a) => a.materiaId === materia.id).length) {
      return throwError(() => new Error('La materia tiene docentes asignados. Quita las asignaciones primero.'));
    }
    return this.materiasRepo.eliminar(materia.id);
  }

  // ---------- Estudiantes y tutores ----------
  // Paralelo en el que está inscrito un estudiante (0 si no tiene)
  paraleloDeEstudiante(usuarioId: number): Observable<number> {
    return of(MOCK_MATRICULAS.find((m) => m.usuarioId === usuarioId)?.paraleloId ?? 0);
  }

  // Estudiantes a cargo de un padre o tutor legal
  hijosDe(padreId: number): Observable<number[]> {
    return of(MOCK_TUTORES.filter((t) => t.padreId === padreId).map((t) => t.estudianteId));
  }

  // ---------- Docentes y asignaciones ----------
  docentes(_espacioId: number): Observable<Docente[]> {
    return this.docentesRepo.listar();
  }

  asignaciones(espacioId: number, gestionId: number): Observable<Asignacion[]> {
    return this.asignacionesRepo.listar((a) => a.espacioId === espacioId && a.gestionId === gestionId);
  }

  // Asignaciones de la gestión activa (vacío si no hay gestión activa)
  asignacionesActivas(espacioId: number): Observable<Asignacion[]> {
    return this.gestionActiva(espacioId).pipe(switchMap((g) => (g ? this.asignaciones(espacioId, g.id) : of([]))));
  }

  // Asigna (o quita, con docenteId 0) el docente de una materia en un paralelo
  asignar(espacioId: number, gestionId: number, paraleloId: number, materiaId: number, docenteId: number): Observable<void> {
    const actual = this.asignacionesRepo.ahora((a) => a.paraleloId === paraleloId && a.materiaId === materiaId)[0];
    if (!docenteId) {
      return actual ? this.asignacionesRepo.eliminar(actual.id) : of(undefined);
    }
    return this.asignacionesRepo
      .guardar({ id: actual?.id, espacioId, gestionId, paraleloId, materiaId, docenteId })
      .pipe(map(() => undefined));
  }
}
