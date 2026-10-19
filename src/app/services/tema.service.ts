import { Injectable } from '@angular/core';
// import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http'; // MOCK: desconectado del backend
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
// import { Observable, throwError } from 'rxjs'; // MOCK: desconectado del backend
// import { catchError, tap } from 'rxjs/operators'; // MOCK: desconectado del backend
import { TemaDto } from '../models/TemaDto'; //src\app\models\temaDto.ts
import { PaginadoDto } from '../models/PaginadoDto'; //src\app\models\paginadoDto.ts
// import { environment } from '../../environments/environment'; // MOCK: desconectado del backend
import { Page } from '../models/page';
import { MOCK_DELAY, MOCK_TEMAS, nextId, toPage } from '../mocks/mock-data';

@Injectable({
  providedIn: 'root'
})
export class TemaService {

  // private apiUrl = `${environment.API_URL}/tema`; // MOCK: desconectado del backend

  // constructor(private http: HttpClient) {} // MOCK: desconectado del backend
  constructor() {}

  // Obtener todos los temas con paginación
  getAllTemas(paginadoDto: PaginadoDto): Observable<any> {
    // return this.http.post<any>(`${this.apiUrl}/all`, paginadoDto, this.httpOptions())
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const activos = MOCK_TEMAS.filter((t) => t.estado);
    return of(toPage(activos, paginadoDto.page, paginadoDto.size)).pipe(delay(MOCK_DELAY));
  }

  // Obtener un tema por ID
  getTemaById(idTema: number): Observable<TemaDto> {
    // const url = `${this.apiUrl}/${idTema}`;
    // return this.http.get<TemaDto>(url)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const tema = MOCK_TEMAS.find((t) => t.idTema === Number(idTema)) ?? MOCK_TEMAS[0];
    return of({ ...tema }).pipe(delay(MOCK_DELAY));
  }

  // Obtener temas por lección con paginación (método GET)
  getTemasByLeccion(lessonId: number, paginadoDto: PaginadoDto): Observable<Page<TemaDto>> {
    // const options = {
    //   headers: new HttpHeaders({
    //     'Content-Type': 'application/json',
    //   }),
    //   body: paginadoDto, // Incluye el cuerpo en la solicitud
    // };
    //
    // return this.http.request<Page<TemaDto>>('POST', `${this.apiUrl}/leccion/${lessonId}`, options)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const temas = MOCK_TEMAS
      .filter((t) => t.estado && t.leccionId === Number(lessonId))
      .sort((a, b) => a.orden - b.orden);
    return of(toPage(temas, paginadoDto?.page ?? 0, paginadoDto?.size ?? 10)).pipe(delay(MOCK_DELAY));
  }



  // Crear un nuevo tema con archivo
  createTema(temaDto: TemaDto, file: File): Observable<any> {
    // const formData: FormData = new FormData();
    // formData.append('titulo', temaDto.titulo);
    // formData.append('orden', temaDto.orden.toString());
    // formData.append('descripcion', temaDto.descripcion);
    // formData.append('leccionId', temaDto.leccionId.toString());
    // formData.append('file', file);
    //
    // return this.http.post(`${this.apiUrl}/create`, formData, { responseType: 'text' })
    //   .pipe(
    //     tap((response) => {
    //       console.log('Respuesta del servidor:', response);
    //     }),
    //     catchError(this.handleError)
    //   );

    // MOCK
    MOCK_TEMAS.push({
      ...temaDto,
      idTema: nextId(MOCK_TEMAS, 'idTema'),
      recursoMultimedia: file ? URL.createObjectURL(file) : temaDto.recursoMultimedia,
      estado: true,
    });
    return of('Tema creado (mock)').pipe(delay(MOCK_DELAY));
  }


  // Actualizar un tema existente con archivo
  updateTema(idTema: number, temaDto: TemaDto, file?: File): Observable<any> {
    // const formData: FormData = new FormData();
    // formData.append('idTema', idTema.toString());
    // formData.append('titulo', temaDto.titulo);
    // formData.append('orden', temaDto.orden.toString());
    // formData.append('descripcion', temaDto.descripcion);
    // formData.append('leccionId', temaDto.leccionId.toString());
    // formData.append('estado', temaDto.estado.toString());
    //
    // if (file) {
    //   formData.append('file', file);
    // }
    //
    // return this.http.put(`${this.apiUrl}/update`, formData, { responseType: 'text' })
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    this.actualizarTemaMock(idTema, temaDto, file);
    return of('Tema actualizado (mock)').pipe(delay(MOCK_DELAY));
  }

  updateTemaWithFile(id: number, tema: TemaDto, file: File): Observable<any> {
    // const formData = new FormData();
    // formData.append('tema', new Blob([JSON.stringify(tema)], { type: 'application/json' }));
    // formData.append('file', file);
    // return this.http.put(`${this.apiUrl}/update`, formData);

    // MOCK
    this.actualizarTemaMock(id, tema, file);
    return of('Tema actualizado (mock)').pipe(delay(MOCK_DELAY));
  }

  updateTemaWithoutFile(id: number, tema: TemaDto): Observable<any> {
    // return this.http.put(`${this.apiUrl}/update/${id}`, tema);

    // MOCK
    this.actualizarTemaMock(id, tema);
    return of('Tema actualizado (mock)').pipe(delay(MOCK_DELAY));
  }

  // Eliminar un tema por ID
  deleteTema(idTema: number): Observable<void> {
    // const url = `${this.apiUrl}/delete/${idTema}`;
    // return this.http.delete<void>(url)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const index = MOCK_TEMAS.findIndex((t) => t.idTema === Number(idTema));
    if (index >= 0) MOCK_TEMAS.splice(index, 1);
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  // MOCK: actualiza el tema en memoria
  private actualizarTemaMock(idTema: number, temaDto: TemaDto, file?: File): void {
    const index = MOCK_TEMAS.findIndex((t) => t.idTema === Number(idTema));
    if (index < 0) return;
    MOCK_TEMAS[index] = {
      ...MOCK_TEMAS[index],
      ...temaDto,
      idTema: Number(idTema),
      recursoMultimedia: file ? URL.createObjectURL(file) : MOCK_TEMAS[index].recursoMultimedia,
    };
  }

  // MOCK: desconectado del backend
  // // Opciones de cabecera para las peticiones (solo para JSON requests)
  // private httpOptions() {
  //   return {
  //     headers: new HttpHeaders({
  //       'Content-Type': 'application/json'
  //     })
  //   };
  // }
  //
  // // Manejo de errores
  // private handleError(error: HttpErrorResponse): Observable<never> {
  //   let errorMessage = 'Ocurrió un error con la API.';
  //   if (error.error instanceof ErrorEvent) {
  //     // Client-side or network error
  //     errorMessage = `Error del lado del cliente: ${error.error.message}`;
  //   } else {
  //     // Backend error
  //     errorMessage = `Error del servidor: ${error.status} ${error.message}`;
  //   }
  //   console.error('Error en la petición HTTP:', error);
  //   return throwError(() => new Error(errorMessage));
  // }
}
