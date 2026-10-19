import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { faCheck, faLock, faUser } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../core/auth/session.service';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    imports: [FormsModule, FaIconComponent, RouterLink]
})
export class LoginComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private session = inject(SessionService);

  // Íconos (FontAwesome)
  faCheck = faCheck;
  faLock = faLock;
  faUser = faUser;

  readonly username = signal('');
  readonly password = signal('');
  readonly errorMessage = signal('');

  onLogin() {

    if (!this.username() || !this.password()) {
      this.errorMessage.set('Por favor, ingresa tu nombre de usuario y tu contraseña.');
      return;
    }

    this.authService.loginUser(this.username(), this.password()).subscribe({
      next: (response) => {
        if (response.success) {
          // Guarda la sesión, carga los espacios del usuario y entra a su inicio
          this.session.iniciarSesion(response.data.id_usuario).subscribe(() => {
            this.router.navigateByUrl(this.session.rutaPostLogin());
          });
        } else {
          this.errorMessage.set('Inicio de sesión fallido. Usuario no encontrado.');
        }
      },
      error: (err) => {
        console.error('Error en el inicio de sesión:', err);
        this.errorMessage.set('Error en el servidor. Inténtalo de nuevo más tarde.');
      }
    });
  }
}
