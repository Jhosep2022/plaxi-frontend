import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CursoDto } from 'src/app/models/CursoDto';
import { AuthService } from 'src/app/services/auth.service';
import { CourseService } from 'src/app/services/course.service';
import { SessionService } from '../../core/auth/session.service';
@Component({
    selector: 'app-course-list',
    templateUrl: './course-list.component.html',
    styleUrls: ['./course-list.component.css'],
})
export class CourseListComponent implements OnInit {
  protected readonly session = inject(SessionService);
  private router = inject(Router);
  private cursoService = inject(CourseService);
  private authService = inject(AuthService);

  readonly courses = signal<CursoDto[]>([]);
  userId: number | null = null;

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
      this.router.navigate(['/auth/login']);
    }
  }

  // Cargar los cursos creados por un usuario específico
  loadCoursesByUser(userId: number): void {
    this.cursoService.getCursosByUsuario(userId).subscribe({
      next: (data) => {
        this.courses.set(data);
        console.log('Cursos obtenidos para el usuario:', this.courses());
      },
      error: (error) => {
        console.error('Error al cargar los cursos del usuario:', error);
      }
    });
  }

  // Redirigir a la vista de detalles del curso
  openCourse(course: CursoDto) {
    this.router.navigate(this.session.rutaRol('contenido', 'cursos', course.idCurso));
  }


  // Redirigir al formulario de creación de curso
  openCourseForm(): void {
    this.router.navigate(this.session.rutaRol('contenido', 'cursos', 'nuevo'));
  }
}
