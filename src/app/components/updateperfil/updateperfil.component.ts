import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PerfilService } from '../../services/profile.service';  // Importa el servicio
import { ActualizarPerfilDto } from '../../models/PerfilDto';  // Importa el modelo
import { HttpClient } from '@angular/common/http';  // Para manejar las solicitudes HTTP

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
    file: undefined  // Cambiar null a undefined para cumplir con el tipo esperado
  };

  selectedFile: File | null = null;

  constructor(private router: Router, private perfilService: PerfilService) {}  // Inyecta el servicio

  ngOnInit(): void {
    const idUsuario = localStorage.getItem('idUsuario');  // Obtiene el ID del usuario desde localStorage
    if (idUsuario) {
      // Cargar los datos del perfil y asignarlos a perfilDto para mostrar en el formulario
      this.perfilService.getProfile(Number(idUsuario)).subscribe({
        next: (response: any) => {
          // Rellenar el perfilDto con los datos del perfil
          this.perfilDto = {
            username: response.username,
            gmail: response.gmail,
            nombre: response.nombre,
            primerApellido: response.primerApellido,
            segundoApellido: response.segundoApellido,
            telefono: response.telefono,
            ci: response.ci,
            file: undefined  // Dejar vacío hasta que el usuario seleccione un archivo
          };
        },
        error: (err: any) => {
          console.error('Error al cargar el perfil del usuario:', err);
        }
      });
    } else {
      this.router.navigate(['/login']);  // Redirige al login si no hay idUsuario
    }
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];  // Obtiene el archivo seleccionado
  }

  actualizarPerfil() {
    if (this.selectedFile) {
      this.perfilDto.file = this.selectedFile;  // Si hay archivo, asigna al perfilDto
    }
  
    const idUsuario = localStorage.getItem('idUsuario');  // Asegúrate de tener el ID del usuario
  
    if (idUsuario) {
      this.perfilService.updateProfile(Number(idUsuario), this.perfilDto).subscribe({
        next: (response) => {
          console.log('Perfil actualizado:', response);
          this.router.navigate(['/perfil']);  // Redirige de nuevo al perfil
        },
        error: (err) => {
          console.error('Error al actualizar el perfil:', err);
        }
      });
    }
  }
  

  cancelar() {
    this.router.navigate(['/perfil']);  // Redirige de vuelta a la página de perfil
  }
}
