import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LeccionDto } from '../models/LeccionDto'; //src\app\models\leccionDto.ts
import { PaginadoDto } from '../models/PaginadoDto'; //src\app\models\paginadoDto.ts
import { Page } from '../models/page';

@Injectable({
  providedIn: 'root'
})
export class LeccionService {

  private apiUrl = `${environment.API_URL}/api/leccion`;

  constructor(private http: HttpClient) {}

  // Obtener todas las lecciones con paginación
  getAllLecciones(paginadoDto: PaginadoDto): Observable<Page<LeccionDto>> {
    return this.http.post<Page<LeccionDto>>(`${this.apiUrl}/all`, paginadoDto, this.httpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  // Obtener lección por ID
  getLeccionById(idLeccion: number): Observable<LeccionDto> {
    return this.http.get<LeccionDto>(`${this.apiUrl}/${idLeccion}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Obtener lecciones por curso con paginación
  getLeccionesByCurso(cursoId: number, paginadoDto: PaginadoDto): Observable<Page<LeccionDto>> {
    return this.http.post<Page<LeccionDto>>(`${this.apiUrl}/curso/${cursoId}`, paginadoDto, this.httpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  // Crear una nueva lección
  createLeccion(leccionDto: LeccionDto): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/create`, leccionDto, this.httpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  // Actualizar una lección
  updateLeccion(leccionDto: LeccionDto): Observable<string> {
    return this.http.put<string>(`${this.apiUrl}/update`, leccionDto, this.httpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  // Eliminar una lección por ID
  deleteLeccion(idLeccion: number): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/delete/${idLeccion}`)
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
    throw new Error('Ocurrió un error en la solicitud a la API. Verifica la consola para más detalles.');
  }
}
