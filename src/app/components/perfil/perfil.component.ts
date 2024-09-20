import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PerfilService } from '../../services/profile.service';  // Ruta correcta al servicio
import { faEdit, faTrash  } from '@fortawesome/free-solid-svg-icons';  // Importar icono de edición

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {

  faEdit = faEdit;  // Asignar el icono a una variable
  faTrash = faTrash;
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

  darDeBaja() {
    // Lógica para dar de baja la cuenta
    console.log("Cuenta dada de baja");
  }
}
