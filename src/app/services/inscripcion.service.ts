import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http'; // MOCK: desconectado del backend
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
// import { catchError } from 'rxjs/operators'; // MOCK: desconectado del backend
// import { environment } from '../../environments/environment'; // MOCK: desconectado del backend
import { InscripcionDto } from '../models/inscripcionDto';
import { InscripcionResponseDto } from '../models/inscripcionDto';
import { MOCK_CURSOS, MOCK_DELAY, MOCK_INSCRIPCIONES, MOCK_PERFILES, nextId } from '../mocks/mock-data';

@Injectable({
  providedIn: 'root'
})
export class InscripcionService {

  // private apiUrl = `${environment.API_URL}/inscripciones`; // MOCK: desconectado del backend

  // constructor(private http: HttpClient) {} // MOCK: desconectado del backend
  constructor() {}

  // Obtener todas las inscripciones
  getAllInscripciones(): Observable<InscripcionResponseDto[]> {
    // return this.http.get<InscripcionResponseDto[]>(this.apiUrl)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    return of([...MOCK_INSCRIPCIONES]).pipe(delay(MOCK_DELAY));
  }

  // Obtener una inscripción por ID
  getInscripcionById(id: number): Observable<InscripcionResponseDto> {
    // const url = `${this.apiUrl}/${id}`;
    // return this.http.get<InscripcionResponseDto>(url)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const inscripcion = MOCK_INSCRIPCIONES.find((i) => i.idInscripcion === Number(id)) ?? MOCK_INSCRIPCIONES[0];
    return of(inscripcion).pipe(delay(MOCK_DELAY));
  }

  // Crear una nueva inscripción
  createInscripcion(inscripcionDto: InscripcionDto): Observable<InscripcionResponseDto> {
    // return this.http.post<InscripcionResponseDto>(this.apiUrl, inscripcionDto, this.httpOptions())
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const curso = MOCK_CURSOS.find((c) => c.idCurso === Number(inscripcionDto.cursoId));
    const usuario = MOCK_PERFILES.find((p) => p.idUsuario === Number(inscripcionDto.usuarioId));
    const nueva: InscripcionResponseDto = {
      idInscripcion: nextId(MOCK_INSCRIPCIONES, 'idInscripcion'),
      fechaInscripcion: new Date().toISOString().slice(0, 10),
      estadoInscripcion: 'ACTIVA',
      usuarioId: inscripcionDto.usuarioId,
      usuarioNombre: usuario ? `${usuario.nombre} ${usuario.primerApellido}` : 'Usuario mock',
      usuarioGmail: usuario?.gmail ?? 'usuario@plaxi.com',
      cursoId: inscripcionDto.cursoId,
      cursoNombre: curso?.nombre ?? 'Curso mock',
      usuarioCreadorId: 3,
      cursoDescripcion: curso?.descripcion ?? '',
      cursoPortadaUrl: curso?.portada ?? null,
    };
    MOCK_INSCRIPCIONES.push(nueva);
    return of(nueva).pipe(delay(MOCK_DELAY));
  }

  // Actualizar una inscripción existente
  updateInscripcion(id: number, inscripcionDto: InscripcionDto): Observable<InscripcionResponseDto> {
    // const url = `${this.apiUrl}/${id}`;
    // return this.http.put<InscripcionResponseDto>(url, inscripcionDto, this.httpOptions())
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const inscripcion = MOCK_INSCRIPCIONES.find((i) => i.idInscripcion === Number(id)) ?? MOCK_INSCRIPCIONES[0];
    Object.assign(inscripcion, inscripcionDto);
    return of(inscripcion).pipe(delay(MOCK_DELAY));
  }

  // Eliminar una inscripción por ID
  deleteInscripcion(id: number): Observable<void> {
    // const url = `${this.apiUrl}/${id}`;
    // return this.http.delete<void>(url)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    const index = MOCK_INSCRIPCIONES.findIndex((i) => i.idInscripcion === Number(id));
    if (index >= 0) MOCK_INSCRIPCIONES.splice(index, 1);
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  // Obtener inscripciones por ID de usuario
  getInscripcionesByUsuarioId(usuarioId: number): Observable<InscripcionResponseDto[]> {
    // const url = `${this.apiUrl}/usuario/${usuarioId}`;
    // return this.http.get<InscripcionResponseDto[]>(url)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    return of(MOCK_INSCRIPCIONES.filter((i) => i.usuarioId === Number(usuarioId))).pipe(delay(MOCK_DELAY));
  }

  // Obtener inscripciones por ID de curso
  getInscripcionesByCursoId(cursoId: number): Observable<InscripcionResponseDto[]> {
    // const url = `${this.apiUrl}/curso/${cursoId}`;
    // return this.http.get<InscripcionResponseDto[]>(url)
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    return of(MOCK_INSCRIPCIONES.filter((i) => i.cursoId === Number(cursoId))).pipe(delay(MOCK_DELAY));
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
