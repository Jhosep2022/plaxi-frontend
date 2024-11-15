import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InscripcionService } from '../../services/inscripcion.service';
import { InscripcionResponseDto } from '../../models/inscripcionDto';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/services/auth.service';

interface Course {
  id: number;
  name: string;
  date: string;
  time: string;
  studentsEnrolled: number;
  image: string;
}

@Component({
  selector: 'app-my-courses-student',
  templateUrl: './my-courses-student.component.html',
  styleUrls: ['./my-courses-student.component.css']
})
export class MyCoursesStudentComponent implements OnInit {
  courses: Course[] = [];
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
    console.log('User ID recuperado:', this.userId); // Para depuración

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

        // Convertir las inscripciones en el formato de Course para mostrar en la vista
        this.courses = inscripciones.map((inscripcion) => ({
          id: inscripcion.cursoId,
          name: inscripcion.cursoNombre,
          date: inscripcion.fechaInscripcion,
          time: '10:00 AM', // Ajustar esta hora si la API devuelve una
          studentsEnrolled: 0, // Ajustar según tus necesidades
          image: inscripcion.cursoPortadaUrl || 'assets/curso.png' // Usar la imagen de portada si está disponible, de lo contrario, imagen predeterminada
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

  // Abrir un curso (redirigir a una vista de detalles del curso)
  openCourse(course: Course) {
    this.router.navigate(['/course-details', course.id]);
  }

  // Abrir el formulario de crear curso (si es necesario)
  openCourseForm(): void {
    this.router.navigate(['/create-course']);
  }
}
