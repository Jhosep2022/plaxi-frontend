import { Component } from '@angular/core';
import { Router } from '@angular/router';

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
export class MyCoursesStudentComponent {
  // Datos ficticios para los cursos
  courses: Course[] = [
    { id: 1, name: 'Introduction to computer programming', date: '2023-12-03', time: '09:00 AM', studentsEnrolled: 32, image: 'assets/curso.png' },
    { id: 2, name: 'Psychology 101', date: '2023-03-27', time: '12:00 PM', studentsEnrolled: 17, image: 'assets/curso.png' },
    { id: 3, name: 'Data Science Fundamentals', date: '2024-01-15', time: '10:00 AM', studentsEnrolled: 25, image: 'assets/curso.png' },
    { id: 4, name: 'Machine Learning Basics', date: '2024-02-10', time: '02:00 PM', studentsEnrolled: 19, image: 'assets/curso.png' },
  ];

  constructor(private router: Router) {} // Inyectar el Router

  ngOnInit(): void {
    // No se realiza ninguna llamada al backend, se usan los datos ficticios directamente
  }

  openCourse(course: Course) {
    console.log('Opening course:', course);
    // Aquí iría la lógica para abrir el curso, por ejemplo, navegar a otra página
  }

  openCourseForm(): void {
    // Navegar a la nueva ruta para crear curso
    this.router.navigate(['/create-course']);
  }
}
