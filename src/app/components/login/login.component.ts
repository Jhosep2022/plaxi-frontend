import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';  // Definir la propiedad username
  password: string = '';  // Definir la propiedad password
  errorMessage: string = '';  // Para almacenar mensajes de error

  constructor(private router: Router, private authService: AuthService) {}

  onLogin() {
    // Validación básica
    if (!this.username || !this.password) {
      this.errorMessage = 'Por favor, ingresa tu nombre de usuario y tu contraseña.';
      return;
    }

    // Llama al servicio de autenticación con el username y contraseña
    this.authService.loginUser(this.username, this.password).subscribe({
      next: (response) => {
        if (response.success) {
          localStorage.setItem('idUsuario', response.data.id_usuario);  // Guarda el ID del usuario en localStorage
          this.router.navigate(['/perfil']);  // Redirigir al perfil después de iniciar sesión
        } else {
          this.errorMessage = 'Inicio de sesión fallido. Usuario no encontrado.';
        }
      },
      error: (err) => {
        console.error('Error en el inicio de sesión:', err);
        this.errorMessage = 'Error en el servidor. Inténtalo de nuevo más tarde.';
      }
    });
  }
}
