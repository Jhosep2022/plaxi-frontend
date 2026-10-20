import { Component, ElementRef, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faAnglesLeft,
  faAnglesRight,
  faBook,
  faChalkboardTeacher,
  faChevronDown,
  faEdit,
  faPlus,
  faSchool,
  faSignOutAlt,
  faTableCells,
  faUserCircle,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { ROL_LABEL, TIPO_ESPACIO_LABEL } from '../../core/models/espacio.model';
import { CourseService } from '../../services/course.service';
import { InscripcionService } from '../../services/inscripcion.service';
import { AulasService } from '../../services/aulas.service';
import { iconoMateria } from '../../shared/ui/iconos-academicos';
import { PerfilService } from '../../services/perfil.service';
import { ProfileService } from '../../services/profile.service';
import { PerfilDto } from '../../models/PerfilDto';
import { NavItem, NavModule, navegacion } from './sidebar.navigation';

const COLLAPSED_KEY = 'sidebarCollapsed';
const esMovil = () => typeof window !== 'undefined' && window.innerWidth <= 768;

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css', './sidebar-espacio.css', './sidebar-movil.css'],
  imports: [RouterLink, RouterLinkActive, FaIconComponent],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'cerrarMenus()',
  },
})
export class SidebarComponent {
  private router = inject(Router);
  protected readonly session = inject(SessionService);
  private profileService = inject(ProfileService);
  private perfilService = inject(PerfilService);
  private courseService = inject(CourseService);
  private inscripcionService = inject(InscripcionService);
  private aulas = inject(AulasService);
  private elementRef = inject(ElementRef<HTMLElement>);

  // Íconos usados directamente en la plantilla
  readonly faAnglesLeft = faAnglesLeft;
  readonly faAnglesRight = faAnglesRight;
  readonly faChevronDown = faChevronDown;
  readonly faPlus = faPlus;
  readonly faUserCircle = faUserCircle;
  readonly faEdit = faEdit;
  readonly faSignOutAlt = faSignOutAlt;
  readonly faTableCells = faTableCells;
  readonly faWandMagicSparkles = faWandMagicSparkles;
  readonly faSchool = faSchool;
  readonly faChalkboardTeacher = faChalkboardTeacher;
  readonly rolLabel = ROL_LABEL;
  readonly tipoLabel = TIPO_ESPACIO_LABEL;

  // Espacio y rol activos (el layout se recrea al cambiar de espacio)
  readonly membresia = this.session.membresiaActiva;
  readonly espacio = computed(() => this.membresia()?.espacio ?? null);
  readonly rol = computed(() => this.membresia()?.rol ?? null);
  private readonly slug = computed(() => this.espacio()?.slug ?? '');

  // Se vuelve a cargar cuando el usuario cambia su nombre o su foto en "Mi perfil"
  private readonly perfilRecurso = rxResource({
    params: () => ({ id: this.session.usuarioId(), version: this.perfilService.version() }),
    stream: ({ params }) => (params.id ? this.profileService.getProfile(params.id) : of(null)),
  });
  readonly profile = computed<PerfilDto | null>(() => this.perfilRecurso.value() ?? null);

  readonly fullName = computed(() => {
    const p = this.profile();
    return p ? `${p.nombre} ${p.primerApellido}` : '';
  });

  readonly initials = computed(() => {
    const p = this.profile();
    return p ? `${p.nombre.charAt(0)}${p.primerApellido.charAt(0)}`.toUpperCase() : '';
  });

  // Cursos del usuario: creados (docente) o inscritos (estudiante)
  private readonly misCursos = toSignal(this.cargarMisCursos(), { initialValue: [] as NavItem[] });

  // Módulos del riel según el tipo de espacio y el rol, con la lista de cursos ya completada
  readonly modules = computed<NavModule[]>(() => {
    const espacio = this.espacio();
    const rol = this.rol();
    if (!espacio || !rol) return [];
    return navegacion(espacio.tipo, rol).map((modulo) => ({
      ...modulo,
      sections: modulo.sections.map((s) => (s.misCursos ? { ...s, items: this.misCursos() } : s)),
    }));
  });

