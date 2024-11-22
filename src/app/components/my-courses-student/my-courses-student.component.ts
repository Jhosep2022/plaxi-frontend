import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InscripcionService } from '../../services/inscripcion.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-my-courses-student',
  templateUrl: './my-courses-student.component.html',
  styleUrls: ['./my-courses-student.component.css']
})
export class MyCoursesStudentComponent implements OnInit {
  courses: any[] = [];
  userId: number | null = null;

  constructor(
    private router: Router,
    private inscripcionService: InscripcionService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Recuperar el ID del usuario actualmente logueado desde AuthService
    this.userId = this.authService.getCurrentUserId();
    console.log('User ID recuperado:', this.userId);

    if (this.userId !== null) {
      this.loadUserCourses();
    } else {
      this.snackBar.open('Debes iniciar sesión para ver tus cursos.', 'Cerrar', {
        duration: 3000
      });
    }
  }

  // Método para cargar los cursos inscritos del usuario
  loadUserCourses(): void {
    if (this.userId === null) {
      return;
    }

    this.inscripcionService.getInscripcionesByUsuarioId(this.userId).subscribe({
      next: (inscripciones) => {
        console.log('Inscripciones obtenidas del backend:', inscripciones);

        // Mantener el idInscripcion en los datos del curso
        this.courses = inscripciones.map((inscripcion) => ({
          id: inscripcion.cursoId,
          name: inscripcion.cursoNombre,
          date: inscripcion.fechaInscripcion,
          idInscripcion: inscripcion.idInscripcion,
          time: '10:00 AM',
          studentsEnrolled: 0,
          image: inscripcion.cursoPortadaUrl || 'assets/curso.png' 
        }));

        console.log('Cursos mapeados:', this.courses);
      },
      error: (error) => {
        console.error('Error al cargar los cursos del usuario:', error);
        this.snackBar.open('Error al cargar los cursos. Por favor, inténtalo de nuevo más tarde.', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  // Método para eliminar una inscripción utilizando idInscripcion
  deleteCourse(idInscripcion: number): void {
    if (confirm('¿Estás seguro de que deseas darte de baja de este curso?')) {
      this.inscripcionService.deleteInscripcion(idInscripcion).subscribe({
        next: () => {
          this.snackBar.open('Te has dado de baja del curso exitosamente.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          });

          // Actualizar la lista de cursos eliminando el curso con idInscripcion
          this.courses = this.courses.filter((course) => course.idInscripcion !== idInscripcion);
        },
        error: (error) => {
          console.error('Error al intentar darse de baja:', error);
          this.snackBar.open('Ocurrió un error al intentar darte de baja. Por favor, intenta nuevamente.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar'],
          });
        },
      });
    }
  }

  // Abrir un curso (redirigir a una vista de detalles del curso)
  openCourse(course: any) {
    this.router.navigate(['/course-details', course.id]);
  }

  // Abrir el formulario de crear curso (si es necesario)
  openCourseForm(): void {
    this.router.navigate(['/create-course']);
  }
}
