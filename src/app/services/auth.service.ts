import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { PersonaDto, UsuarioDto } from '../models/PersonaDto';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.API_URL}/auth`;
  private userId: number | null = null;
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.checkLoginStatus());

  constructor(private http: HttpClient) {}

  // Registro de usuario
  registerUser(usuarioDto: UsuarioDto, personaDto: PersonaDto): Observable<{ success: boolean }> {
    const body = {
      usuario: usuarioDto,
      persona: personaDto,
    };
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/register`, body);
  }

  loginUser(username: string, password: string): Observable<{ token: string }> {
    const body = { username, password };
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, body);
  }

  resetPassword(email: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/reset-password?email=${email}`, {});
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): Observable<boolean> {
    return this.isLoggedInSubject.asObservable();
  }

  // Obtener el ID del usuario almacenado en localStorage
  getCurrentUserId(): number | null {
    const storedUserId = localStorage.getItem('userId');
    return storedUserId ? parseInt(storedUserId, 10) : null;
  }

  // Establecer el ID del usuario en localStorage
  setCurrentUserId(userId: number): void {
    this.userId = userId;
    localStorage.setItem('userId', userId.toString());
    this.isLoggedInSubject.next(true);
  }

  // Eliminar el ID del usuario y cerrar sesión
  logout(): void {
    localStorage.removeItem('userId');
    this.userId = null;
    this.isLoggedInSubject.next(false);
  }

  // Verificar el estado de autenticación al inicializar
  private checkLoginStatus(): boolean {
    const storedUserId = localStorage.getItem('userId');
    return storedUserId !== null;
  }
}
