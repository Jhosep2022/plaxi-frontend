import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Rol } from '../core/models/espacio.model';
import { Comunicado, Lectura, Publico } from '../core/models/comunicados.model';
import { hoyIso } from '../core/utils/asistencia';
import { MOCK_ASIGNACIONES, MOCK_DOCENTES } from '../mocks/academico.mock';
import { MOCK_ESTUDIANTES } from '../mocks/asistencia.mock';
import { MOCK_COMUNICADOS, MOCK_LECTURAS } from '../mocks/comunicados.mock';
import { MOCK_DELAY } from '../mocks/mock-data';
import { MOCK_PADRES, MOCK_VINCULOS } from '../mocks/personas.mock';
import { RepositorioMock } from './repositorio-mock';

export interface ComunicadoRecibido {
  comunicado: Comunicado;
  lectura: Lectura | null;
}

export interface Alcance {
  destinatarios: number;
  leidos: number;
  confirmados: number;
}

export type BorradorComunicado = Pick<Comunicado, 'titulo' | 'mensaje' | 'categoria' | 'importante' | 'publico' | 'paraleloIds' | 'pideConfirmacion' | 'fechaEvento'>;

// Comunicados de la dirección y de los docentes, con su alcance y confirmaciones de lectura.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class ComunicadosService {
  private comunicadosRepo = new RepositorioMock<Comunicado>(MOCK_COMUNICADOS);
  private lecturasRepo = new RepositorioMock<Lectura>(MOCK_LECTURAS);

  constructor() {
    this.simularLecturas();
  }

  // ---------- Destinatarios ----------
  // Usuarios a los que llega un comunicado según su público y sus cursos
  destinatarios(c: Pick<Comunicado, 'publico' | 'paraleloIds'>): Set<number> {
    const enCurso = (paraleloId: number) => (c.paraleloIds.length ? c.paraleloIds.includes(paraleloId) : paraleloId !== 0);
    const estudiantes = MOCK_ESTUDIANTES.filter((e) => enCurso(e.paraleloId)).map((e) => e.id);
    const ids = new Set<number>();
    if (c.publico.includes('estudiantes')) estudiantes.forEach((id) => ids.add(id));
    if (c.publico.includes('padres')) {
      const deEllos = new Set(estudiantes);
      MOCK_VINCULOS.filter((v) => deEllos.has(v.estudianteId)).forEach((v) => ids.add(v.padreId));
    }
    if (c.publico.includes('docentes')) {
      MOCK_DOCENTES.filter((d) => d.activo && (!c.paraleloIds.length || MOCK_ASIGNACIONES.some((a) => a.docenteId === d.id && c.paraleloIds.includes(a.paraleloId))))
        .forEach((d) => ids.add(d.id));
    }
    return ids;
  }

  // ---------- Bandeja de entrada ----------
  recibidos(espacioId: number, usuarioId: number): Observable<ComunicadoRecibido[]> {
    const lecturas = this.lecturasRepo.ahora((l) => l.usuarioId === usuarioId);
    const lista = this.comunicadosRepo
      .ahora((c) => c.espacioId === espacioId && c.autorId !== usuarioId && this.destinatarios(c).has(usuarioId))
      .sort((a, b) => b.enviado.localeCompare(a.enviado))
      .map((comunicado) => ({ comunicado: structuredClone(comunicado), lectura: structuredClone(lecturas.find((l) => l.comunicadoId === comunicado.id) ?? null) }));
    return of(lista).pipe(delay(MOCK_DELAY));
  }

  marcarLeido(comunicadoId: number, usuarioId: number): Observable<Lectura> {
    const previa = this.lecturasRepo.ahora((l) => l.comunicadoId === comunicadoId && l.usuarioId === usuarioId)[0];
    if (previa) return of(structuredClone(previa));
    return this.lecturasRepo.guardar({ comunicadoId, usuarioId, leidoEl: ahoraIso(), confirmado: false });
  }

  // "Enterado": confirma que recibió un comunicado que lo pide
  confirmar(comunicadoId: number, usuarioId: number): Observable<Lectura> {
    const previa = this.lecturasRepo.ahora((l) => l.comunicadoId === comunicadoId && l.usuarioId === usuarioId)[0];
    return this.lecturasRepo.guardar({ id: previa?.id, comunicadoId, usuarioId, leidoEl: previa?.leidoEl ?? ahoraIso(), confirmado: true });
  }

  // ---------- Enviados ----------
  // Dirección: todos los del colegio. Docente: solo los suyos.
  enviados(espacioId: number, autorId: number | null): Observable<(Comunicado & { alcance: Alcance })[]> {
    const lista = this.comunicadosRepo
      .ahora((c) => c.espacioId === espacioId && (autorId === null || c.autorId === autorId))
      .sort((a, b) => b.enviado.localeCompare(a.enviado))
      .map((c) => ({ ...structuredClone(c), alcance: this.alcance(c) }));
    return of(lista).pipe(delay(MOCK_DELAY));
  }

  // Quiénes todavía no lo leyeron (o no confirmaron, si se pidió confirmación)
  pendientes(c: Comunicado): Observable<{ nombre: string; tipo: string }[]> {
    const listos = new Set(this.lecturasRepo.ahora((l) => l.comunicadoId === c.id && (!c.pideConfirmacion || l.confirmado)).map((l) => l.usuarioId));
    const nombre = (id: number) =>
      MOCK_DOCENTES.find((d) => d.id === id) ? { nombre: MOCK_DOCENTES.find((d) => d.id === id)!.nombre, tipo: 'Docente' }
      : MOCK_PADRES.find((p) => p.id === id) ? { nombre: MOCK_PADRES.find((p) => p.id === id)!.nombre, tipo: 'Padre / tutor' }
      : { nombre: MOCK_ESTUDIANTES.find((e) => e.id === id)?.nombre ?? `Usuario ${id}`, tipo: 'Estudiante' };
    const lista = [...this.destinatarios(c)].filter((id) => !listos.has(id)).map(nombre).sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre));
    return of(lista).pipe(delay(MOCK_DELAY));
  }

  publicar(espacioId: number, autor: { id: number; nombre: string; rol: Rol }, borrador: BorradorComunicado, cursosPermitidos: number[] | null): Observable<Comunicado> {
    if (autor.rol !== 'direccion' && autor.rol !== 'docente') return throwError(() => new Error('Solo la dirección y los docentes envían comunicados.'));
    if (!borrador.titulo.trim()) return throwError(() => new Error('Ponle un título.'));
    if (borrador.mensaje.trim().length < 10) return throwError(() => new Error('El mensaje es muy corto.'));
    if (!borrador.publico.length) return throwError(() => new Error('Elige a quién va dirigido.'));
    if (autor.rol === 'docente') {
      if (borrador.publico.includes('docentes')) return throwError(() => new Error('Los docentes solo envían comunicados a padres y estudiantes.'));
      if (!borrador.paraleloIds.length || borrador.paraleloIds.some((id) => !cursosPermitidos?.includes(id))) {
        return throwError(() => new Error('Elige uno o más de tus cursos.'));
      }
    }
    if (!this.destinatarios(borrador).size) return throwError(() => new Error('Con esa selección el comunicado no llega a nadie.'));
    return this.comunicadosRepo.guardar({
      ...borrador, titulo: borrador.titulo.trim(), mensaje: borrador.mensaje.trim(),
      espacioId, autorId: autor.id, autorNombre: autor.nombre, autorRol: autor.rol, enviado: ahoraIso(),
    });
  }

  eliminar(c: Comunicado): Observable<void> {
    for (const l of this.lecturasRepo.ahora((x) => x.comunicadoId === c.id)) this.lecturasRepo.eliminar(l.id).subscribe();
    return this.comunicadosRepo.eliminar(c.id);
  }

  // Cantidad de personas a las que llegaría un borrador (vista previa al redactar)
  contar(publico: Publico[], paraleloIds: number[]): number {
    return this.destinatarios({ publico, paraleloIds }).size;
  }

  private alcance(c: Comunicado): Alcance {
    const destinatarios = this.destinatarios(c);
    const lecturas = this.lecturasRepo.ahora((l) => l.comunicadoId === c.id && destinatarios.has(l.usuarioId));
    return { destinatarios: destinatarios.size, leidos: lecturas.length, confirmados: lecturas.filter((l) => l.confirmado).length };
  }

  // MOCK: los destinatarios sin cuenta en la demo leen una parte de los comunicados (más los antiguos)
  private simularLecturas(): void {
    const conCuenta = new Set([1, 2, 3, 6]);
    for (const c of this.comunicadosRepo.ahora()) {
      const antiguedad = Math.min(1, (Date.parse(`${hoyIso()}T12:00:00`) - Date.parse(c.enviado)) / (7 * 86400000));
      for (const id of this.destinatarios(c)) {
        if (conCuenta.has(id)) continue;
        const r = azar(`${c.id}-${id}`);
        if (r < 0.35 + antiguedad * 0.5) {
          this.lecturasRepo.guardar({ comunicadoId: c.id, usuarioId: id, leidoEl: c.enviado, confirmado: c.pideConfirmacion && r < 0.3 + antiguedad * 0.4 }); // guardar agrega al instante
        }
      }
    }
  }
}

function ahoraIso(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${hoyIso(d)}T${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

function azar(semilla: string): number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
