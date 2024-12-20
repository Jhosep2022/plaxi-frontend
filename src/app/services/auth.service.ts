import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PersonaDto, UsuarioDto } from '../models/PersonaDto';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.API_URL}/auth`;
  private userId: number | null = null;
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {}

  // Registro de usuario
  registerUser(usuarioDto: UsuarioDto, personaDto: PersonaDto): Observable<any> {
    const body = {
      usuario: usuarioDto,
      persona: personaDto,
    };
    return this.http.post(`${this.apiUrl}/register`, body);
  }

  // Login del usuario
  loginUser(username: string, password: string): Observable<any> {
    const body = { username, password };
    return this.http.post<any>(`${this.apiUrl}/login`, body).pipe(
      tap((response) => {
        if (response.success && response.data?.id_usuario) {
          this.setCurrentUserId(response.data.id_usuario);
        }
      })
    );
  }

  // Resetear contraseña
  resetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password?email=${email}`, {});
  }

  // Obtener el ID del usuario almacenado en localStorage
  getCurrentUserId(): number | null {
    try {
      const storedUserId = localStorage.getItem('userId');
      console.log('Recuperando userId de localStorage:', storedUserId);
      return storedUserId ? parseInt(storedUserId, 10) : null;
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  }

  // Establecer el ID del usuario en localStorage
  setCurrentUserId(userId: number): void {
    this.userId = userId;
    localStorage.setItem('userId', userId.toString());
    console.log('userId guardado en localStorage:', userId);
    this.isLoggedInSubject.next(true);
  }

  // Eliminar el ID del usuario y cerrar sesión
  logout(): void {
    localStorage.removeItem('userId');
    this.userId = null;
    console.log('Sesión cerrada, userId eliminado');
    this.isLoggedInSubject.next(false);
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): Observable<boolean> {
    return this.isLoggedInSubject.asObservable();
  }
}
