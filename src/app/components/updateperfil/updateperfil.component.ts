import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PerfilService } from '../../services/profile.service';
import { ActualizarPerfilDto } from '../../models/perfilDto';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-updateperfil',
  templateUrl: './updateperfil.component.html',
  styleUrls: ['./updateperfil.component.css']
})
export class UpdateperfilComponent implements OnInit {
  perfilDto: ActualizarPerfilDto = {
    username: '',
    gmail: '',
    nombre: '',
    primerApellido: '',
    segundoApellido: '',
    telefono: '',
    ci: '',
    file: undefined
  };

  selectedFile: File | null = null;
  fileError: string | null = null; // Mensaje de error para el archivo

  constructor(private router: Router, private perfilService: PerfilService) {}

  ngOnInit(): void {
    const idUsuario = localStorage.getItem('idUsuario');
    if (idUsuario) {
      // Cargar los datos del perfil y asignarlos a perfilDto para mostrar en el formulario
      this.perfilService.getProfile(Number(idUsuario)).subscribe({
        next: (response: any) => {
          this.perfilDto = {
            username: response.username,
            gmail: response.gmail,
            nombre: response.nombre,
            primerApellido: response.primerApellido,
            segundoApellido: response.segundoApellido,
            telefono: response.telefono,
            ci: response.ci,
            file: undefined
          };
        },
        error: (err: any) => {
          console.error('Error al cargar el perfil del usuario:', err);
        }
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    // Validar que sea un archivo de imagen con extensión válida
    const validExtensions = ['image/jpeg', 'image/png', 'image/jpg'];
    if (file && validExtensions.includes(file.type)) {
      this.selectedFile = file;
      this.fileError = null; // Limpiar mensaje de error si la validación es correcta
    } else {
      this.fileError = 'Por favor, selecciona un archivo con formato .jpg, .jpeg o .png';
      this.selectedFile = null; // Si no es válido, no se guarda el archivo
    }
  }

  actualizarPerfil() {
    // Validar que todos los campos estén llenos antes de enviar la solicitud
    if (!this.perfilDto.username || !this.perfilDto.gmail || !this.perfilDto.nombre || !this.perfilDto.primerApellido || !this.perfilDto.segundoApellido || !this.perfilDto.telefono || !this.perfilDto.ci) {
      console.error('Por favor, completa todos los campos.');
      return;
    }

    if (this.selectedFile) {
      this.perfilDto.file = this.selectedFile;
    }

    const idUsuario = localStorage.getItem('idUsuario');
    if (idUsuario) {
      this.perfilService.updateProfile(Number(idUsuario), this.perfilDto).subscribe({
        next: (response) => {
          console.log('Perfil actualizado:', response);
          this.router.navigate(['/perfil']);
        },
        error: (err) => {
          console.error('Error al actualizar el perfil:', err);
        }
      });
    }
  }

  cancelar() {
    this.router.navigate(['/perfil']);
  }
}
