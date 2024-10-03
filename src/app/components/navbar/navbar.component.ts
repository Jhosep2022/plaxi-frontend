import { Component, OnInit } from '@angular/core';
import { faBars, faBell, faEnvelope, faChevronDown, faUserCircle, faEdit, faCog, faSignOutAlt, faHome, faClipboard, faChartBar, faQuestionCircle, faPlusCircle, faBookOpen, faComments, faUser, faUsers, faBook, faChartLine, faChalkboardTeacher, faUserGraduate, faClipboardCheck, faChartPie, faTasks, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { Router, NavigationEnd } from '@angular/router';
import { PerfilService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { PerfilDto } from '../../models/PerfilDto';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
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
  title: string = 'Dashboard';
  isDropdownOpen = false;
  isSidebarOpen = false;
  currentRoute: string = '';
  userProfile: PerfilDto | null = null;
  userRole: string = '';

  constructor(private router: Router, private perfilService: PerfilService, private authService: AuthService) {}

  ngOnInit(): void {
    // Actualizar título y ruta según la navegación
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateTitleBasedOnRoute(event.urlAfterRedirects);
        this.currentRoute = event.urlAfterRedirects;
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
          this.userProfile = response;
          if (!localStorage.getItem('userRole') && this.userProfile) {
            localStorage.setItem('userRole', this.userProfile.id_rol.toString());
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
          this.userRole = 'Administrador';
          break;
        case '2':
          this.userRole = 'Estudiante';
          break;
        case '3':
          this.userRole = 'Tutor';
          break;
        default:
          this.userRole = 'Estudiante';
      }
    } else {
      this.userRole = 'Estudiante';
    }
    console.log('Rol de usuario:', this.userRole); // Verificar rol en la consola
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
        this.title = title;
        return;
      }
    }

    this.title = 'Dashboard';
  }

  // Control de apertura y cierre de dropdown
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // Control de apertura y cierre de sidebar
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // Navegación entre rutas
  navigateTo(route: string) {
    this.router.navigate([route]);
    this.isSidebarOpen = false;
  }

  // Ver perfil del usuario
  viewProfile() {
    this.router.navigate(['/perfil']);
    this.isDropdownOpen = false;
  }

  // Editar perfil del usuario
  editProfile() {
    this.router.navigate(['/updateperfil']);
    this.isDropdownOpen = false;
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
