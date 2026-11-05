import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { FormField, form, maxLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft, faArrowRight, faBookOpen, faChalkboardTeacher, faCheck, faCircleExclamation, faEye, faEyeSlash, faGraduationCap, faLink, faSchool, faTicket, faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { SessionService, forgetReturnUrl } from '../../core/auth/session.service';
import type { RegistrationResult, AccountType } from '../../core/models/auth.model';
import { SLUG_PATTERN, createSlug } from '../../core/models/auth.model';
import { getPasswordError } from '../../core/utils/password';
import { AcademyService } from '../../services/academy.service';
import { AuthService } from '../../services/auth.service';
import { CategoryService } from '../../services/category.service';
import { PATRON_CORREO, PATRON_USUARIO } from '../../services/account-profile.service';
import { PasswordStrengthComponent } from '../../shared/ui/password-strength.component';
import { getErrorMessage } from '../management/academics/academics.ui';

type RegistrationStep = 1 | 2 | 3 | 4; // 4 = cuenta creada

// Crear cuenta en pasos: tipo de cuenta, datos personales, y la academia (docente) o el curso (estudiante)
@Component({
  selector: 'app-registro',
  imports: [FormField, RouterLink, FaIconComponent, PasswordStrengthComponent],
  templateUrl: './registration.component.html',
  styleUrls: ['./auth.css', './registration.component.css'],
})
export class RegistrationComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private session = inject(SessionService);
  private academyService = inject(AcademyService);
  private categoryService = inject(CategoryService);

  readonly faArrowLeft = faArrowLeft;
  readonly faArrowRight = faArrowRight;
  readonly faBookOpen = faBookOpen;
  readonly faChalkboardTeacher = faChalkboardTeacher;
  readonly faCheck = faCheck;
  readonly faCircleExclamation = faCircleExclamation;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faGraduationCap = faGraduationCap;
  readonly faLink = faLink;
  readonly faSchool = faSchool;
  readonly faTicket = faTicket;
  readonly faVideo = faVideo;

  // ?tipo=docente|estudiante y ?codigo=ABC-1234 (link de invitación)
  readonly initialAccountType = input<string>(undefined, { alias: 'tipo' });
  readonly initialCourseCode = input<string>(undefined, { alias: 'codigo' });

  readonly step = signal<RegistrationStep>(1);
  readonly accountType = signal<AccountType | null>(null);
  readonly error = signal('');
  readonly isSubmitting = signal(false);
  readonly registrationResult = signal<RegistrationResult | null>(null);

  // Curso de la invitación (si llegó con un código)
  readonly invitation = rxResource({
    params: () => this.initialCourseCode(),
    stream: ({ params }) => (params ? this.academyService.getCourseByCode(params, null) : of(null)),
  });
  readonly categories = rxResource({ stream: () => this.categoryService.getAllCategories(), defaultValue: [] });

  ngOnInit(): void {
    {
      if (this.initialCourseCode()) {
        this.accountType.set('estudiante');
        this.accountDetails.update((m) => ({ ...m, codigo: this.initialCourseCode()!.toUpperCase() }));
        this.step.set(2);
      } else if (this.initialAccountType() === 'docente' || this.initialAccountType() === 'estudiante') {
        this.accountType.set(this.initialAccountType() as AccountType);
      }
    }
  }

  selectAccountType(accountType: AccountType): void {
    this.accountType.set(accountType);
    this.step.set(2);
  }

  // ---------- RegistrationStep 2: datos ----------
  readonly personalData = signal({ nombre: '', primerApellido: '', segundoApellido: '', correo: '', usuario: '', clave: '', terminos: false });
  readonly personalDataForm = form(this.personalData, (s) => {
    required(s.nombre, { message: 'Escribe tu nombre.' });
    required(s.primerApellido, { message: 'Escribe tu primer apellido.' });
    required(s.correo, { message: 'Escribe tu correo.' });
    pattern(s.correo, PATRON_CORREO, { message: 'Escribe un correo válido.' });
    required(s.usuario, { message: 'Elige un nombre de usuario.' });
    pattern(s.usuario, PATRON_USUARIO, { message: 'De 3 a 20 caracteres en minúscula: letras, números, punto o guion bajo.' });
    required(s.clave, { message: 'Crea una contraseña.' });
    validate(s.clave, ({ value }) => (getPasswordError(value()) ? { kind: 'debil', message: getPasswordError(value()) } : undefined));
    validate(s.terminos, ({ value }) => (!value() ? { kind: 'terminos', message: 'Debes aceptar los términos para continuar.' } : undefined));
  });
  readonly showPassword = signal(false);
  readonly usernameTaken = signal(false);
  readonly emailTaken = signal(false);

  async checkUsernameAvailability(): Promise<void> {
    const username = this.personalData().usuario.trim().toLowerCase();
    this.usernameTaken.set(PATRON_USUARIO.test(username) && !(await firstValueFrom(this.auth.isUsernameAvailable(username))));
  }

  async checkEmailAvailability(): Promise<void> {
    const email = this.personalData().correo.trim().toLowerCase();
    this.emailTaken.set(PATRON_CORREO.test(email) && !(await firstValueFrom(this.auth.isEmailAvailable(email))));
  }

  // Sugiere un usuario a partir del nombre si todavía no escribió uno
  suggestUsername(): void {
    const d = this.personalData();
    if (d.usuario || !d.nombre.trim() || !d.primerApellido.trim()) return;
    const base = createSlug(`${d.nombre.split(' ')[0]}.${d.primerApellido}`).replace(/-/g, '.').slice(0, 20);
    this.personalData.update((m) => ({ ...m, usuario: base }));
    this.checkUsernameAvailability();
  }

  continueRegistration(): void {
    submit(this.personalDataForm, async () => {
      await Promise.all([this.checkUsernameAvailability(), this.checkEmailAvailability()]);
      if (this.usernameTaken() || this.emailTaken()) return;
      if (this.accountType() === 'docente' && !this.accountDetails().academia) {
        const nombre = `Academia de ${this.personalData().nombre.split(' ')[0]} ${this.personalData().primerApellido}`;
        this.accountDetails.update((m) => ({ ...m, academia: nombre, slug: createSlug(nombre) }));
        this.checkSlugAvailability();
      }
      this.step.set(3);
    });
  }

  // ---------- RegistrationStep 3: academia (docente) o curso (estudiante) ----------
  readonly accountDetails = signal({ academia: '', slug: '', curso: '', categoria: '', codigo: '' });
  readonly accountForm = form(this.accountDetails, (s) => {
    maxLength(s.academia, 60, { message: 'Máximo 60 caracteres.' });
    pattern(s.slug, SLUG_PATTERN, { message: 'Solo minúsculas, números y guiones.' });
    pattern(s.codigo, /^[A-Za-z0-9]{3}-[A-Za-z0-9]{4}$/, { message: 'El código tiene el formato ABC-1234.' });
    maxLength(s.codigo, 8, { message: 'El código tiene el formato ABC-1234.' });
  });
  private isSlugEdited = false;
  readonly slugTaken = signal(false);

  updateAcademyName(academyName: string): void {
    this.accountDetails.update((m) => ({ ...m, academia: academyName, slug: this.isSlugEdited ? m.slug : createSlug(academyName) }));
  }

  updateSlug(slug: string): void {
    this.isSlugEdited = true;
    this.accountDetails.update((m) => ({ ...m, slug: slug.toLowerCase() }));
  }

  async checkSlugAvailability(): Promise<void> {
    const slug = this.accountDetails().slug;
    this.slugTaken.set(SLUG_PATTERN.test(slug) && !(await firstValueFrom(this.auth.isSlugAvailable(slug))));
  }

  readonly canSubmit = computed(() => {
    const m = this.accountDetails();
    if (this.accountType() === 'docente') return !!m.academia.trim() && m.slug.length >= 3 && SLUG_PATTERN.test(m.slug) && !this.slugTaken() && (!m.curso.trim() || !!m.categoria);
    return true;
  });

  submitRegistration(skipCode = false): void {
    submit(this.accountForm, async () => {
      if (this.accountType() === 'docente') await this.checkSlugAvailability();
      if (!this.canSubmit()) return;
      this.isSubmitting.set(true);
      this.error.set('');
      try {
        const d = this.personalData();
        const m = this.accountDetails();
        const result = await firstValueFrom(this.auth.register({
          tipo: this.accountType()!, nombre: d.nombre, primerApellido: d.primerApellido, segundoApellido: d.segundoApellido, correo: d.correo, usuario: d.usuario, clave: d.clave,
          academia: this.accountType() === 'docente' ? { nombre: m.academia, slug: m.slug, primerCurso: m.curso.trim() ? { nombre: m.curso, categoria: m.categoria } : null } : undefined,
          codigoCurso: this.accountType() === 'estudiante' && !skipCode && m.codigo.trim() ? m.codigo.trim() : undefined,
        }));
        await firstValueFrom(this.session.startSession(result.usuarioId));
        forgetReturnUrl();
        this.registrationResult.set(result);
        this.step.set(4);
      } catch (e) {
        this.error.set(getErrorMessage(e));
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  // ---------- RegistrationStep 4: listo ----------
  readonly gettingStartedSteps = computed(() => {
    const r = this.registrationResult();
    if (!r?.espacioSlug) return [];
    const base = `/${r.espacioSlug}/docente`;
    return [
      { titulo: r.aulaId ? 'Agrega contenido a tu curso' : 'Crea tu primer curso', texto: 'Unidades, temas, videos y PDF.', icono: faBookOpen, link: r.aulaId ? `${base}/clases/${r.aulaId}` : `${base}/cursos/nuevo`, query: r.aulaId ? { tab: 'contenido' } : {} },
      { titulo: 'Invita a tus estudiantes', texto: 'Comparte el link o el código del curso.', icono: faLink, link: `${base}/invitaciones`, query: {} },
      { titulo: 'Programa una sesión en vivo', texto: 'Con tu enlace de Meet o Zoom.', icono: faVideo, link: `${base}/sesiones`, query: {} },
    ];
  });

  goToStart(): void {
    const r = this.registrationResult();
    if (!r?.espacioSlug) return void this.router.navigateByUrl('/espacios');
    if (this.accountType() === 'estudiante' && r.aulaId && r.inscripcion === 'ACTIVA') return void this.router.navigate(['/', r.espacioSlug, 'estudiante', 'aulas', r.aulaId]);
    this.router.navigate(['/', r.espacioSlug, this.accountType(), 'inicio']);
  }

  goBack(): void {
    this.error.set('');
    this.step.update((p) => (p > 1 ? ((p - 1) as RegistrationStep) : p));
  }
}
