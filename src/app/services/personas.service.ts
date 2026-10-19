import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { Docente, paraleloLabel } from '../core/models/academico.model';
import { Estudiante } from '../core/models/asistencia.model';
import { Parentesco, Tutor, Vinculo } from '../core/models/personas.model';
import { MOCK_ASIGNACIONES, MOCK_CLASES, MOCK_DOCENTES, MOCK_MATERIAS, MOCK_PARALELOS } from '../mocks/academico.mock';
import { MOCK_ESTUDIANTES } from '../mocks/asistencia.mock';
import { MOCK_MEMBRESIAS } from '../mocks/mock-data';
import { MOCK_PADRES, MOCK_VINCULOS } from '../mocks/personas.mock';
import { RepositorioMock } from './repositorio-mock';

export interface CargaDocente {
  materias: string[]; // "Física · 3ro A"
  clasesSemana: number;
}

export interface HijoDeTutor {
  estudianteId: number;
  parentesco: Parentesco;
}

const normalizar = (texto: string) => texto.trim().toLowerCase();

// Personas del colegio: docentes, estudiantes, padres / tutores legales e inscripciones.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class PersonasService {
  private docentesRepo = new RepositorioMock<Docente>(MOCK_DOCENTES);
  private estudiantesRepo = new RepositorioMock<Estudiante>(MOCK_ESTUDIANTES);
  private padresRepo = new RepositorioMock<Tutor>(MOCK_PADRES);
  private vinculosRepo = new RepositorioMock<Vinculo>(MOCK_VINCULOS);

  // ---------- Docentes ----------
  docentes(): Observable<Docente[]> {
    return this.docentesRepo.listar().pipe(map((ds) => ds.sort((a, b) => a.nombre.localeCompare(b.nombre))));
  }

  // Materias que dicta cada docente en la gestión activa y cuántas clases tiene por semana
  cargaDocentes(): Observable<Map<number, CargaDocente>> {
    const carga = new Map<number, CargaDocente>();
    for (const a of MOCK_ASIGNACIONES) {
      const paralelo = MOCK_PARALELOS.find((p) => p.id === a.paraleloId);
      const materia = MOCK_MATERIAS.find((m) => m.id === a.materiaId);
      if (!paralelo || !materia) continue;
      const actual = carga.get(a.docenteId) ?? { materias: [], clasesSemana: 0 };
      actual.materias.push(`${materia.nombre} · ${paraleloLabel(paralelo)}`);
      actual.clasesSemana += MOCK_CLASES.filter((c) => c.paraleloId === a.paraleloId && c.materiaId === a.materiaId).length;
      carga.set(a.docenteId, actual);
    }
    return of(carga);
  }

  guardarDocente(docente: Omit<Docente, 'id'> & { id?: number }): Observable<Docente> {
    const error = this.ciRepetido(docente.ci, docente.id, 'docente');
    if (error) return throwError(() => new Error(error));
    if (!docente.activo && docente.id) {
      const asignadas = MOCK_ASIGNACIONES.filter((a) => a.docenteId === docente.id).length;
      if (asignadas) return throwError(() => new Error(`Tiene ${asignadas} ${asignadas === 1 ? 'materia asignada' : 'materias asignadas'}. Reasígnalas en Académico → Asignación docente antes de darlo de baja.`));
    }
    return this.docentesRepo.guardar({ ...docente, nombre: docente.nombre.trim(), email: docente.email.trim() });
  }

  // ---------- Estudiantes ----------
  estudiantes(): Observable<Estudiante[]> {
    return this.estudiantesRepo.listar().pipe(map((es) => es.sort((a, b) => a.nombre.localeCompare(b.nombre))));
  }

  guardarEstudiante(estudiante: Omit<Estudiante, 'id'> & { id?: number }): Observable<Estudiante> {
    const error = this.ciRepetido(estudiante.ci, estudiante.id, 'estudiante');
    if (error) return throwError(() => new Error(error));
    const anterior = estudiante.id ? this.estudiantesRepo.ahora((e) => e.id === estudiante.id)[0]?.paraleloId ?? 0 : 0;
    if (estudiante.paraleloId !== anterior) {
      const cupo = this.sinCupo(estudiante.paraleloId);
      if (cupo) return throwError(() => new Error(cupo));
      this.moverConteo(anterior, estudiante.paraleloId);
    }
    return this.estudiantesRepo.guardar({ ...estudiante, nombre: estudiante.nombre.trim() });
  }

  // ---------- Inscripciones ----------
  // Inscribe (o cambia de paralelo) a un estudiante; paraleloId 0 lo retira de su paralelo
  inscribir(estudianteId: number, paraleloId: number): Observable<Estudiante> {
    const estudiante = this.estudiantesRepo.ahora((e) => e.id === estudianteId)[0];
    if (!estudiante) return throwError(() => new Error('El estudiante ya no existe.'));
    if (estudiante.paraleloId === paraleloId) return of(structuredClone(estudiante));
    const cupo = this.sinCupo(paraleloId);
    if (cupo) return throwError(() => new Error(cupo));
    this.moverConteo(estudiante.paraleloId, paraleloId);
    return this.estudiantesRepo.guardar({ ...estudiante, paraleloId });
  }

  // ---------- Padres y tutores legales ----------
  padres(): Observable<Tutor[]> {
    return this.padresRepo.listar().pipe(map((ps) => ps.sort((a, b) => a.nombre.localeCompare(b.nombre))));
  }

  vinculos(): Observable<Vinculo[]> {
    return this.vinculosRepo.listar();
  }

  // Guarda los datos del padre / tutor y reemplaza la lista de estudiantes a su cargo
  guardarPadre(padre: Omit<Tutor, 'id'> & { id?: number }, hijos: HijoDeTutor[]): Observable<Tutor> {
    const error = this.ciRepetido(padre.ci, padre.id, 'padre');
    if (error) return throwError(() => new Error(error));
    if (!hijos.length) return throwError(() => new Error('Vincula al menos un estudiante a su cargo.'));
    if (new Set(hijos.map((h) => h.estudianteId)).size !== hijos.length) return throwError(() => new Error('Hay un estudiante repetido.'));

    return this.padresRepo.guardar({ ...padre, nombre: padre.nombre.trim(), email: padre.email.trim() }).pipe(
      map((guardado) => {
        for (const v of this.vinculosRepo.ahora((v) => v.padreId === guardado.id)) this.vinculosRepo.eliminar(v.id).subscribe();
        for (const h of hijos) this.vinculosRepo.guardar({ padreId: guardado.id, ...h }).subscribe();
        return guardado;
      })
    );
  }

  eliminarPadre(padre: Tutor): Observable<void> {
    if (MOCK_MEMBRESIAS.some((m) => m.usuarioId === padre.id)) {
      return throwError(() => new Error(`${padre.nombre} tiene una cuenta activa en la app; no se puede eliminar.`));
    }
    for (const v of this.vinculosRepo.ahora((v) => v.padreId === padre.id)) this.vinculosRepo.eliminar(v.id).subscribe();
    return this.padresRepo.eliminar(padre.id);
  }

  // ---------- Cuentas ----------
  // Personas que ya tienen usuario para entrar a la app en este espacio
  cuentas(espacioId: number): Observable<Set<number>> {
    return of(new Set(MOCK_MEMBRESIAS.filter((m) => m.espacioId === espacioId).map((m) => m.usuarioId)));
  }

  // ---------- Reglas internas ----------
  private ciRepetido(ci: string, id: number | undefined, tipo: 'docente' | 'estudiante' | 'padre'): string | null {
    const valor = normalizar(ci);
    if (!valor) return null;
    const lista: { id: number; ci: string; nombre: string }[] =
      tipo === 'docente' ? this.docentesRepo.ahora() : tipo === 'estudiante' ? this.estudiantesRepo.ahora() : this.padresRepo.ahora();
    const otro = lista.find((p) => p.id !== id && normalizar(p.ci) === valor);
    return otro ? `El CI ${ci.trim()} ya está registrado a nombre de ${otro.nombre}.` : null;
  }

  private sinCupo(paraleloId: number): string | null {
    if (!paraleloId) return null;
    const p = MOCK_PARALELOS.find((x) => x.id === paraleloId);
    if (!p) return 'El paralelo ya no existe.';
    return p.estudiantes >= p.capacidad ? `${paraleloLabel(p)} está lleno (${p.capacidad} de ${p.capacidad}).` : null;
  }

  // Mantiene al día la cantidad de inscritos de cada paralelo
  private moverConteo(desde: number, hacia: number): void {
    const origen = MOCK_PARALELOS.find((p) => p.id === desde);
    const destino = MOCK_PARALELOS.find((p) => p.id === hacia);
    if (origen) origen.estudiantes = Math.max(0, origen.estudiantes - 1);
    if (destino) destino.estudiantes++;
  }
}
