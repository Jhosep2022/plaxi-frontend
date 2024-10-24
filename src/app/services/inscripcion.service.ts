import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InscripcionDto, InscripcionResponseDto } from '../models/inscripcion.model';  // Crea un modelo para estas interfaces
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InscripcionService {
  private apiUrl = `${environment.API_URL}/inscripciones`;

  constructor(private http: HttpClient) {}

  // Obtener todas las inscripciones
  getAllInscripciones(): Observable<InscripcionResponseDto[]> {
    return this.http.get<InscripcionResponseDto[]>(this.apiUrl);
  }

  // Obtener inscripción por ID
  getInscripcionById(id: number): Observable<InscripcionResponseDto> {
    return this.http.get<InscripcionResponseDto>(`${this.apiUrl}/${id}`);
  }

  // Obtener inscripciones por ID de usuario
  getInscripcionesByUsuarioId(usuarioId: number): Observable<InscripcionResponseDto[]> {
    return this.http.get<InscripcionResponseDto[]>(`${this.apiUrl}/usuario/${usuarioId}`);
  }

  // Crear una nueva inscripción
  createInscripcion(inscripcion: InscripcionDto): Observable<InscripcionResponseDto> {
    return this.http.post<InscripcionResponseDto>(this.apiUrl, inscripcion);
  }

  // Actualizar una inscripción
  updateInscripcion(id: number, inscripcion: InscripcionDto): Observable<InscripcionResponseDto> {
    return this.http.put<InscripcionResponseDto>(`${this.apiUrl}/${id}`, inscripcion);
  }

  // Eliminar una inscripción
  deleteInscripcion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
