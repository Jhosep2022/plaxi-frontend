import { Component, OnInit, inject, signal } from '@angular/core';
import { CursoDto } from 'src/app/models/CursoDto';
import { InscripcionService } from 'src/app/services/inscripcion.service';
import { AuthService } from 'src/app/services/auth.service';
import { InscripcionResponseDto } from 'src/app/models/inscripcionDto';
import { CourseService } from 'src/app/services/course.service';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    imports: [RouterLink, DatePipe]
})
export class HomeComponent implements OnInit {
  private inscripcionService = inject(InscripcionService);
  private authService = inject(AuthService);
  private courseService = inject(CourseService);

  // Propiedades de cursos
  readonly cursosCreados = signal<CursoDto[]>([]); // Cursos creados por el tutor
  readonly estudiantesInscritos = signal<InscripcionResponseDto[]>([]); // Estudiantes inscritos en el curso seleccionado
  readonly recentCursos = signal<CursoDto[]>([]);
  readonly recommendedCursos = signal<CursoDto[]>([]);
  readonly enrolledCursos = signal<CursoDto[]>([]); // Cursos inscritos
  readonly userRole = signal<string>('');
  readonly isStudent = signal<boolean>(false);
  activeCourse: string = '';
  readonly activeCourseId = signal<number | null>(null); // Lista de estudiantes (dummy data)
  students = [
    {
      name: 'Emmanuel James',
      rank: '2nd',
      score: 87,
      course: 'Programming Basics',
      image: 'assets/perfil.jpeg'
    },
    {
      name: 'Alice Jasmine',
      rank: '12th',
      score: 69,
      course: 'Programming Basics',
      image: 'assets/perfil.jpeg'
    },
    {
      name: 'Harrison Menlaye',
      rank: '17th',
      score: 60,
      course: 'Advanced Programming',
      image: 'assets/perfil.jpeg'
    },
    {
      name: 'Jones Doherty',
      rank: '5th',
      score: 80,
      course: 'Machine Learning',
      image: 'assets/perfil.jpeg'
    }
  ];

  ngOnInit(): void {
    this.identifyUserRole();
    this.loadRecentCursos();
    this.loadRecommendedCursos();
    if (this.isStudent()) {
      this.loadEnrolledCursos();
    }
    if (this.userRole() === 'Tutor') {
      this.loadCursosCreados();
    }
  }


  // Método para identificar el rol del usuario
  identifyUserRole(): void {
    const storedUserRole = localStorage.getItem('userRole');
    if (storedUserRole) {
      switch (storedUserRole) {
        case '1':
          this.userRole.set('Administrador');
          this.isStudent.set(false);
          break;
        case '2':
          this.userRole.set('Estudiante');
          this.isStudent.set(true);
          break;
        case '3':
          this.userRole.set('Tutor');
          this.isStudent.set(false);
          break;
        default:
          this.userRole.set('Estudiante');
          this.isStudent.set(true);
      }
    } else {
      this.userRole.set('Estudiante');
      this.isStudent.set(true);
    }
    console.log('Rol de usuario:', this.userRole());
  }

  // Método para cargar los cursos recientes desde el servicio
  loadRecentCursos(): void {
    this.courseService.getRecentCursos().subscribe({
      next: (data) => {
        this.recentCursos.set(data);
      },
      error: (err) => {
        console.error('Error al cargar los cursos recientes:', err);
      }
    });
  }

  // Método para cargar los cursos recomendados basados en el ID del usuario
  loadRecommendedCursos(): void {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.courseService.getRecommendedCursosByUserId(userId).subscribe({
        next: (data) => {
          this.recommendedCursos.set(data);
        },
        error: (err) => {
          console.error('Error al cargar los cursos recomendados:', err);
        }
      });
    } else {
      console.warn('No se pudo obtener el ID del usuario.');
    }
  }

  // Método para cargar los cursos inscritos del estudiante
  loadEnrolledCursos(): void {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.inscripcionService.getInscripcionesByUsuarioId(userId).subscribe({
        next: (data: InscripcionResponseDto[]) => {
          this.enrolledCursos.set(data.map((inscripcion) => ({
            idCurso: inscripcion.cursoId,
            nombre: inscripcion.cursoNombre,
            descripcion: inscripcion.cursoDescripcion,
            dificultad: 'Desconocida', // Valor predeterminado
            estado: true, // Valor predeterminado
            categoriaId: 0, // Valor predeterminado
            portada: inscripcion.cursoPortadaUrl || '', // Manejo de null
          })));
          console.log('Cursos inscritos:', this.enrolledCursos());
        },
        error: (err) => {
          console.error('Error al cargar los cursos inscritos:', err);
        }
      });
    } else {
      console.warn('No se pudo obtener el ID del usuario.');
    }
  }

  // Cargar los cursos creados por el tutor
  loadCursosCreados(): void {
    const tutorId = this.authService.getCurrentUserId();
    if (tutorId) {
      this.courseService.getCursosByUsuario(tutorId).subscribe({
        next: (data: CursoDto[]) => {
          this.cursosCreados.set(data);
          console.log('Cursos creados por el tutor:', this.cursosCreados()); // Verifica aquí
        },
        error: (err) => {
          console.error('Error al cargar los cursos creados:', err);
        }
      });
    } else {
      console.warn('No se pudo obtener el ID del tutor.');
    }
  }


  // Cargar estudiantes inscritos en el curso seleccionado
  loadEstudiantesInscritos(cursoId: number): void {
    this.activeCourseId.set(cursoId);
    this.inscripcionService.getInscripcionesByCursoId(cursoId).subscribe({
      next: (data: InscripcionResponseDto[]) => {
        this.estudiantesInscritos.set(data);
        console.log('Estudiantes inscritos en el curso:', this.estudiantesInscritos()); // Verifica los datos aquí
      },
      error: (err) => {
        console.error('Error al cargar los estudiantes inscritos:', err);
      }
    });
  }

  // Método para filtrar estudiantes (ejemplo con dummy data)
  get filteredStudents() {
    return this.students.filter(student => student.course === this.activeCourse);
  }

  selectCourse(course: string): void {
    this.activeCourse = course;
  }
}