  // URL actual como signal
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  // Módulo activo: sigue a la ruta, pero se puede cambiar a mano desde el riel
  readonly activeModuleId = linkedSignal(() => this.moduloParaUrl(this.url()));
  readonly activeModule = computed(
    () => this.modules().find((m) => m.id === this.activeModuleId()) ?? this.modules()[0]
  );

  readonly collapsed = signal(this.readCollapsed());
  readonly userMenuOpen = signal(false);
  readonly espacioMenuOpen = signal(false);

  constructor() {
    // En celular el panel flota sobre el contenido: se cierra después de cada navegación
    effect(() => {
      this.url();
      if (esMovil()) untracked(() => this.collapsed.set(true));
    });
  }

  // Link absoluto dentro del espacio activo
  link(route: string): string {
    return `/${this.slug()}/${route}`;
  }

  selectModule(id: string): void {
    this.activeModuleId.set(id);
    if (this.collapsed()) {
      this.setCollapsed(false);
    }
  }

  toggleCollapsed(): void {
    this.setCollapsed(!this.collapsed());
  }

  cerrarMenus(): void {
    this.userMenuOpen.set(false);
    this.espacioMenuOpen.set(false);
  }

  logout(): void {
    this.cerrarMenus();
    this.session.cerrarSesion();
  }

  // Cierra los menús desplegables al hacer clic fuera de ellos
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    const host = this.elementRef.nativeElement;
    if (this.userMenuOpen() && !host.querySelector('.user-menu-wrapper')?.contains(target)) {
      this.userMenuOpen.set(false);
    }
    if (this.espacioMenuOpen() && !host.querySelector('.espacio-wrapper')?.contains(target)) {
      this.espacioMenuOpen.set(false);
    }
  }

  private cargarMisCursos(): Observable<NavItem[]> {
    const usuarioId = this.session.usuarioId();
    const rol = this.rol();
    if (!usuarioId) return of([]);

    const espacioId = this.session.espacioActivo()?.id;
    if (!espacioId) return of([]);
    if (rol === 'docente') {
      return this.aulas.aulasDocente(espacioId, usuarioId).pipe(
        map((aulas) => aulas.map((a) => ({ label: a.nombre, icon: iconoMateria(a.icono), route: `docente/clases/${a.id}` })))
      );
    }
    if (rol === 'estudiante') {
      return this.aulas.aulasEstudiante(espacioId, usuarioId).pipe(
        map((aulas) => aulas.map((a) => ({ label: a.nombre, icon: iconoMateria(a.icono), route: `estudiante/aulas/${a.id}` })))
      );
    }
    return of([]);
  }

  // Elige el módulo con el link que mejor coincide con la ruta actual
  private moduloParaUrl(url: string): string {
    const ruta = url.split('?')[0].replace(`/${this.slug()}/`, '');
    let mejor = { id: this.modules()[0]?.id ?? 'inicio', largo: -1 };
    for (const modulo of this.modules()) {
      for (const section of modulo.sections) {
        for (const item of section.items) {
          const coincide = ruta === item.route || ruta.startsWith(`${item.route}/`);
          if (coincide && item.route.length > mejor.largo) {
            mejor = { id: modulo.id, largo: item.route.length };
          }
        }
      }
    }
    return mejor.id;
  }

  private readCollapsed(): boolean {
    if (esMovil()) return true;
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private setCollapsed(value: boolean): void {
    this.collapsed.set(value);
    if (esMovil()) return; // la preferencia guardada es solo para escritorio
    try {
      localStorage.setItem(COLLAPSED_KEY, String(value));
    } catch {
      // Sin almacenamiento disponible: solo se pierde la preferencia
    }
  }
}
