import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService } from '../../services/profile.service';  // Ruta correcta al servicio
import { faEdit, faTrash, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';  // Importar icono de edición y cerrar sesión
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {

  faEdit = faEdit;  // Icono de edición
  faTrash = faTrash;  // Icono de eliminación
  faSignOut = faSignOutAlt;  // Icono de cerrar sesión
  user: any = {}; // Objeto vacío para inicializar el perfil del usuario

  isDialogOpen = false;  // Controla si el diálogo está abierto

  constructor(private perfilService: ProfileService, private router: Router, private dialog: MatDialog) {}


  ngOnInit(): void {
    const idUsuario = localStorage.getItem('idUsuario');  // Obtiene el ID del usuario desde localStorage
    if (idUsuario) {
      this.cargarPerfil(Number(idUsuario));
    } else {
      this.router.navigate(['/login']);  // Redirige al login si no hay idUsuario
    }
  }

  // Función para cargar el perfil del usuario
  cargarPerfil(idUsuario: number) {
    this.perfilService.getProfile(idUsuario).subscribe({
      next: (response: any) => {
        this.user = response;  // Actualiza el perfil del usuario con la respuesta
      },
      error: (err: any) => {
        console.error('Error al cargar el perfil del usuario:', err);
      }
    });
  }

  // Función para ocultar los botones de edición y eliminación del perfil
  editarPerfil() {
    // Si no necesitas este botón, simplemente elimínalo o comenta esta función
    console.log('Editar Perfil está deshabilitado');
  }

  abrirDialogoConfirmacion() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Si el usuario confirma, elimina la cuenta
        const idUsuario = localStorage.getItem('idUsuario');
        if (idUsuario) {
          this.perfilService.deleteProfile(Number(idUsuario)).subscribe({
            next: (response) => {
              console.log('Cuenta eliminada correctamente:', response);
              this.router.navigate(['/login']);
            },
            error: (err) => {
              console.error('Error al eliminar la cuenta:', err);
            },
          });
        }
      }
    });
  }


  // Función para cerrar sesión y redirigir al login
  cerrarSesion() {
    localStorage.removeItem('idUsuario');  // Eliminar el ID de usuario de localStorage
    this.router.navigate(['/login']);  // Redirige al login
  }
}
