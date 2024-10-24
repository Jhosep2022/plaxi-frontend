import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LeccionDto } from '../models/LeccionDto';
import { environment } from '../../environments/environment';
import { PaginadoDto } from '../models/PaginadoDto';

@Injectable({
  providedIn: 'root'
})
export class LeccionService {
  private apiUrl = `${environment.API_URL}/leccion`;

  constructor(private http: HttpClient) {}

  // Obtener todas las lecciones (paginado)
  getAllLecciones(paginadoDto: PaginadoDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/all`, paginadoDto);
  }

  // Obtener lección específica por ID
  getLeccion(idLeccion: number): Observable<LeccionDto> {
    return this.http.get<LeccionDto>(`${this.apiUrl}/${idLeccion}`);
  }

  // Obtener lecciones por curso (paginado)
  getLeccionesByCurso(cursoId: number, paginadoDto: PaginadoDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/curso/${cursoId}`, paginadoDto);
  }

  // Crear nueva lección
  createLeccion(leccionDto: LeccionDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, leccionDto);
  }

  // Actualizar lección
  updateLeccion(leccionDto: LeccionDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/update`, leccionDto);
  }

  // Eliminar lección
  deleteLeccion(idLeccion: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${idLeccion}`);
  }
}
