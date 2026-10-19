import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { faCheck, faLock, faUser } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormsModule, FaIconComponent, RouterLink]
})
export class LoginComponent {
  // Íconos (FontAwesome)
  faCheck = faCheck;
  faLock = faLock;
  faUser = faUser;

  username: string = '';
  password: string = '';
  errorMessage: string = '';

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
}
