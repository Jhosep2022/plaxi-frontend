import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Membresia } from '../core/models/espacio.model';
import { MOCK_DELAY, MOCK_ESPACIOS, MOCK_MEMBRESIAS } from '../mocks/mock-data';

@Injectable({
  providedIn: 'root'
})
export class EspacioService {

  // Espacios a los que pertenece el usuario, con su rol en cada uno
  getMembresias(usuarioId: number): Observable<Membresia[]> {
    // MOCK (cuando exista el backend: GET /usuarios/:id/espacios)
    const membresias = MOCK_MEMBRESIAS
      .filter((m) => m.usuarioId === usuarioId)
      .map((m) => ({ espacio: MOCK_ESPACIOS.find((e) => e.id === m.espacioId)!, rol: m.rol }));
    return of(membresias).pipe(delay(MOCK_DELAY));
  }
}
