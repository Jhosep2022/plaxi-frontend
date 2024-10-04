import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CursoDto, ActualizarCursoDto } from '../models/CursoDto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CursoService {
  private apiUrl = `${environment.API_URL}/curso`;

  constructor(private http: HttpClient) {}

  // Obtener todos los cursos
  getAllCursos(): Observable<CursoDto[]> {
    return this.http.get<CursoDto[]>(`${this.apiUrl}/all`);
  }

  // Obtener un curso por ID
  getCurso(idCurso: number): Observable<CursoDto> {
    return this.http.get<CursoDto>(`${this.apiUrl}/${idCurso}`);
  }

  // Crear un nuevo curso
  createCurso(cursoDto: ActualizarCursoDto): Observable<any> {
    const formData = new FormData();
    formData.append('nombre', cursoDto.nombre);
    formData.append('descripcion', cursoDto.descripcion);
    formData.append('dificultad', cursoDto.dificultad);
    formData.append('categoriaId', cursoDto.categoriaId.toString());

    if (cursoDto.portada) {
      formData.append('portada', cursoDto.portada);
    }

    return this.http.post(`${this.apiUrl}/create`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  // Actualizar un curso
  updateCurso(idCurso: number, cursoDto: ActualizarCursoDto): Observable<any> {
    const formData = new FormData();
    formData.append('nombre', cursoDto.nombre);
    formData.append('descripcion', cursoDto.descripcion);
    formData.append('dificultad', cursoDto.dificultad);
    formData.append('categoriaId', cursoDto.categoriaId.toString());

    if (cursoDto.portada) {
      formData.append('portada', cursoDto.portada);
    }

    return this.http.put(`${this.apiUrl}/${idCurso}`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  // Borrado lógico del curso
  deleteCurso(idCurso: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${idCurso}`);
  }
}
