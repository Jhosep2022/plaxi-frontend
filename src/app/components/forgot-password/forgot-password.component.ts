import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';  // Asegúrate de que el servicio esté en la ruta correcta
import { Router, RouterLink } from '@angular/router';
import { faCheck, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

@Component({
    selector: 'app-forgot-password',
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css'],
    imports: [FormsModule, FaIconComponent, RouterLink]
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Íconos (FontAwesome)
  faCheck = faCheck;
  faEnvelope = faEnvelope;

  readonly email = signal('');

  onSubmit(): void {
    if (!this.email()) {
      alert('Por favor, introduce un correo electrónico.');
      return;
    }

    this.authService.resetPassword(this.email()).subscribe({
      next: (response) => {
        alert('Se ha enviado un enlace de restablecimiento de contraseña a tu correo.');
        this.router.navigate(['/auth/login']);  // Redirige al login después de enviar el correo
      },
      error: (err) => {
        console.error('Error al enviar el correo de restablecimiento:', err);
        alert('Hubo un problema al intentar enviar el correo. Inténtalo de nuevo más tarde.');
      }
    });
  }
}
