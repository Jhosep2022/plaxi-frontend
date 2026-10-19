import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MOCK_DELAY } from '../mocks/mock-data';

// Repositorio en memoria para datos mock: simula un CRUD de backend con latencia.
// Devuelve copias para que los componentes no modifiquen los datos por referencia.
export class RepositorioMock<T extends { id: number }> {
  constructor(private readonly datos: T[]) {}

  listar(filtro: (item: T) => boolean = () => true): Observable<T[]> {
    return this.responder(this.datos.filter(filtro).map((item) => structuredClone(item)));
  }

  // Actualiza si ya existe un elemento con ese id; si no, lo crea
  // (con el id indicado, o con uno nuevo si no se indicó ninguno)
  guardar(item: Omit<T, 'id'> & { id?: number }): Observable<T> {
    const existente = item.id ? this.datos.findIndex((d) => d.id === item.id) : -1;
    const guardado = { ...structuredClone(item), id: item.id || this.siguienteId() } as T;
    if (existente >= 0) this.datos[existente] = guardado;
    else this.datos.push(guardado);
    return this.responder(structuredClone(guardado));
  }

  eliminar(id: number): Observable<void> {
    const indice = this.datos.findIndex((d) => d.id === id);
    if (indice >= 0) this.datos.splice(indice, 1);
    return this.responder(undefined);
  }

  // Lectura síncrona para validaciones y reglas internas del mock
  ahora(filtro: (item: T) => boolean = () => true): T[] {
    return this.datos.filter(filtro);
  }

  private siguienteId(): number {
    return this.datos.reduce((max, d) => Math.max(max, d.id), 0) + 1;
  }

  private responder<R>(valor: R): Observable<R> {
    return of(valor).pipe(delay(MOCK_DELAY));
  }
}
