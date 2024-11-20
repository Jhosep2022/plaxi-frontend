import { Component } from '@angular/core';
import { CursoDto } from 'src/app/models/CursoDto';
import { AuthService } from 'src/app/services/auth.service';
import { CourseService } from 'src/app/services/course.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  // Propiedad para cursos recientes
  recentCursos: CursoDto[] = [];
  //
  recommendedCursos: CursoDto[] = [];



  // Completed quizzes
  completedQuizzes = [
    { title: 'Assembly language', group: 'Programming Basics', persons: 23, date: '12/02/2023' },
    { title: 'C programming', group: 'Advanced Programming', persons: 17, date: '12/02/2023' },
    { title: 'Python', group: 'Machine Learning', persons: 38, date: '12/02/2023' }
  ];

  // Courses and categories
  courses = ['Programming Basics', 'Advanced Programming', 'Machine Learning'];
  activeCourse = this.courses[0];

  categories = [
    { id: 1, nombre: 'Programming Basics' },
    { id: 2, nombre: 'Advanced Programming' },
    { id: 3, nombre: 'Machine Learning' }
  ];

  selectedCategory = this.categories[0]; // Default selected category

  // Students list
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

  get filteredStudents() {
    return this.students.filter(student => student.course === this.activeCourse);
  }

  selectCourse(course: string) {
    this.activeCourse = course;
  }

  // Methods for category selection and course pagination
  selectCategory(category: any) {
    this.selectedCategory = category;

  }


  constructor(private courseService: CourseService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadRecentCursos();
    this.loadRecommendedCursos();
  }


  // Método para cargar los cursos recientes desde el servicio
  loadRecentCursos(): void {
    this.courseService.getRecentCursos().subscribe({
      next: (data) => {
        this.recentCursos = data;
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
          this.recommendedCursos = data;
        },
        error: (err) => {
          console.error('Error al cargar los cursos recomendados:', err);
        }
      });
    } else {
      console.warn('No se pudo obtener el ID del usuario.');
    }
  }


}
