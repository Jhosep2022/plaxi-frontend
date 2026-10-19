import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http'; // MOCK: desconectado del backend
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { PerfilDto, ActualizarPerfilDto } from '../models/PerfilDto'; //src\app\models\perfilDto.ts
// import { environment } from '../../environments/environment'; // MOCK: desconectado del backend
import { MOCK_DELAY, MOCK_PERFILES } from '../mocks/mock-data';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  // private apiUrl = `${environment.API_URL}/perfil`; // MOCK: desconectado del backend

  // constructor(private http: HttpClient) {} // MOCK: desconectado del backend
  constructor() {}

  // Obtener todos los perfiles
  getAllProfiles(): Observable<PerfilDto[]> {
    // return this.http.get<PerfilDto[]>(`${this.apiUrl}/all`);

    // MOCK
    return of([...MOCK_PERFILES]).pipe(delay(MOCK_DELAY));
  }

  // Obtener un perfil específico por ID
  getProfile(idUsuario: number): Observable<PerfilDto> {
    // return this.http.get<PerfilDto>(`${this.apiUrl}/${idUsuario}`);

    // MOCK
    const perfil = MOCK_PERFILES.find((p) => p.idUsuario === Number(idUsuario)) ?? MOCK_PERFILES[1];
    return of({ ...perfil }).pipe(delay(MOCK_DELAY));
  }

  updateProfile(idUsuario: number, perfilDto: ActualizarPerfilDto): Observable<any> {
    // const formData = new FormData();
    // formData.append('username', perfilDto.username);
    // formData.append('gmail', perfilDto.gmail);
    // formData.append('nombre', perfilDto.nombre);
    // formData.append('primerApellido', perfilDto.primerApellido);
    // formData.append('segundoApellido', perfilDto.segundoApellido);
    // formData.append('telefono', perfilDto.telefono);
    // formData.append('ci', perfilDto.ci);
    //
    // if (perfilDto.file) {
    //   formData.append('file', perfilDto.file);
    // }
    //
    // return this.http.put(`${this.apiUrl}/${idUsuario}`, formData, {
    //   reportProgress: true, // Esto ayudará a capturar más detalles en caso de error
    //   observe: 'events', // Para obtener eventos de progreso si lo necesitas
    // });

    // MOCK
    const perfil = MOCK_PERFILES.find((p) => p.idUsuario === Number(idUsuario));
    if (perfil) {
      const { file, ...datos } = perfilDto;
      Object.assign(perfil, datos);
      if (file) perfil.imagenUrl = URL.createObjectURL(file);
    }
    return of({ success: true, message: 'Perfil actualizado (mock)' }).pipe(delay(MOCK_DELAY));
  }



  // Borrado lógico del perfil
  deleteProfile(idUsuario: number): Observable<any> {
    // return this.http.delete(`${this.apiUrl}/${idUsuario}`);

    // MOCK
    const perfil = MOCK_PERFILES.find((p) => p.idUsuario === Number(idUsuario));
    if (perfil) perfil.status = false;
    return of({ success: true, message: 'Perfil eliminado (mock)' }).pipe(delay(MOCK_DELAY));
  }
}
