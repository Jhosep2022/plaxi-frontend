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

  // Obtener el ID del usuario almacenado en localStorage
  getCurrentUserId(): number | null {
    const storedUserId = localStorage.getItem('userId');
    console.log('Recuperando userId de localStorage:', storedUserId); // Log para ver el valor recuperado
    return storedUserId ? parseInt(storedUserId, 10) : null;
  }

  // Establecer el ID del usuario en localStorage
  setCurrentUserId(userId: number): void {
    this.userId = userId;
    localStorage.setItem('userId', userId.toString());
    console.log('userId guardado en localStorage:', userId); // Log para verificar que se guardó correctamente
    this.isLoggedInSubject.next(true);
  }

  // Eliminar el ID del usuario y cerrar sesión
  logout(): void {
    localStorage.removeItem('userId');
    this.userId = null;
    console.log('Sesión cerrada, userId eliminado'); // Log para confirmar que se eliminó el userId
    this.isLoggedInSubject.next(false);
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): Observable<boolean> {
    return this.isLoggedInSubject.asObservable();
  }
}
