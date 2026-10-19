import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { faChalkboardTeacher, faCheck, faEnvelope, faIdCard, faLock, faPhone, faUser, faUserGraduate } from '@fortawesome/free-solid-svg-icons';
import { ProfileService } from '../../services/profile.service'; // Importar el servicio de perfiles
import { PerfilDto } from '../../models/PerfilDto';
import { NgClass } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms'; // Importar el modelo de perfil

@Component({
    selector: 'app-registrar-usuario',
    templateUrl: './registrar-usuario.component.html',
    styleUrls: ['./registrar-usuario.component.css'],
    imports: [NgClass, FaIconComponent, FormsModule]
})
export class RegistrarUsuarioComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private profileService = inject(ProfileService);

  // Íconos (FontAwesome)
  faChalkboardTeacher = faChalkboardTeacher;
  faCheck = faCheck;
  faEnvelope = faEnvelope;
  faIdCard = faIdCard;
  faLock = faLock;
  faPhone = faPhone;
  faUser = faUser;
  faUserGraduate = faUserGraduate;

  readonly isTutorSelected = signal<boolean>(true);
  readonly username = signal<string>('');
  readonly password = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly gmail = signal<string>('');
  readonly nombre = signal<string>('');
  readonly primerApellido = signal<string>('');
  readonly segundoApellido = signal<string>('');
  readonly telefono = signal<string>('');
  readonly ci = signal<string>('');
  readonly errorMessage = signal<string>('');
  correosRegistrados: string[] = [];

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
    this.isTutorSelected.set(option === 'tutor');
  }

  onRegister() {
    if (!this.username() || !this.password() || !this.confirmPassword() || !this.gmail() || !this.nombre() || !this.primerApellido() || !this.telefono() || !this.ci()) {
      this.errorMessage.set('Por favor, completa todos los campos.');
      return;
    }

    if (!this.isValidEmail(this.gmail())) {
      this.errorMessage.set('El formato del correo no es válido.');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Las contraseñas no coinciden. Por favor, intenta de nuevo.');
      return;
    }

    if (this.correosRegistrados.includes(this.gmail())) {
      alert('El correo ya se encuentra registrado.');
      return;
    }

    const usuarioDto = {
      username: this.username(),
      password: this.password(),
      gmail: this.gmail(),
      status: true,
      id_rol: this.isTutorSelected() ? 3 : 2
    };

    const personaDto = {
      nombre: this.nombre(),
      primer_apellido: this.primerApellido(),
      segundo_apellido: this.segundoApellido(),
      telefono: this.telefono(),
      ci: this.ci()
    };

    this.authService.registerUser(usuarioDto, personaDto).subscribe({
      next: (response) => {
        console.log('Registro exitoso:', response);
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        console.error('Error en el registro:', err);
        this.errorMessage.set('Error al registrar. Por favor, inténtalo nuevamente.');
      }
    });
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  redirectToLogin() {
    this.router.navigate(['/auth/login']);
  }

  validateNumberInput(event: KeyboardEvent): void {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      // Previene la entrada de caracteres no numéricos
      event.preventDefault();
    }
  }
}
