import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { faBars, faBell, faEnvelope, faChevronDown, faUserCircle, faEdit, faCog, faSignOutAlt, faHome, faClipboard, faChartBar, faQuestionCircle, faPlusCircle, faBookOpen, faComments, faUser, faUsers, faBook, faChartLine, faChalkboardTeacher, faUserGraduate, faClipboardCheck, faChartPie, faTasks, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { Router, NavigationEnd } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { PerfilDto } from '../../models/PerfilDto';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css'],
    imports: [FaIconComponent]
})

export class NavbarComponent implements OnInit {
  private router = inject(Router);
  private perfilService = inject(ProfileService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  // Iconos
  faBars = faBars;
  faBell = faBell;
  faPlusCircle = faPlusCircle;
  faEnvelope = faEnvelope;
  faChevronDown = faChevronDown;
  faUserCircle = faUserCircle;
  faEdit = faEdit;
  faCog = faCog;
  faSignOutAlt = faSignOutAlt;
  faHome = faHome;
  faClipboard = faClipboard;
  faChartBar = faChartBar;
  faQuestionCircle = faQuestionCircle;
  faBookOpen = faBookOpen;
  faComments = faComments;
  faUser = faUser;
  faUsers = faUsers;
  faBook = faBook;
  faChalkboardTeacher = faChalkboardTeacher;
  faChartLine = faChartLine;
  faUserGraduate = faUserGraduate;
  faClipboardCheck = faClipboardCheck;
  faChartPie = faChartPie;
  faTasks = faTasks;
  faClipboardList = faClipboardList;

  // Propiedades del componente
  readonly title = signal<string>('Dashboard');
  readonly isDropdownOpen = signal(false);
  readonly isSidebarOpen = signal(false);
  readonly currentRoute = signal<string>('');
  readonly userProfile = signal<PerfilDto | null>(null);
  readonly userRole = signal<string>('');

  ngOnInit(): void {
    // Ruta inicial: el navbar se crea después de la primera navegación
    this.updateTitleBasedOnRoute(this.router.url);
    this.currentRoute.set(this.router.url);

    // Actualizar título y ruta en cada navegación (se cancela al destruir el navbar)
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateTitleBasedOnRoute(event.urlAfterRedirects);
        this.currentRoute.set(event.urlAfterRedirects);
      }
    });

    // Cargar perfil del usuario y rol
    this.cargarPerfil();
    this.obtenerRolUsuario();
  }

  // Cargar perfil del usuario logueado
  cargarPerfil() {
    const userId = localStorage.getItem('idUsuario');
    if (userId) {
      this.perfilService.getProfile(Number(userId)).subscribe(
        (response) => {
          this.userProfile.set(response);
          if (!localStorage.getItem('userRole') && response) {
            localStorage.setItem('userRole', response.id_rol.toString());
            this.obtenerRolUsuario();
          }
        },
        (error) => {
          console.error('Error al cargar el perfil del usuario:', error);
        }
      );
    }
  }

  // Obtener el rol del usuario almacenado en localStorage
  obtenerRolUsuario() {
    const storedUserRole = localStorage.getItem('userRole');
    if (storedUserRole) {
      switch (storedUserRole) {
        case '1':
          this.userRole.set('Administrador');
          break;
        case '2':
          this.userRole.set('Estudiante');
          break;
        case '3':
          this.userRole.set('Tutor');
          break;
        default:
          this.userRole.set('Estudiante');
      }
    } else {
      this.userRole.set('Estudiante');
    }
    console.log('Rol de usuario:', this.userRole()); // Verificar rol en la consola
  }

  // Actualizar título según la ruta actual
  updateTitleBasedOnRoute(url: string): void {
    const routeTitleMap = new Map<string, string>([
      ['/home', 'Dashboard'],
      ['/quizzes', 'Quizzes'],
      ['/course-categories', 'Cursos'],
      ['/forum', 'Foro'],
      ['/profile', 'Perfil'],
      ['/help', 'Ayuda'],
      ['/user-management', 'Gestión de Usuarios'],
      ['/course-management', 'Gestión de Cursos'],
      ['/reports', 'Reportes'],
      ['/settings', 'Configuraciones'],
      ['/my-courses', 'Mis Cursos'],
      ['/my-courses-student', 'Mis Cursos'],
      ['/students', 'Estudiantes'],
      ['/evaluations', 'Evaluaciones'],
      ['/progress', 'Progreso'],
      ['/tasks', 'Tareas'],

    ]);

    for (let [route, title] of routeTitleMap.entries()) {
      if (url.includes(route)) {
        this.title.set(title);
        return;
      }
    }

    this.title.set('Dashboard');
  }

  // Control de apertura y cierre de dropdown
  toggleDropdown() {
    this.isDropdownOpen.set(!this.isDropdownOpen());
  }

  // Control de apertura y cierre de sidebar
  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  // Navegación entre rutas
  navigateTo(route: string) {
    this.router.navigate([route]);
    this.isSidebarOpen.set(false);
  }

  // Ver perfil del usuario
  viewProfile() {
    this.router.navigate(['/perfil']);
    this.isDropdownOpen.set(false);
  }

  // Editar perfil del usuario
  editProfile() {
    this.router.navigate(['/updateperfil']);
    this.isDropdownOpen.set(false);
  }

  // Abrir configuraciones
  openSettings() {
    console.log('Settings clicked');
  }

  // Cerrar sesión y limpiar datos almacenados
  logout() {
    this.authService.logout();
    localStorage.removeItem('userRole');
    localStorage.removeItem('idUsuario');
    this.router.navigate(['/login']);
  }
}
