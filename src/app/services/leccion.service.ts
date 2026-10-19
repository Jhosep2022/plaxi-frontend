import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'; // MOCK: desconectado del backend
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
// import { catchError } from 'rxjs/operators'; // MOCK: desconectado del backend
// import { environment } from '../../environments/environment'; // MOCK: desconectado del backend
import { LeccionDto } from '../models/LeccionDto'; //src\app\models\leccionDto.ts
import { PaginadoDto } from '../models/PaginadoDto'; //src\app\models\paginadoDto.ts
import { Page } from '../models/page';
import { MOCK_DELAY, MOCK_LECCIONES, nextId, toPage } from '../mocks/mock-data';

@Injectable({
  providedIn: 'root'
})
export class LeccionService {

  // private apiUrl = `${environment.API_URL}/leccion`; // MOCK: desconectado del backend

  // constructor(private http: HttpClient) {} // MOCK: desconectado del backend
  constructor() {}

  // Obtener todas las lecciones con paginación
  getAllLecciones(paginadoDto: PaginadoDto): Observable<Page<LeccionDto>> {
    // return this.http.post<Page<LeccionDto>>(`${this.apiUrl}/all`, paginadoDto, this.httpOptions())
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const activas = MOCK_LECCIONES.filter((l) => l.estado);
    return of(toPage(activas, paginadoDto.page, paginadoDto.size)).pipe(delay(MOCK_DELAY));
  }

  // Obtener lección por ID
  getLeccionById(idLeccion: number): Observable<LeccionDto> {
    // return this.http.get<LeccionDto>(`${this.apiUrl}/${idLeccion}`)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const leccion = MOCK_LECCIONES.find((l) => l.idLeccion === Number(idLeccion)) ?? MOCK_LECCIONES[0];
    return of({ ...leccion }).pipe(delay(MOCK_DELAY));
  }

  // Obtener lecciones por curso con paginación
  getLeccionesByCurso(courseId: number, paginadoDto: any): Observable<any> {
    // // Configura los parámetros
    // const params = new HttpParams()
    //   .set('page', paginadoDto.page.toString())
    //   .set('size', paginadoDto.size.toString())
    //   .set('sortBy', paginadoDto.sortBy)
    //   .set('sortDir', paginadoDto.sortDir);
    //
    // // Construye la URL completa con los parámetros de consulta
    // return this.http.get(`${this.apiUrl}/curso/${courseId}`, { params });

    // MOCK
    const lecciones = MOCK_LECCIONES
      .filter((l) => l.estado && l.cursoId === Number(courseId))
      .sort((a, b) => a.orden - b.orden);
    return of(toPage(lecciones, paginadoDto?.page ?? 0, paginadoDto?.size ?? 10)).pipe(delay(MOCK_DELAY));
  }


  // Crear nueva lección
  createLeccion(leccionDto: LeccionDto): Observable<any> {
    // return this.http.post(`${this.apiUrl}/create`, leccionDto, { responseType: 'text' });

    // MOCK
    MOCK_LECCIONES.push({ ...leccionDto, idLeccion: nextId(MOCK_LECCIONES, 'idLeccion'), estado: true });
    return of('Lección creada (mock)').pipe(delay(MOCK_DELAY));
  }


  // Actualizar lección
  updateLeccion(leccionDto: LeccionDto): Observable<any> {
    // return this.http.put(`${this.apiUrl}/update`, leccionDto, { responseType: 'text' });

    // MOCK
    const index = MOCK_LECCIONES.findIndex((l) => l.idLeccion === Number(leccionDto.idLeccion));
    if (index >= 0) MOCK_LECCIONES[index] = { ...MOCK_LECCIONES[index], ...leccionDto };
    return of('Lección actualizada (mock)').pipe(delay(MOCK_DELAY));
  }

  // Eliminar una lección por ID
  deleteLeccion(idLeccion: number): Observable<string> {
    // return this.http.delete<string>(`${this.apiUrl}/delete/${idLeccion}`)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const leccion = MOCK_LECCIONES.find((l) => l.idLeccion === Number(idLeccion));
    if (leccion) leccion.estado = false;
    return of('Lección eliminada (mock)').pipe(delay(MOCK_DELAY));
  }

  // MOCK: desconectado del backend
  // // Opciones de cabecera para las peticiones
  // private httpOptions() {
  //   return {
  //     headers: new HttpHeaders({
  //       'Content-Type': 'application/json'
  //     })
  //   };
  // }
  //
  // // Manejo de errores
  // private handleError(error: any): Observable<never> {
  //   console.error('Error en la petición HTTP:', error);
  //   throw new Error('Ocurrió un error en la solicitud a la API. Verifica la consola para más detalles.');
  // }
}
