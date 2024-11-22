import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LeccionDto } from '../../models/LeccionDto';
import { PaginadoDto } from 'src/app/models/PaginadoDto';
import { LeccionService } from '../../services/leccion.service';
import { CursoDto } from 'src/app/models/CursoDto';
import { CourseService } from 'src/app/services/course.service';
import { InscripcionService } from 'src/app/services/inscripcion.service';

@Component({
  selector: 'app-course-details-tutor',
  templateUrl: './course-details-tutor.component.html',
  styleUrls: ['./course-details-tutor.component.css']
})
export class CourseDetailsTutorComponent implements OnInit {
  course: CursoDto | null = null;
  lecciones: LeccionDto[] = [];
  isEnrolled: boolean = false;
  userId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inscripcionService: InscripcionService,
    private cursoService: CourseService,
    private leccionService: LeccionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const courseId = Number(this.route.snapshot.paramMap.get('id'));
    if (courseId) {
      this.loadCourseDetails(courseId);
      this.loadLessons(courseId);
    }
  }

  // Método para cargar los detalles del curso
  loadCourseDetails(courseId: number): void {
    this.cursoService.getCursoById(courseId).subscribe({
      next: (data: CursoDto) => this.course = data,
      error: (error) => console.error('Error al cargar los detalles del curso:', error)
    });
  }

  // Método para cargar las lecciones del curso
  loadLessons(courseId: number): void {
    const paginadoDto: PaginadoDto = { page: 0, size: 10, sortBy: 'orden', sortDir: 'desc' };
    this.leccionService.getLeccionesByCurso(courseId, paginadoDto).subscribe(
      (response) => {
        this.lecciones = response.content;
      },
      (error) => {
        console.error('Error al cargar las lecciones del curso:', error);
      }
    );
  }

  // Función para redirigir a la vista de edición con los datos del curso
  editCourse() {
    if (this.course) {
      this.router.navigate(['/course-edit-tutor'], {
        queryParams: {
          id: this.course.idCurso,
          name: this.course.nombre,
          descripcion: this.course.descripcion,
          dificultad: this.course.dificultad,
          estado: this.course.estado,
          categoriaId: this.course.categoriaId,
          portada: this.course.portada
        }
      });
    }
  }

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
        duration: 3000
      });
    }
  }

  deleteCourse() {
    if (confirm(`¿Estás seguro de que deseas eliminar el curso: ${this.course?.nombre}?`)) {
      this.cursoService.deleteCurso(this.course?.idCurso!).subscribe({
        next: () => console.log('Curso eliminado exitosamente'),
        error: (error) => console.error('Error al eliminar el curso:', error)
      });

      console.log(`Curso con ID ${this.course?.idCurso} eliminado`);
      this.snackBar.open('Curso eliminado exitosamente', 'Cerrar', {
        duration: 3000
      });
      this.router.navigate(['/my-courses']);
    }
  }

  // Lógica para volver a la lista de cursos
  goBack(): void {
    this.router.navigate(['/my-courses']);
  }

  noenrollInCourse() {
    if (confirm(`¿Estás seguro de que deseas desincribirte del curso: ${this.course?.nombre}?`)) {
      this.inscripcionService.deleteInscripcion(this.course?.idCurso!).subscribe({
        next: () => console.log('Curso eliminado exitosamente'),
        error: (error) => console.error('Error al desinscribirse del curso:', error)
      });

      console.log(`Curso con ID ${this.course?.idCurso} eliminado`);
      this.snackBar.open('Desinscripción exitosa', 'Cerrar', {
        duration: 3000
      });
      this.router.navigate(['/course-categories']);
    }
  }
}
