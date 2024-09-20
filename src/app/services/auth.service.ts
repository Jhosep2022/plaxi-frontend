import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UsuarioDto, PersonaDto } from '../models/PersonaDto';  // Importa los modelos que creaste
import { environment } from '../../environments/environment';  // Importa el environment

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.API_URL}/auth`;  // Utiliza la URL desde el environment

  constructor(private http: HttpClient) {}

  // Registro de usuario
  registerUser(usuarioDto: UsuarioDto, personaDto: PersonaDto): Observable<any> {
    const body = {
      usuario: usuarioDto,  
      persona: personaDto    
    };
    return this.http.post(`${this.apiUrl}/register`, body);  // Envía el body al endpoint
  }
  // Inicio de sesión
  loginUser(username: string, password: string): Observable<any> {
    const body = {
      username,  // Enviar 'username' en lugar de 'usernameOrEmail'
      password
    };
    return this.http.post(`${this.apiUrl}/login`, body);
  }

  // Restablecimiento de contraseña
  resetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { email: email });
  }
}
