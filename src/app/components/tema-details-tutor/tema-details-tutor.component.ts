import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaginadoDto } from 'src/app/models/PaginadoDto';
import { LeccionService } from '../../services/leccion.service';
import { TemaDto } from 'src/app/models/TemaDto';
import { TemaService } from 'src/app/services/tema.service';

@Component({
  selector: 'app-tema-details-tutor',
  templateUrl: './tema-details-tutor.component.html',
  styleUrls: ['./tema-details-tutor.component.css']
})
export class TemaDetailsTutorComponent {
  tema: TemaDto | null = null;
  userId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private temaService: TemaService,
    private leccionService: LeccionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const temaId = Number(this.route.snapshot.paramMap.get('id'));
    if (temaId) {
      this.loadTemaDetails(temaId);
    }
  }

  // Método para cargar los detalles del tema
  loadTemaDetails(temaId: number): void {
    this.temaService.getTemaById(temaId).subscribe({
      next: (data: TemaDto) => this.tema = data,
      error: (error) => console.error('Error al cargar los detalles del tema:', error)
    });
  }

  // Función para redirigir a la vista de edición con los datos del tema
  editTema() {
    // if (this.course) {
    //   this.router.navigate(['/course-edit-tutor'], {
    //     queryParams: {
    //       id: this.course.idCurso,
    //       name: this.course.nombre,
    //       descripcion: this.course.descripcion,
    //       dificultad: this.course.dificultad,
    //       estado: this.course.estado,
    //       categoriaId: this.course.categoriaId,
    //       portada: this.course.portada
    //     }
    //   });
    // }
  }

  deleteTema() {
    if (confirm(`¿Estás seguro de que deseas eliminar el curso: ${this.tema?.titulo}?`)) {
      console.log(`Curso con ID ${this.tema?.idTema} eliminado`);
      this.snackBar.open('Curso eliminado exitosamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
      this.router.navigate(['/my-courses']);
    }
  }

  // Lógica para volver a la lista de cursos
  goBack(): void {
    this.router.navigate(['/my-courses']);
  }
}
