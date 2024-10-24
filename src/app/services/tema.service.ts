import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TemaDto } from '../models/TemaDto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TemaService {

  private baseUrl: string = `${environment.API_URL}/api/tema`;

  constructor(private http: HttpClient) {}

  // Obtener todos los temas
  getAllTemas(paginadoDto: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/all`, paginadoDto);
  }

  // Obtener tema por ID
  getTemaById(id: number): Observable<TemaDto> {
    return this.http.get<TemaDto>(`${this.baseUrl}/${id}`);
  }

  // Obtener temas por curso
  getTemasByCurso(cursoId: number, paginadoDto: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/curso/${cursoId}`, paginadoDto);
  }

  // Crear un nuevo tema
  createTema(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/create`, data);
  }

  // Actualizar un tema existente
  updateTema(data: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/update`, data);
  }

  // Eliminar un tema
  deleteTema(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${id}`);
  }
}
