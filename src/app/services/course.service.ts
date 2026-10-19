// src/app/services/curso.service.ts
import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http'; // MOCK: desconectado del backend
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CursoDto, ActualizarCursoDto } from '../models/CursoDto';
// import { environment } from '../../environments/environment'; // MOCK: desconectado del backend
import { MOCK_CURSOS, MOCK_CURSOS_POR_USUARIO, MOCK_DELAY, nextId } from '../mocks/mock-data';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  // private apiUrl = `${environment.API_URL}/curso`; // MOCK: desconectado del backend

  // constructor(private http: HttpClient) {} // MOCK: desconectado del backend
  constructor() {}

  // Obtener todos los cursos
  getAllCursos(): Observable<CursoDto[]> {
    // return this.http.get<CursoDto[]>(`${this.apiUrl}/all`);

    // MOCK
    return of(MOCK_CURSOS.filter((c) => c.estado)).pipe(delay(MOCK_DELAY));
  }

  // Obtener un curso por ID
  getCursoById(idCurso: number): Observable<CursoDto> {
    // return this.http.get<CursoDto>(`${this.apiUrl}/${idCurso}`);

    // MOCK
    const curso = MOCK_CURSOS.find((c) => c.idCurso === Number(idCurso)) ?? MOCK_CURSOS[0];
    return of({ ...curso }).pipe(delay(MOCK_DELAY));
  }

  // Obtener cursos por ID del usuario creador
  getCursosByUsuario(usuarioId: number): Observable<CursoDto[]> {
    // return this.http.get<CursoDto[]>(`${this.apiUrl}/usuario/${usuarioId}`);

    // MOCK
    const ids = MOCK_CURSOS_POR_USUARIO[Number(usuarioId)] ?? [];
    return of(MOCK_CURSOS.filter((c) => c.estado && ids.includes(c.idCurso))).pipe(delay(MOCK_DELAY));
  }

  // Crear un nuevo curso
  createCurso(formData: FormData): Observable<any> {
    // return this.http.post(`${this.apiUrl}/create`, formData);

    // MOCK
    const usuarioId = Number(formData.get('usuarioCreadorId'));
    const portada = formData.get('portada') ?? formData.get('file');
    const nuevo: CursoDto = {
      idCurso: nextId(MOCK_CURSOS, 'idCurso'),
      nombre: String(formData.get('nombre') ?? 'Nuevo curso'),
      descripcion: String(formData.get('descripcion') ?? ''),
      dificultad: String(formData.get('dificultad') ?? 'Principiante'),
      estado: true,
      categoriaId: Number(formData.get('categoriaId') ?? formData.get('Categoria_id_categoria') ?? 1),
      portada: portada instanceof File ? URL.createObjectURL(portada) : 'https://picsum.photos/seed/nuevo/600/400',
    };
    MOCK_CURSOS.push(nuevo);
    if (usuarioId) {
      MOCK_CURSOS_POR_USUARIO[usuarioId] = [...(MOCK_CURSOS_POR_USUARIO[usuarioId] ?? []), nuevo.idCurso];
    }
    return of(nuevo).pipe(delay(MOCK_DELAY));
  }

  // Actualizar un curso por ID
  updateCurso(idCurso: number, curso: ActualizarCursoDto): Observable<ActualizarCursoDto> {
    // return this.http.put<ActualizarCursoDto>(`${this.apiUrl}/${idCurso}`, curso);

    // MOCK
    const index = MOCK_CURSOS.findIndex((c) => c.idCurso === Number(idCurso));
    if (index >= 0) {
      const { portada, usuarioCreadorId, ...datos } = curso;
      MOCK_CURSOS[index] = {
        ...MOCK_CURSOS[index],
        ...datos,
        portada: portada instanceof File ? URL.createObjectURL(portada) : MOCK_CURSOS[index].portada,
      };
    }
    return of(curso).pipe(delay(MOCK_DELAY));
  }

  // Borrar lógicamente un curso
  deleteCurso(idCurso: number): Observable<void> {
    // return this.http.delete<void>(`${this.apiUrl}/${idCurso}`);

    // MOCK
    const curso = MOCK_CURSOS.find((c) => c.idCurso === Number(idCurso));
    if (curso) curso.estado = false;
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  // Obtener los cursos recientes
  getRecentCursos(): Observable<CursoDto[]> {
    // return this.http.get<CursoDto[]>(`${this.apiUrl}/recent`);

    // MOCK
    return of(MOCK_CURSOS.filter((c) => c.estado).slice(-4).reverse()).pipe(delay(MOCK_DELAY));
  }

  // Obtener cursos recomendados para un usuario
  getRecommendedCursosByUserId(userId: number): Observable<CursoDto[]> {
    // return this.http.get<CursoDto[]>(`${this.apiUrl}/recomendaciones/${userId}`);

    // MOCK
    return of(MOCK_CURSOS.filter((c) => c.estado).slice(0, 4)).pipe(delay(MOCK_DELAY));
  }
}
