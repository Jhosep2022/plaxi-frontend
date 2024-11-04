import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { InscripcionDto } from '../models/inscripcionDto';
import { InscripcionResponseDto } from '../models/inscripcionDto';

@Injectable({
  providedIn: 'root'
})
export class InscripcionService {

  private apiUrl = `${environment.API_URL}/api/inscripciones`;

  constructor(private http: HttpClient) {}

  // Obtener todas las inscripciones
  getAllInscripciones(): Observable<InscripcionResponseDto[]> {
    return this.http.get<InscripcionResponseDto[]>(this.apiUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Obtener una inscripción por ID
  getInscripcionById(id: number): Observable<InscripcionResponseDto> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<InscripcionResponseDto>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Crear una nueva inscripción
  createInscripcion(inscripcionDto: InscripcionDto): Observable<InscripcionResponseDto> {
    return this.http.post<InscripcionResponseDto>(this.apiUrl, inscripcionDto, this.httpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  // Actualizar una inscripción existente
  updateInscripcion(id: number, inscripcionDto: InscripcionDto): Observable<InscripcionResponseDto> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<InscripcionResponseDto>(url, inscripcionDto, this.httpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  // Eliminar una inscripción por ID
  deleteInscripcion(id: number): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Obtener inscripciones por ID de usuario
  getInscripcionesByUsuarioId(usuarioId: number): Observable<InscripcionResponseDto[]> {
    const url = `${this.apiUrl}/usuario/${usuarioId}`;
    return this.http.get<InscripcionResponseDto[]>(url)
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
