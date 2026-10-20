import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { NIVELES } from '../core/models/academico.model';
import { Institucion } from '../core/models/institucion.model';
import { MOCK_GESTIONES, MOCK_PARALELOS } from '../mocks/academico.mock';
import { MOCK_INSTITUCIONES } from '../mocks/institucion.mock';
import { MOCK_ESPACIOS } from '../mocks/mock-data';
import { RepositorioMock } from './repositorio-mock';

export const LOGO_MAX_KB = 500;

// Datos generales de la institución.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class InstitucionService {
  private repo = new RepositorioMock<Institucion>(MOCK_INSTITUCIONES);

  datos(espacioId: number): Observable<Institucion | null> {
    return this.repo.listar((i) => i.id === espacioId).pipe(map(([i]) => i ?? null));
  }

  guardar(institucion: Institucion): Observable<Institucion> {
    if (!institucion.niveles.length) return throwError(() => new Error('Elige al menos un nivel educativo.'));
    // No se puede dejar de ofrecer un nivel que tiene paralelos en la gestión activa
    const activa = MOCK_GESTIONES.find((g) => g.espacioId === institucion.id && g.estado === 'activa');
    const enUso = NIVELES.find((n) => !institucion.niveles.includes(n.id) && MOCK_PARALELOS.some((p) => p.gestionId === activa?.id && p.nivel === n.id));
    if (enUso) return throwError(() => new Error(`${enUso.label} tiene paralelos en la gestión activa; no se puede quitar.`));
    if (institucion.logo.length > LOGO_MAX_KB * 1024 * 1.37) return throwError(() => new Error(`El logo debe pesar menos de ${LOGO_MAX_KB} KB.`));

    const espacio = MOCK_ESPACIOS.find((e) => e.id === institucion.id);
    if (espacio) espacio.nombre = institucion.nombre.trim();
    return this.repo.guardar({ ...institucion, nombre: institucion.nombre.trim() });
  }
}
