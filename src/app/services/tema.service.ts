import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TemaDto } from '../models/TemaDto'; //src\app\models\temaDto.ts
import { PaginadoDto } from '../models/PaginadoDto'; //src\app\models\paginadoDto.ts
import { environment } from '../../environments/environment';
import { Page } from '../models/page';

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
  getTemasByLeccion(lessonId: number, paginadoDto: PaginadoDto): Observable<Page<TemaDto>> {
    const options = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
      body: paginadoDto, // Incluye el cuerpo en la solicitud
    };

    return this.http.request<Page<TemaDto>>('POST', `${this.apiUrl}/leccion/${lessonId}`, options)
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
  updateTema(idTema: number, temaDto: TemaDto, file?: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('idTema', idTema.toString());
    formData.append('titulo', temaDto.titulo);
    formData.append('orden', temaDto.orden.toString());
    formData.append('descripcion', temaDto.descripcion);
    formData.append('leccionId', temaDto.leccionId.toString());
    formData.append('estado', temaDto.estado.toString());

    if (file) {
      formData.append('file', file);
    }

    return this.http.put(`${this.apiUrl}/update`, formData, { responseType: 'text' })
      .pipe(
        catchError(this.handleError)
      );
  }
  
  updateTemaWithFile(id: number, tema: TemaDto, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('tema', new Blob([JSON.stringify(tema)], { type: 'application/json' }));
    formData.append('file', file);
    return this.http.put(`${this.apiUrl}/update`, formData);
  }
  
  updateTemaWithoutFile(id: number, tema: TemaDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/update/${id}`, tema);
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
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error con la API.';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error del lado del cliente: ${error.error.message}`;
    } else {
      // Backend error
      errorMessage = `Error del servidor: ${error.status} ${error.message}`;
    }
    console.error('Error en la petición HTTP:', error);
    return throwError(() => new Error(errorMessage));
  }
}
