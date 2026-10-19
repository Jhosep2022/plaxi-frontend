import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http'; // MOCK: desconectado del backend
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
// import { catchError } from 'rxjs/operators'; // MOCK: desconectado del backend
import { Categoria } from '../models/categoriaDto';
// import { environment } from '../../environments/environment'; // MOCK: desconectado del backend
import { MOCK_CATEGORIAS, MOCK_DELAY, nextId } from '../mocks/mock-data';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {

  // private apiUrl = `${environment.API_URL}/categorias`; // MOCK: desconectado del backend

  // constructor(private http: HttpClient) {} // MOCK: desconectado del backend
  constructor() {}

  // Obtener todas las categorías
  getAllCategorias(): Observable<Categoria[]> {
    // return this.http.get<Categoria[]>(this.apiUrl)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    return of([...MOCK_CATEGORIAS]).pipe(delay(MOCK_DELAY));
  }

  // Obtener una categoría por su ID
  getCategoriaById(id: number): Observable<Categoria> {
    // const url = `${this.apiUrl}/${id}`;
    // return this.http.get<Categoria>(url)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const categoria = MOCK_CATEGORIAS.find((c) => c.idCategoria === Number(id)) ?? MOCK_CATEGORIAS[0];
    return of(categoria).pipe(delay(MOCK_DELAY));
  }

  // Crear una nueva categoría
  createCategoria(categoria: Categoria): Observable<Categoria> {
    // return this.http.post<Categoria>(this.apiUrl, categoria, this.httpOptions())
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const nueva = { ...categoria, idCategoria: nextId(MOCK_CATEGORIAS, 'idCategoria') };
    MOCK_CATEGORIAS.push(nueva);
    return of(nueva).pipe(delay(MOCK_DELAY));
  }

  // Actualizar una categoría existente
  updateCategoria(id: number, categoria: Categoria): Observable<Categoria> {
    // const url = `${this.apiUrl}/${id}`;
    // return this.http.put<Categoria>(url, categoria, this.httpOptions())
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const index = MOCK_CATEGORIAS.findIndex((c) => c.idCategoria === Number(id));
    const actualizada = { ...categoria, idCategoria: Number(id) };
    if (index >= 0) MOCK_CATEGORIAS[index] = actualizada;
    return of(actualizada).pipe(delay(MOCK_DELAY));
  }

  // Eliminar una categoría por su ID
  deleteCategoria(id: number): Observable<void> {
    // const url = `${this.apiUrl}/${id}`;
    // return this.http.delete<void>(url)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const index = MOCK_CATEGORIAS.findIndex((c) => c.idCategoria === Number(id));
    if (index >= 0) MOCK_CATEGORIAS.splice(index, 1);
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  // MOCK: desconectado del backend
  // // Opciones de cabecera para las peticiones
  // private httpOptions() {
  //   return {
  //     headers: new HttpHeaders({
  //       'Content-Type': 'application/json'
  //     })
  //   };
  // }
  //
  // // Manejo de errores
  // private handleError(error: any): Observable<never> {
  //   console.error('Error en la petición HTTP:', error);
  //   throw new Error('Ocurrió un error con la API. Por favor, verifica la consola para más detalles.');
  // }
}
