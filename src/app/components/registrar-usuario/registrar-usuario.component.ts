import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';  // Ruta correcta al servicio
import { Router } from '@angular/router';  // Para redirigir al login

@Component({
  selector: 'app-registrar-usuario',
  templateUrl: './registrar-usuario.component.html',
  styleUrls: ['./registrar-usuario.component.css']
})
export class RegistrarUsuarioComponent {
  isTutorSelected: boolean = true;

  username: string = '';
  password: string = '';
  confirmPassword: string = '';
  gmail: string = '';
  nombre: string = '';
  primerApellido: string = '';
  segundoApellido: string = '';
  telefono: string = '';
  ci: string = '';
  errorMessage: string = '';

  // Variables para la visibilidad de contraseñas
  isPasswordVisible: boolean = false;
  isConfirmPasswordVisible: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  selectOption(option: string) {
    this.isTutorSelected = option === 'tutor';
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.isConfirmPasswordVisible = !this.isConfirmPasswordVisible;
  }

  onRegister() {
    if (!this.username || !this.password || !this.confirmPassword || !this.gmail || !this.nombre || !this.primerApellido || !this.telefono || !this.ci) {
      this.errorMessage = 'Por favor, completa todos los campos.';
      return;
    }

    if (!this.isValidEmail(this.gmail)) {
      this.errorMessage = 'El formato del correo no es válido.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden. Por favor, intenta de nuevo.';
      return;
    }

    const usuarioDto = {
      username: this.username,
      password: this.password,
      gmail: this.gmail,
      status: true,
      id_rol: this.isTutorSelected ? 3 : 2
    };

    const personaDto = {
      nombre: this.nombre,
      primer_apellido: this.primerApellido,
      segundo_apellido: this.segundoApellido,
      telefono: this.telefono,
      ci: this.ci
    };

    this.authService.registerUser(usuarioDto, personaDto).subscribe({
      next: (response) => {
        console.log('Registro exitoso:', response);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        if (err.error.message === 'El nombre de usuario ya está en uso.') {
          this.errorMessage = 'El nombre de usuario ya está en uso. Por favor, elige otro.';
        } else {
          this.errorMessage = 'Error al registrar. Por favor, inténtalo nuevamente.';
        }
      }
    });
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  redirectToLogin() {
    this.router.navigate(['/login']);
  }

  validateNumberInput(event: KeyboardEvent): void {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      // Previene la entrada de caracteres no numéricos
      event.preventDefault();
    }
  }
}
