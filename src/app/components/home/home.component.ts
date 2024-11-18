import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  // Upcoming quizzes
  upcomingQuizzes = [
    {
      title: 'Introduction to computer programming',
      date: '12/03/2023',
      time: '09:00 AM',
      enrolled: 32,
      image: 'assets/curso.png'
    },
    {
      title: 'Psychology 101',
      date: '27/03/2023',
      time: '12:00 PM',
      enrolled: 17,
      image: 'assets/curso.png'
    },
    {
      title: 'Introduction to computer programming',
      date: '12/03/2023',
      time: '09:00 AM',
      enrolled: 32,
      image: 'assets/curso.png'
    },
    {
      title: 'Psychology 101',
      date: '27/03/2023',
      time: '12:00 PM',
      enrolled: 17,
      image: 'assets/curso.png'
    }
  ];

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

  // Paged courses for the recommended courses section
  pagedCourses = [
    {
      idCurso: 1,
      nombre: 'Programming Basics',
      descripcion: 'Learn the basics of programming.',
      dificultad: 'Beginner',
      portada: 'assets/curso.png'
    },
    {
      idCurso: 2,
      nombre: 'Advanced Programming',
      descripcion: 'Master advanced programming techniques.',
      dificultad: 'Advanced',
      portada: 'assets/curso.png'
    },
    {
      idCurso: 3,
      nombre: 'Machine Learning 101',
      descripcion: 'Introduction to machine learning.',
      dificultad: 'Intermediate',
      portada: 'assets/curso.png'
    },
    {
      idCurso: 1,
      nombre: 'Programming Basics',
      descripcion: 'Learn the basics of programming.',
      dificultad: 'Beginner',
      portada: 'assets/curso.png'
    },
    {
      idCurso: 2,
      nombre: 'Advanced Programming',
      descripcion: 'Master advanced programming techniques.',
      dificultad: 'Advanced',
      portada: 'assets/curso.png'
    },
    {
      idCurso: 3,
      nombre: 'Machine Learning 101',
      descripcion: 'Introduction to machine learning.',
      dificultad: 'Intermediate',
      portada: 'assets/curso.png'
    }
  ];

  // Methods for category selection and course pagination
  selectCategory(category: any) {
    this.selectedCategory = category;

  }


}
