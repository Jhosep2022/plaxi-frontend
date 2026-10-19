import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService } from '../../services/profile.service';  // Ruta correcta al servicio
import { faEdit, faTrash, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';  // Importar icono de edición y cerrar sesión
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { NgClass } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { SessionService } from '../../core/auth/session.service';

@Component({
    selector: 'app-perfil',
    templateUrl: './perfil.component.html',
    styleUrls: ['./perfil.component.css'],
    imports: [NgClass, FaIconComponent]
})
export class PerfilComponent implements OnInit {
  protected readonly session = inject(SessionService);
  private perfilService = inject(ProfileService);
  private router = inject(Router);
  private dialog = inject(MatDialog);


  faEdit = faEdit;  // Icono de edición
  faTrash = faTrash;  // Icono de eliminación
  faSignOut = faSignOutAlt;  // Icono de cerrar sesión
  readonly user = signal<any>({}); // Objeto vacío para inicializar el perfil del usuario

  isDialogOpen = false;


  ngOnInit(): void {
    const idUsuario = localStorage.getItem('idUsuario');  // Obtiene el ID del usuario desde localStorage
    if (idUsuario) {
      this.cargarPerfil(Number(idUsuario));
    } else {
      this.session.cerrarSesion();  // Redirige al login si no hay idUsuario
    }
  }

  // Función para cargar el perfil del usuario
  cargarPerfil(idUsuario: number) {
    this.perfilService.getProfile(idUsuario).subscribe({
      next: (response: any) => {
        this.user.set(response);  // Actualiza el perfil del usuario con la respuesta
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
              this.session.cerrarSesion();
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
    this.session.cerrarSesion();  // Redirige al login
  }
}
