import { Component, ElementRef, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faAnglesLeft,
  faAnglesRight,
  faBook,
  faBookOpen,
  faChalkboardTeacher,
  faChartLine,
  faChartPie,
  faClipboard,
  faClipboardCheck,
  faClipboardList,
  faCog,
  faComments,
  faEdit,
  faHome,
  faPlus,
  faQuestionCircle,
  faSignOutAlt,
  faTasks,
  faUser,
  faUserCircle,
  faUserGraduate,
  faUsers,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../services/auth.service';
import { CourseService } from '../../services/course.service';
import { InscripcionService } from '../../services/inscripcion.service';
import { ProfileService } from '../../services/profile.service';
import { PerfilDto } from '../../models/PerfilDto';

type Rol = 'Administrador' | 'Tutor' | 'Estudiante';

interface NavItem {
  label: string;
  icon: IconDefinition;
  route: string | (string | number)[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
  emptyText?: string;
}

interface NavModule {
  id: string;
  label: string;
  icon: IconDefinition;
  sections: NavSection[];
}

const ROLES: Record<string, Rol> = { '1': 'Administrador', '2': 'Estudiante', '3': 'Tutor' };
const COLLAPSED_KEY = 'sidebarCollapsed';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  imports: [RouterLink, RouterLinkActive, FaIconComponent],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'userMenuOpen.set(false)',
  },
})
export class SidebarComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private courseService = inject(CourseService);
  private inscripcionService = inject(InscripcionService);
  private elementRef = inject(ElementRef<HTMLElement>);

  // Íconos usados directamente en la plantilla
  readonly faAnglesLeft = faAnglesLeft;
  readonly faAnglesRight = faAnglesRight;
  readonly faPlus = faPlus;
  readonly faUserCircle = faUserCircle;
  readonly faEdit = faEdit;
  readonly faSignOutAlt = faSignOutAlt;
  readonly faWandMagicSparkles = faWandMagicSparkles;

  // Usuario logueado
  private readonly userId = Number(localStorage.getItem('idUsuario')) || null;
  readonly rol: Rol = ROLES[localStorage.getItem('userRole') ?? ''] ?? 'Estudiante';

  readonly profile = toSignal<PerfilDto | null>(
    this.userId ? this.profileService.getProfile(this.userId) : of(null),
    { initialValue: null }
  );

  readonly fullName = computed(() => {
    const p = this.profile();
    return p ? `${p.nombre} ${p.primerApellido}` : '';
  });

  readonly initials = computed(() => {
    const p = this.profile();
    return p ? `${p.nombre.charAt(0)}${p.primerApellido.charAt(0)}`.toUpperCase() : '';
  });

  // Cursos del usuario (inscritos si es estudiante, creados si es tutor)
  private readonly myCourses = toSignal(this.loadMyCourses(), { initialValue: [] as NavItem[] });

  // Módulos del riel según el rol
  readonly modules = computed<NavModule[]>(() => [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: faHome,
      sections: [
        {
          title: 'General',
          items: [
            { label: 'Dashboard', icon: faHome, route: '/home' },
            { label: 'Explorar cursos', icon: faBookOpen, route: '/course-categories' },
            { label: 'Quizzes', icon: faClipboard, route: '/quizzes' },
          ],
        },
        {
          title: 'Comunidad',
          items: [
            { label: 'Foro', icon: faComments, route: '/forum' },
            { label: 'Ayuda', icon: faQuestionCircle, route: '/help' },
          ],
        },
      ],
    },
    this.roleModule(),
    {
      id: 'cuenta',
      label: 'Mi cuenta',
      icon: faUser,
      sections: [
        {
          items: [
            { label: 'Ver perfil', icon: faUserCircle, route: '/perfil' },
            { label: 'Editar perfil', icon: faEdit, route: '/updateperfil' },
          ],
        },
      ],
    },
  ]);

  // URL actual como signal
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  // Módulo activo: sigue a la ruta, pero se puede cambiar a mano desde el riel
  readonly activeModuleId = linkedSignal(() => this.moduleIdForUrl(this.url()));
  readonly activeModule = computed(
    () => this.modules().find((m) => m.id === this.activeModuleId()) ?? this.modules()[0]
  );

  readonly collapsed = signal(this.readCollapsed());
  readonly userMenuOpen = signal(false);

  selectModule(id: string): void {
    this.activeModuleId.set(id);
    if (this.collapsed()) {
      this.setCollapsed(false);
    }
  }

  toggleCollapsed(): void {
    this.setCollapsed(!this.collapsed());
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.authService.logout();
    localStorage.removeItem('userRole');
    localStorage.removeItem('idUsuario');
    this.router.navigate(['/login']);
  }

  // Cierra el menú de usuario al hacer clic fuera de él
  onDocumentClick(event: MouseEvent): void {
    if (!this.userMenuOpen()) return;
    const menu = this.elementRef.nativeElement.querySelector('.user-menu-wrapper');
    if (menu && !menu.contains(event.target as Node)) {
      this.userMenuOpen.set(false);
    }
  }

  private roleModule(): NavModule {
    const courses: NavSection = {
      title: this.rol === 'Tutor' ? 'Cursos creados' : 'Mis cursos',
      items: this.myCourses(),
      emptyText: this.rol === 'Tutor' ? 'Todavía no creaste cursos.' : 'Aún no estás inscrito en ningún curso.',
    };

    switch (this.rol) {
      case 'Administrador':
        return {
          id: 'rol',
          label: 'Administración',
          icon: faUsers,
          sections: [
            {
              items: [
                { label: 'Gestión de usuarios', icon: faUsers, route: '/user-management' },
                { label: 'Gestión de cursos', icon: faBook, route: '/course-management' },
                { label: 'Reportes', icon: faChartLine, route: '/reports' },
                { label: 'Configuración', icon: faCog, route: '/settings' },
              ],
            },
          ],
        };
      case 'Tutor':
        return {
          id: 'rol',
          label: 'Enseñanza',
          icon: faChalkboardTeacher,
          sections: [
            {
              title: 'Gestión',
              items: [
                { label: 'Mis cursos', icon: faChalkboardTeacher, route: '/my-courses' },
                { label: 'Crear curso', icon: faPlus, route: '/create-course' },
                { label: 'Estudiantes', icon: faUserGraduate, route: '/students' },
                { label: 'Evaluaciones', icon: faClipboardCheck, route: '/evaluations' },
              ],
            },
            courses,
          ],
        };
      default:
        return {
          id: 'rol',
          label: 'Mi aprendizaje',
          icon: faUserGraduate,
          sections: [
            {
              title: 'Accesos',
              items: [
                { label: 'Mis cursos', icon: faBook, route: '/my-courses-student' },
                { label: 'Progreso', icon: faChartPie, route: '/progress' },
                { label: 'Tareas', icon: faTasks, route: '/tasks' },
                { label: 'Evaluaciones', icon: faClipboardList, route: '/evaluations' },
              ],
            },
            courses,
          ],
        };
    }
  }

  private loadMyCourses(): Observable<NavItem[]> {
    if (!this.userId) return of([]);

    if (this.rol === 'Tutor') {
      return this.courseService.getCursosByUsuario(this.userId).pipe(
        map((cursos) =>
          cursos.map((c) => ({ label: c.nombre, icon: faBook, route: ['/course-details-tutor', c.idCurso] }))
        )
      );
    }

    if (this.rol === 'Estudiante') {
      return this.inscripcionService.getInscripcionesByUsuarioId(this.userId).pipe(
        map((inscripciones) =>
          inscripciones.map((i) => ({ label: i.cursoNombre, icon: faBook, route: ['/course-details', i.cursoId] }))
        )
      );
    }

    return of([]);
  }

  // Elige el módulo cuyo menú contiene la ruta actual
  private moduleIdForUrl(url: string): string {
    const path = url.split('?')[0];
    for (const module of this.modules()) {
      const match = module.sections.some((section) =>
        section.items.some((item) => typeof item.route === 'string' && path.startsWith(item.route))
      );
      if (match) return module.id;
    }
    // Detalles de cursos, lecciones y temas pertenecen al módulo del rol
    if (/^\/(course|lesson|tema|theme|create-course)/.test(path)) return 'rol';
    return 'inicio';
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private setCollapsed(value: boolean): void {
    this.collapsed.set(value);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(value));
    } catch {
      // Sin almacenamiento disponible: solo se pierde la preferencia
    }
  }
}
