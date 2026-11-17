import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { paraleloLabel } from '../core/models/academics.model';
import { Parentesco } from '../core/models/people.model';
import { SessionService } from '../core/auth/session.service';
import { SchoolApiService } from '../core/api/school-api.service';

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
export class SelectedChildService {
  private session = inject(SessionService);
  private readonly api = inject(SchoolApiService);

  readonly elegidoId = signal<number>(leer());

  // Estudiantes a cargo del padre en sesión (MOCK: con backend, GET /padres/:id/hijos)
  hijos(): Observable<Hijo[]> {
    return this.api.member().pipe(
      map((member) =>
        member.hijos.map((child) => ({
          id: child.id,
          nombre: child.nombre,
          paraleloId: child.paralelo?.id ?? 0,
          curso: child.paralelo?.etiqueta ?? 'Sin curso',
          fechaNacimiento: child.fechaNacimiento ?? '',
          parentesco: child.parentesco,
        })),
      ),
    );
  }

  // El hijo elegido, o el primero si no eligió (o ya no está a su cargo)
  activo(): Observable<Hijo | null> {
    return this.hijos().pipe(
      map((hs) => hs.find((h) => h.id === this.elegidoId()) ?? hs[0] ?? null),
    );
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
