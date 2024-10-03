import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

// Interfaz para el curso
interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  portada: string;
  dificultad: string;
  Categoria_id_categoria: number;
}

// Interfaz para la categoría
interface Category {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-course-category-list',
  templateUrl: './course-category-list.component.html',
  styleUrls: ['./course-category-list.component.css']
})
export class CourseCategoryListComponent implements OnInit {
  // Lista de categorías simulada
  categories: Category[] = [
    { id: 1, nombre: 'Programación' },
    { id: 2, nombre: 'Psicología' },
    { id: 3, nombre: 'Data Science' }
  ];

  // Lista de cursos simulada
  courses: Course[] = [
    { id: 1, nombre: 'Introduction to computer programming', descripcion: 'Curso básico de programación.', portada: 'assets/Login_Image.png', dificultad: 'Beginner', Categoria_id_categoria: 1 },
    { id: 2, nombre: 'Psychology 101', descripcion: 'Curso de introducción a la psicología.', portada: 'assets/Login_Image.png', dificultad: 'Beginner', Categoria_id_categoria: 2 },
    { id: 3, nombre: 'Data Science Fundamentals', descripcion: 'Curso de fundamentos de Data Science.', portada: 'assets/Login_Image.png', dificultad: 'Intermediate', Categoria_id_categoria: 3 },
    { id: 4, nombre: 'Advanced Programming Techniques', descripcion: 'Curso avanzado de técnicas de programación.', portada: 'assets/Login_Image.png', dificultad: 'Advanced', Categoria_id_categoria: 1 },
    { id: 5, nombre: 'Clinical Psychology', descripcion: 'Curso de psicología clínica.', portada: 'assets/Login_Image.png', dificultad: 'Advanced', Categoria_id_categoria: 2 },
    { id: 1, nombre: 'Introduction to computer programming', descripcion: 'Curso básico de programación.', portada: 'assets/Login_Image.png', dificultad: 'Beginner', Categoria_id_categoria: 1 },
    { id: 2, nombre: 'Psychology 101', descripcion: 'Curso de introducción a la psicología.', portada: 'assets/Login_Image.png', dificultad: 'Beginner', Categoria_id_categoria: 2 },
    { id: 3, nombre: 'Data Science Fundamentals', descripcion: 'Curso de fundamentos de Data Science.', portada: 'assets/Login_Image.png', dificultad: 'Intermediate', Categoria_id_categoria: 3 },
    { id: 4, nombre: 'Advanced Programming Techniques', descripcion: 'Curso avanzado de técnicas de programación.', portada: 'assets/Login_Image.png', dificultad: 'Advanced', Categoria_id_categoria: 1 },
    { id: 5, nombre: 'Clinical Psychology', descripcion: 'Curso de psicología clínica.', portada: 'assets/Login_Image.png', dificultad: 'Advanced', Categoria_id_categoria: 2 },
    { id: 1, nombre: 'Introduction to computer programming', descripcion: 'Curso básico de programación.', portada: 'assets/Login_Image.png', dificultad: 'Beginner', Categoria_id_categoria: 1 },
    { id: 2, nombre: 'Psychology 101', descripcion: 'Curso de introducción a la psicología.', portada: 'assets/Login_Image.png', dificultad: 'Beginner', Categoria_id_categoria: 2 },
    { id: 3, nombre: 'Data Science Fundamentals', descripcion: 'Curso de fundamentos de Data Science.', portada: 'assets/Login_Image.png', dificultad: 'Intermediate', Categoria_id_categoria: 3 },
    { id: 4, nombre: 'Advanced Programming Techniques', descripcion: 'Curso avanzado de técnicas de programación.', portada: 'assets/Login_Image.png', dificultad: 'Advanced', Categoria_id_categoria: 1 },
    { id: 5, nombre: 'Clinical Psychology', descripcion: 'Curso de psicología clínica.', portada: 'assets/Login_Image.png', dificultad: 'Advanced', Categoria_id_categoria: 2 },
    { id: 1, nombre: 'Introduction to computer programming', descripcion: 'Curso básico de programación.', portada: 'assets/Login_Image.png', dificultad: 'Beginner', Categoria_id_categoria: 1 },
    { id: 2, nombre: 'Psychology 101', descripcion: 'Curso de introducción a la psicología.', portada: 'assets/Login_Image.png', dificultad: 'Beginner', Categoria_id_categoria: 2 },
    { id: 3, nombre: 'Data Science Fundamentals', descripcion: 'Curso de fundamentos de Data Science.', portada: 'assets/Login_Image.png', dificultad: 'Intermediate', Categoria_id_categoria: 3 },
    { id: 4, nombre: 'Advanced Programming Techniques', descripcion: 'Curso avanzado de técnicas de programación.', portada: 'assets/Login_Image.png', dificultad: 'Advanced', Categoria_id_categoria: 1 },
    { id: 5, nombre: 'Clinical Psychology', descripcion: 'Curso de psicología clínica.', portada: 'assets/Login_Image.png', dificultad: 'Advanced', Categoria_id_categoria: 2 }
  ];

  // Cursos filtrados por categoría
  filteredCourses: Course[] = [];
  pagedCourses: Course[] = []; // Cursos mostrados en la página actual
  selectedCategory: Category | null = null;
  currentPage: number = 1;
  itemsPerPage: number = 6; // Número de cursos por página
  totalPages: number = 1;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Seleccionar la primera categoría por defecto y filtrar los cursos
    this.selectCategory(this.categories[0]);
  }

  // Filtrar cursos por categoría seleccionada
  selectCategory(category: Category) {
    this.selectedCategory = category;
    this.filterCoursesByCategory();
  }

  // Filtrar los cursos según la categoría seleccionada y actualizar la paginación
  filterCoursesByCategory() {
    if (this.selectedCategory) {
      this.filteredCourses = this.courses.filter(course => this.selectedCategory && course.Categoria_id_categoria === this.selectedCategory.id);
    } else {
      this.filteredCourses = this.courses; // Mostrar todos los cursos si no hay categoría seleccionada
    }

    // Actualizar el número de páginas y los cursos a mostrar
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredCourses.length / this.itemsPerPage);
    this.updatePagedCourses();
  }

  // Actualizar los cursos mostrados en la página actual
  updatePagedCourses() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.pagedCourses = this.filteredCourses.slice(startIndex, endIndex);
  }

  // Cambiar de página
  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagedCourses();
    }
  }

  // Redirigir a la página de detalles del curso
  viewCourse(course: Course): void {
    this.router.navigate(['/course-details', course.id]);
  }
}
