import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ProfileService } from '../../services/profile.service'; // Importar el servicio de perfiles
import { PerfilDto } from '../../models/PerfilDto'; // Importar el modelo de perfil

@Component({
  selector: 'app-registrar-usuario',
  templateUrl: './registrar-usuario.component.html',
  styleUrls: ['./registrar-usuario.component.css']
})
export class RegistrarUsuarioComponent implements OnInit {
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
  correosRegistrados: string[] = []; // Lista de correos ya registrados

  constructor(
    private authService: AuthService,
    private router: Router,
    private profileService: ProfileService // Inyectar el servicio de perfiles
  ) {}

  ngOnInit(): void {
    this.cargarCorreosRegistrados();
  }

  // Cargar los correos registrados
  private cargarCorreosRegistrados(): void {
    this.profileService.getAllProfiles().subscribe({
      next: (perfiles: PerfilDto[]) => {
        this.correosRegistrados = perfiles.map((perfil) => perfil.gmail);
        console.log('Correos registrados cargados:', this.correosRegistrados);
      },
      error: (error) => {
        console.error('Error al cargar los correos registrados:', error);
      },
    });
  }

  selectOption(option: string) {
    this.isTutorSelected = option === 'tutor';
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

    if (this.correosRegistrados.includes(this.gmail)) {
      alert('El correo ya se encuentra registrado.');
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
        console.error('Error en el registro:', err);
        this.errorMessage = 'Error al registrar. Por favor, inténtalo nuevamente.';
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
