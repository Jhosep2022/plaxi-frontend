import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TemaDto } from '../models/TemaDto'; //src\app\models\temaDto.ts
import { PaginadoDto } from '../models/PaginadoDto'; //src\app\models\paginadoDto.ts
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TemaService {

  private apiUrl = `${environment.API_URL}/tema`;

  constructor(private http: HttpClient) {}

  // Obtener todos los temas con paginación
  getAllTemas(paginadoDto: PaginadoDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/all`, paginadoDto, this.httpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  // Obtener un tema por ID
  getTemaById(idTema: number): Observable<TemaDto> {
    const url = `${this.apiUrl}/${idTema}`;
    return this.http.get<TemaDto>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Obtener temas por lección con paginación (método GET)
  getTemasByLeccion(leccionId: number, paginadoDto: PaginadoDto): Observable<any> {
    const params = new HttpParams()
      .set('page', paginadoDto.page.toString())
      .set('size', paginadoDto.size.toString())
      .set('sortBy', paginadoDto.sortBy)
      .set('sortDir', paginadoDto.sortDir);

    return this.http.get<any>(`${this.apiUrl}/leccion/${leccionId}`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Crear un nuevo tema con archivo
  createTema(temaDto: TemaDto, file: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('titulo', temaDto.titulo);
    formData.append('orden', temaDto.orden.toString());
    formData.append('descripcion', temaDto.descripcion);
    formData.append('leccionId', temaDto.leccionId.toString());
    formData.append('file', file);
  
    return this.http.post(`${this.apiUrl}/create`, formData, { responseType: 'text' })
      .pipe(
        tap((response) => {
          console.log('Respuesta del servidor:', response);
        }),
        catchError(this.handleError)
      );
  }
  

  // Actualizar un tema existente con archivo
  updateTema(idTema: number, temaDto: TemaDto, file: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('idTema', idTema.toString());
    formData.append('titulo', temaDto.titulo);
    formData.append('orden', temaDto.orden.toString());
    formData.append('descripcion', temaDto.descripcion);
    formData.append('leccionId', temaDto.leccionId.toString());
    formData.append('file', file);

    return this.http.put<any>(`${this.apiUrl}/update`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Eliminar un tema por ID
  deleteTema(idTema: number): Observable<void> {
    const url = `${this.apiUrl}/delete/${idTema}`;
    return this.http.delete<void>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Opciones de cabecera para las peticiones (solo para JSON requests)
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
