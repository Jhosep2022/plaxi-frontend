import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';  // Asegúrate de tener la ruta correcta a tu servicio
import { Router } from '@angular/router';  // Para redirigir al login después del registro

@Component({
  selector: 'app-registrar-usuario',
  templateUrl: './registrar-usuario.component.html',
  styleUrls: ['./registrar-usuario.component.css']
})
export class RegistrarUsuarioComponent {
  isTutorSelected: boolean = true;

  // Definir las propiedades para los datos del formulario
  username: string = '';
  password: string = '';
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
    if (!this.username || !this.password || !this.gmail || !this.nombre || !this.primerApellido || !this.telefono || !this.ci) {
      this.errorMessage = 'Por favor, completa todos los campos.';
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

  // Método para redirigir al login
  redirectToLogin() {
    this.router.navigate(['/login']);
  }
}
