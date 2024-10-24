import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Categoria } from '../models/categoriaDto';
import { environment } from '../../environments/environment'; 

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {

  private apiUrl = `${environment.API_URL}/categorias`;

  constructor(private http: HttpClient) {}

  // Obtener todas las categorías
  getAllCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.apiUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Obtener una categoría por su ID
  getCategoriaById(id: number): Observable<Categoria> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Categoria>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Crear una nueva categoría
  createCategoria(categoria: Categoria): Observable<Categoria> {
    return this.http.post<Categoria>(this.apiUrl, categoria, this.httpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  // Actualizar una categoría existente
  updateCategoria(id: number, categoria: Categoria): Observable<Categoria> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<Categoria>(url, categoria, this.httpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  // Eliminar una categoría por su ID
  deleteCategoria(id: number): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Opciones de cabecera para las peticiones
  private httpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
  }

  // Manejo de errores
  private handleError(error: any): Observable<never> {
    console.error('Error en la petición HTTP:', error);
    throw new Error('Ocurrió un error con la API. Por favor, verifica la consola para más detalles.');
  }
}
