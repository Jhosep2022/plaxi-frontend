import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PerfilDto, ActualizarPerfilDto } from '../models/PerfilDto';
import { environment } from '../../environments/environment'; 

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private apiUrl = `${environment.API_URL}/perfil`;  

  constructor(private http: HttpClient) {}

  // Obtener todos los perfiles
  getAllProfiles(): Observable<PerfilDto[]> {
    return this.http.get<PerfilDto[]>(`${this.apiUrl}`);
  }

  // Obtener un perfil específico por ID
  getProfile(idUsuario: number): Observable<PerfilDto> {
    return this.http.get<PerfilDto>(`${this.apiUrl}/${idUsuario}`);
  }

  // Actualizar un perfil
  updateProfile(idUsuario: number, perfilDto: ActualizarPerfilDto): Observable<any> {
    const formData = new FormData();
    formData.append('username', perfilDto.username);
    formData.append('gmail', perfilDto.gmail);
    formData.append('nombre', perfilDto.nombre);
    formData.append('primerApellido', perfilDto.primerApellido);
    formData.append('segundoApellido', perfilDto.segundoApellido);
    formData.append('telefono', perfilDto.telefono);
    formData.append('ci', perfilDto.ci);

    if (perfilDto.file) {
      formData.append('file', perfilDto.file);
    }

    return this.http.put(`${this.apiUrl}/${idUsuario}`, formData);
  }


  // Borrado lógico del perfil
  deleteProfile(idUsuario: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${idUsuario}`);
  }
}
