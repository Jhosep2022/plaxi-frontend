import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CursoService } from '../../services/course.service';
import { CursoDto } from '../../models/cursoDto';
import { InscripcionService } from '../../services/inscripcion.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LeccionDto } from '../../models/LeccionDto';
import { PaginadoDto } from 'src/app/models/PaginadoDto';
import { LeccionService } from '../../services/leccion.service';

@Component({
  selector: 'app-course-details',
  templateUrl: './course-details.component.html',
  styleUrls: ['./course-details.component.css']
})
export class CourseDetailsComponent implements OnInit {
  course: CursoDto | null = null;
  isEnrolled: boolean = false;
  userId: number | null = null;
  lecciones: LeccionDto[] = []; // Variable para almacenar las lecciones del curso

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cursoService: CursoService,
    private inscripcionService: InscripcionService,
    private leccionService: LeccionService, // Agrega el servicio de lecciones
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const storedUserId = localStorage.getItem('idUsuario');
    if (storedUserId) {
      this.userId = Number(storedUserId);
    } else {
      this.router.navigate(['/login']);
      return;
    }

    const courseId = Number(this.route.snapshot.paramMap.get('id'));
    if (courseId) {
      this.loadCourseDetails(courseId);
      this.loadLessons(courseId); // Cargar lecciones del curso
    }
  }

  // Método para cargar los detalles del curso
  loadCourseDetails(courseId: number): void {
    this.cursoService.getCursoById(courseId).subscribe({
      next: (data) => this.course = data,
      error: (error) => console.error('Error al cargar los detalles del curso:', error)
    });
  }

  // Método para cargar las lecciones del curso
  loadLessons(courseId: number): void {
    const paginadoDto = { page: 0, size: 10, sortBy: 'titulo', sortDir: 'desc' };
    this.leccionService.getLeccionesByCurso(courseId, paginadoDto).subscribe(
      (response) => {
        this.lecciones = response.content; // Ajusta esto según la respuesta
      },
      (error) => {
        console.error('Error al cargar las lecciones del curso:', error);
      }
    );
  }
  

  // Lógica para inscribirse en el curso
  enrollInCourse(): void {
    if (this.course && this.userId !== null) {
      const inscripcionDto = {
        usuarioId: this.userId,
        cursoId: this.course.idCurso
      };

      this.inscripcionService.createInscripcion(inscripcionDto).subscribe({
        next: (data) => {
          this.isEnrolled = true;
          this.snackBar.open('¡Te has inscrito en el curso exitosamente!', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar'],
          });
        },
        error: (error) => {
          console.error('Error al inscribirse en el curso:', error);
          this.snackBar.open('Hubo un problema al intentar inscribirse en el curso.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar'],
          });
        }
      });
    } else {
      this.snackBar.open('No se pudo realizar la inscripción. Inténtalo de nuevo más tarde.', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar'],
      });
    }
  }

  lessonDetails(leccionId: number): void {
    // Aquí puedes implementar la lógica para redirigir al usuario a una pantalla de creación de tema
    // o abrir un modal para que ingrese los datos del nuevo tema.
  
    console.log('Creando tema para la lección con ID:', leccionId);
  
    // Ejemplo de redirección:
    this.router.navigate(['/crear-tema', leccionId]); // Dependiendo de tu ruta y configuración.
  }

  // Lógica para volver a la lista de cursos
  goBack(): void {
    this.router.navigate(['/course-categories']);
  }
}

