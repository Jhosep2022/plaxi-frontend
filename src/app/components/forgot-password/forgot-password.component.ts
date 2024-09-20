import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';  // Asegúrate de que el servicio esté en la ruta correcta
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    if (!this.email) {
      alert('Por favor, introduce un correo electrónico.');
      return;
    }

    this.authService.resetPassword(this.email).subscribe({
      next: (response) => {
        alert('Se ha enviado un enlace de restablecimiento de contraseña a tu correo.');
        this.router.navigate(['/login']);  // Redirige al login después de enviar el correo
      },
      error: (err) => {
        console.error('Error al enviar el correo de restablecimiento:', err);
        alert('Hubo un problema al intentar enviar el correo. Inténtalo de nuevo más tarde.');
      }
    });
  }
}
