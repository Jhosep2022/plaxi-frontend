import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CursoDto } from 'src/app/models/CursoDto';
import { CourseService } from 'src/app/services/course.service';
import { CategoriaService } from 'src/app/services/categoria.service';
import { SessionService } from '../../core/auth/session.service';

// Interfaz para la categoría
interface Category {
  id: number;
  nombre: string;
}

@Component({
    selector: 'app-course-category-list',
    templateUrl: './course-category-list.component.html',
    styleUrls: ['./course-category-list.component.css'],
    imports: [RouterLink]
})
export class CourseCategoryListComponent implements OnInit {
  protected readonly session = inject(SessionService);
  private router = inject(Router);
  private cursoService = inject(CourseService);
  private categoriaService = inject(CategoriaService);

  readonly itemsPerPage = 6;

  // Estado
  readonly categories = signal<Category[]>([]);
  readonly courses = signal<CursoDto[]>([]);
  readonly selectedCategory = signal<Category | null>(null);
  readonly currentPage = signal(1);

  // Estado derivado: se recalcula solo cuando cambian sus dependencias
  readonly filteredCourses = computed(() => {
    const category = this.selectedCategory();
    const courses = this.courses();
    return category ? courses.filter((course) => course.categoriaId === category.id) : courses;
  });

  readonly totalPages = computed(() => Math.ceil(this.filteredCourses().length / this.itemsPerPage));

  readonly pagedCourses = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredCourses().slice(startIndex, startIndex + this.itemsPerPage);
  });

  ngOnInit(): void {
    this.getCategoriesFromApi();
    this.getCoursesFromApi();
  }

  // Obtener todas las categorías desde la API
  getCategoriesFromApi(): void {
    this.categoriaService.getAllCategorias().subscribe({
      next: (data) => {
        const categories = data.map((categoria) => ({
          id: categoria.idCategoria,
          nombre: categoria.nombre
        }));
        this.categories.set(categories);

        // Seleccionar la primera categoría por defecto, si existe
        if (categories.length > 0) {
          this.selectCategory(categories[0]);
        }
      },
      error: (err) => {
        console.error('Error al obtener categorías desde la API:', err);
      }
    });
  }

  // Obtener todos los cursos desde la API
  getCoursesFromApi(): void {
    this.cursoService.getAllCursos().subscribe({
      next: (data) => this.courses.set(data),
      error: (err) => {
        console.error('Error al obtener cursos desde la API:', err);
      }
    });
  }

  // Filtrar cursos por categoría seleccionada (vuelve a la primera página)
  selectCategory(category: Category): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
  }

  // Cambiar de página
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // Redirigir a la página de detalles del curso
  viewCourse(course: CursoDto): void {
    this.router.navigate(this.session.rutaRol('catalogo', course.idCurso));
  }
}
