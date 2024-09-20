import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PerfilService } from '../../services/profile.service';  // Ruta correcta al servicio
import { faEdit, faTrash, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';  // Importar icono de edición y cerrar sesión

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {

  faEdit = faEdit;  // Icono de edición
  faTrash = faTrash;  // Icono de eliminación
  faSignOut = faSignOutAlt;  // Icono de cerrar sesión
  user = {
    idUsuario: 2,
    username: 'johndoe',
    gmail: 'johndoe@gmail.com',
    status: true,
    nombre: 'John',
    primerApellido: 'Doe',
    segundoApellido: 'Smith',
    telefono: '987654321',
    ci: '12345678',
    imagenUrl: 'http://localhost:9000/fotoperfil/Imagen%20de%20WhatsApp%202024-01-05%20a%20las%2018.37.11_b0fdf273.jpg'
  };

  isDialogOpen = false;  // Controla si el diálogo está abierto

  constructor(private perfilService: PerfilService, private router: Router) {}

  ngOnInit(): void {
    const idUsuario = localStorage.getItem('idUsuario');  // Obtiene el ID del usuario desde localStorage
    if (idUsuario) {
      this.perfilService.getProfile(Number(idUsuario)).subscribe({
        next: (response: any) => {
          this.user = response;  // Actualiza el perfil del usuario con la respuesta
        },
        error: (err: any) => {
          console.error('Error al cargar el perfil del usuario:', err);
        }
      });
    } else {
      this.router.navigate(['/login']);  // Redirige al login si no hay idUsuario
    }
  }

  editarPerfil() {
    this.router.navigate(['/updateperfil']);  // Redirige al formulario de actualización de perfil
  }

  abrirDialogoConfirmacion() {
    this.isDialogOpen = true;  // Abre el diálogo de confirmación
  }

  manejarConfirmacion(isConfirmed: boolean) {
    this.isDialogOpen = false;  // Cierra el diálogo

    if (isConfirmed) {
      this.eliminarUsuario();  // Elimina el usuario si se confirma
    } else {
      console.log('Operación cancelada');
    }
  }

  eliminarUsuario() {
    this.perfilService.deleteProfile(this.user.idUsuario).subscribe({
      next: () => {
        console.log("Usuario eliminado exitosamente");
        this.router.navigate(['/login']);  // Redirige al login después de eliminar la cuenta
      },
      error: (err) => {
        console.error("Error al eliminar el usuario:", err);
      }
    });
  }

  cerrarSesion() {
    localStorage.removeItem('idUsuario');  // Eliminar el ID de usuario de localStorage
    this.router.navigate(['/login']);  // Redirige al login
  }
}
