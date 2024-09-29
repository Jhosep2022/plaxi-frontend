import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { UsuarioDto, PersonaDto } from '../models/PersonaDto'; // Importa los modelos que creaste
import { environment } from '../../environments/environment'; // Importa el environment

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.API_URL}/auth`; // Utiliza la URL desde el environment
  private userId: number | null = null; // Variable para almacenar el ID del usuario logueado
  private isLoggedInSubject = new BehaviorSubject<boolean>(false); // BehaviorSubject para mantener el estado de inicio de sesión

  constructor(private http: HttpClient) {}

  // Registro de usuario
  registerUser(usuarioDto: UsuarioDto, personaDto: PersonaDto): Observable<any> {
    const body = {
      usuario: usuarioDto,
      persona: personaDto,
    };
    return this.http.post(`${this.apiUrl}/register`, body);
  }

  loginUser(username: string, password: string): Observable<any> {
    const body = {
      username,
      password,
    };
    return this.http.post(`${this.apiUrl}/login`, body);
  }

  resetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password?email=${email}`, {});
  }

  getCurrentUserId(): number | null {
    const storedUserId = localStorage.getItem('userId');
    return storedUserId ? parseInt(storedUserId, 10) : null;
  }

  setCurrentUserId(userId: number): void {
    this.userId = userId;
    localStorage.setItem('userId', userId.toString());
    this.isLoggedInSubject.next(true);
  }

  logout(): void {
    localStorage.removeItem('userId');
    this.userId = null;
    this.isLoggedInSubject.next(false);
  }


  isAuthenticated(): Observable<boolean> {
    return this.isLoggedInSubject.asObservable();
  }
}
