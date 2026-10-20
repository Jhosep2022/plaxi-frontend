import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { paraleloLabel } from '../core/models/academico.model';
import { Parentesco } from '../core/models/personas.model';
import { SessionService } from '../core/auth/session.service';
import { MOCK_PARALELOS } from '../mocks/academico.mock';
import { MOCK_ESTUDIANTES } from '../mocks/asistencia.mock';
import { MOCK_DELAY } from '../mocks/mock-data';
import { MOCK_VINCULOS } from '../mocks/personas.mock';

export interface Hijo {
  id: number;
  nombre: string;
  paraleloId: number;
  curso: string; // "3ro A" o "Sin curso"
  fechaNacimiento: string;
  parentesco: Parentesco;
}

const CLAVE = 'hijoActivo';

// Hijo que el padre está mirando en Asistencia, Calificaciones, Horario y el Resumen.
// Se recuerda durante la sesión del navegador; por defecto, el primero.
@Injectable({ providedIn: 'root' })
export class HijoActivoService {
  private session = inject(SessionService);

  readonly elegidoId = signal<number>(leer());

  // Estudiantes a cargo del padre en sesión (MOCK: con backend, GET /padres/:id/hijos)
  hijos(): Observable<Hijo[]> {
    const padreId = this.session.usuarioId();
    const hijos = MOCK_VINCULOS.filter((v) => v.padreId === padreId).flatMap((v) => {
      const e = MOCK_ESTUDIANTES.find((x) => x.id === v.estudianteId);
      if (!e) return [];
      const paralelo = MOCK_PARALELOS.find((p) => p.id === e.paraleloId);
      return [{ id: e.id, nombre: e.nombre, paraleloId: e.paraleloId, curso: paralelo ? paraleloLabel(paralelo) : 'Sin curso', fechaNacimiento: e.fechaNacimiento, parentesco: v.parentesco }];
    });
    return of(hijos).pipe(delay(MOCK_DELAY));
  }

  // El hijo elegido, o el primero si no eligió (o ya no está a su cargo)
  activo(): Observable<Hijo | null> {
    return this.hijos().pipe(map((hs) => hs.find((h) => h.id === this.elegidoId()) ?? hs[0] ?? null));
  }

  elegir(id: number): void {
    this.elegidoId.set(id);
    try {
      sessionStorage.setItem(CLAVE, String(id));
    } catch {
      // Sin almacenamiento: se recuerda solo en esta pestaña
    }
  }
}

function leer(): number {
  try {
    return Number(sessionStorage.getItem(CLAVE)) || 0;
  } catch {
    return 0;
  }
}
