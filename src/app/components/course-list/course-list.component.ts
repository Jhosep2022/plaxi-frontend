import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CursoService } from 'src/app/services/course.service'; // Importar el servicio de cursos
import { AuthService } from 'src/app/services/auth.service'; // Importar el servicio de autenticación para obtener el ID del usuario
import { CursoDto } from 'src/app/models/cursoDto'; // Importar el modelo de curso

@Component({
  selector: 'app-course-list',
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.css']
})
export class CourseListComponent implements OnInit {
  courses: CursoDto[] = []; // Almacenar los cursos obtenidos de la API
  userId: number | null = null; // ID del usuario logueado

  constructor(
    private router: Router,
    private cursoService: CursoService, // Inyectar el servicio de cursos
    private authService: AuthService // Inyectar el servicio de autenticación
  ) {}

  ngOnInit(): void {
    // Intentar obtener el ID del usuario logueado desde localStorage
    const storedUserId = localStorage.getItem('idUsuario');
    if (storedUserId) {
      this.userId = Number(storedUserId);
      console.log('ID del usuario logueado recuperado desde localStorage:', this.userId);
      // Cargar los cursos creados por el usuario logueado
      this.loadCoursesByUser(this.userId);
    } else {
      console.error('No se encontró el ID del usuario logueado en localStorage. Redirigiendo al login.');
      this.router.navigate(['/login']); // Redirigir a la página de login si no hay ID de usuario
    }
  }

  // Cargar los cursos creados por un usuario específico
  loadCoursesByUser(userId: number): void {
    this.cursoService.getCursosByUsuario(userId).subscribe({
      next: (data) => {
        this.courses = data;
        console.log('Cursos obtenidos para el usuario:', this.courses);
      },
      error: (error) => {
        console.error('Error al cargar los cursos del usuario:', error);
      }
    });
  }

  // Redirigir a la vista de detalles del curso
  openCourse(course: CursoDto) {
    this.router.navigate(['/course-details-tutor'], {
      queryParams: {
        id: course.idCurso,
        name: course.nombre,
        description: course.descripcion,
        difficulty: course.dificultad,
        image: course.portada
      }
    });
  }

  // Redirigir al formulario de creación de curso
  openCourseForm(): void {
    this.router.navigate(['/create-course']);
  }
}
