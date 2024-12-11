import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  passwordVisible: boolean = false;

  constructor(private router: Router, private authService: AuthService) {}

  onLogin() {

    if (!this.username || !this.password) {
      this.errorMessage = 'Por favor, ingresa tu nombre de usuario y tu contraseña.';
      return;
    }

    this.authService.loginUser(this.username, this.password).subscribe({
      next: (response) => {
        if (response.success) {
          localStorage.setItem('idUsuario', response.data.id_usuario.toString());
          localStorage.setItem('userRole', response.data.id_rol.toString());
          this.router.navigate(['/home']);
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

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }
}
