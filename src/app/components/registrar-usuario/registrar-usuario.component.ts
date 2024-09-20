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

  // Propiedades para los datos del formulario
  username: string = '';
  password: string = '';
  confirmPassword: string = ''; // Campo para confirmar contraseña
  gmail: string = '';
  nombre: string = '';
  primerApellido: string = '';
  segundoApellido: string = '';
  telefono: string = '';
  ci: string = '';
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  // Método para seleccionar la opción de Tutor o Estudiante
  selectOption(option: string) {
    this.isTutorSelected = option === 'tutor';
  }

  // Método para registrar usuario
  onRegister() {
    // Validación de campos vacíos y formato de correo
    if (!this.username || !this.password || !this.confirmPassword || !this.gmail || !this.nombre || !this.primerApellido || !this.telefono || !this.ci) {
      this.errorMessage = 'Por favor, completa todos los campos.';
      return;
    }

    // Validación del formato del correo
    if (!this.isValidEmail(this.gmail)) {
      this.errorMessage = 'El formato del correo no es válido.';
      return;
    }

    // Validación para comprobar si las contraseñas coinciden
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden. Por favor, intenta de nuevo.';
      return;
    }

    const usuarioDto = {
      username: this.username,
      password: this.password,
      gmail: this.gmail,
      status: true,
      id_rol: this.isTutorSelected ? 1 : 2
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
        console.error('Error en el registro:', err);
        this.errorMessage = 'Error al registrar. Por favor, inténtalo nuevamente.';
      }
    });
  }

  // Validación del formato del correo electrónico
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Método para redirigir al login
  redirectToLogin() {
    this.router.navigate(['/login']);
  }
}
