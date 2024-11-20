// src/app/services/curso.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CursoDto, ActualizarCursoDto } from '../models/CursoDto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private apiUrl = `${environment.API_URL}/curso`;

  constructor(private http: HttpClient) {}

  // Obtener todos los cursos
  getAllCursos(): Observable<CursoDto[]> {
    return this.http.get<CursoDto[]>(`${this.apiUrl}/all`);
  }

  // Obtener un curso por ID
  getCursoById(idCurso: number): Observable<CursoDto> {
    return this.http.get<CursoDto>(`${this.apiUrl}/${idCurso}`);
  }

  // Obtener cursos por ID del usuario creador
  getCursosByUsuario(usuarioId: number): Observable<CursoDto[]> {
    return this.http.get<CursoDto[]>(`${this.apiUrl}/usuario/${usuarioId}`);
  }

  // Crear un nuevo curso
  createCurso(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, formData);
  }

  // Actualizar un curso por ID
  updateCurso(idCurso: number, curso: ActualizarCursoDto): Observable<ActualizarCursoDto> {
    return this.http.put<ActualizarCursoDto>(`${this.apiUrl}/${idCurso}`, curso);
  }

  // Borrar lógicamente un curso
  deleteCurso(idCurso: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${idCurso}`);
  }

  // Obtener los cursos recientes
  getRecentCursos(): Observable<CursoDto[]> {
    return this.http.get<CursoDto[]>(`${this.apiUrl}/recent`);
  }

  // Obtener cursos recomendados para un usuario
  getRecommendedCursosByUserId(userId: number): Observable<CursoDto[]> {
    return this.http.get<CursoDto[]>(`${this.apiUrl}/recomendaciones/${userId}`);
  }
}
