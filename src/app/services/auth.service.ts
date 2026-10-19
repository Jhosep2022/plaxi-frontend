import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http'; // MOCK: desconectado del backend
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, delay } from 'rxjs/operators';
// import { environment } from '../../environments/environment'; // MOCK: desconectado del backend
import { PersonaDto, UsuarioDto } from '../models/PersonaDto';
import { MOCK_DELAY, MOCK_PERFILES } from '../mocks/mock-data';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // private apiUrl = `${environment.API_URL}/auth`; // MOCK: desconectado del backend
  private userId: number | null = null;
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);

  // constructor(private http: HttpClient) {} // MOCK: desconectado del backend
  constructor() {}

  // Registro de usuario
  registerUser(usuarioDto: UsuarioDto, personaDto: PersonaDto): Observable<any> {
    // const body = {
    //   usuario: usuarioDto,
    //   persona: personaDto,
    // };
    // return this.http.post(`${this.apiUrl}/register`, body);

    // MOCK
    return of({ success: true, message: 'Usuario registrado (mock)' }).pipe(delay(MOCK_DELAY));
  }

  // Login del usuario
  // MOCK: cualquier contraseña funciona. El rol depende del username:
  //   "admin" (dirección), "docente", "padre"; cualquier otro -> "estudiante"
  loginUser(username: string, password: string): Observable<any> {
    // const body = { username, password };
    // return this.http.post<any>(`${this.apiUrl}/login`, body).pipe(
    //   tap((response) => {
    //     if (response.success && response.data?.id_usuario) {
    //       this.setCurrentUserId(response.data.id_usuario);
    //     }
    //   })
    // );

    // MOCK
    const perfil =
      MOCK_PERFILES.find((p) => p.username === username.toLowerCase()) ??
      MOCK_PERFILES.find((p) => p.username === 'estudiante')!;
    const response = {
      success: true,
      data: { id_usuario: perfil.idUsuario, id_rol: Number(perfil.id_rol) },
    };
    return of(response).pipe(
      delay(MOCK_DELAY),
      tap((res) => this.setCurrentUserId(res.data.id_usuario))
    );
  }

  // Resetear contraseña
  resetPassword(email: string): Observable<any> {
    // return this.http.post(`${this.apiUrl}/reset-password?email=${email}`, {});

    // MOCK
    return of({ success: true, message: `Correo enviado a ${email} (mock)` }).pipe(delay(MOCK_DELAY));
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
