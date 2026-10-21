import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { FormField, form, maxLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft, faArrowRight, faBookOpen, faChalkboardTeacher, faCheck, faCircleExclamation, faEye, faEyeSlash, faGraduationCap, faLink, faSchool, faTicket, faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { SessionService, olvidarVolverA } from '../../core/auth/session.service';
import type { ResultadoRegistro, TipoCuenta } from '../../core/models/auth.model';
import { PATRON_SLUG, slugDe } from '../../core/models/auth.model';
import { errorClave } from '../../core/utils/clave';
import { AcademiaService } from '../../services/academia.service';
import { AuthService } from '../../services/auth.service';
import { CategoriaService } from '../../services/categoria.service';
import { PATRON_CORREO, PATRON_USUARIO } from '../../services/perfil.service';
import { MedidorClaveComponent } from '../../shared/ui/medidor-clave.component';
import { mensajeError } from '../direccion/academico/academico.ui';

type Paso = 1 | 2 | 3 | 4; // 4 = cuenta creada

// Crear cuenta en pasos: tipo de cuenta, datos personales, y la academia (docente) o el curso (estudiante)
@Component({
  selector: 'app-registro',
  imports: [FormField, RouterLink, FaIconComponent, MedidorClaveComponent],
  templateUrl: './registro.component.html',
  styleUrls: ['./auth.css', './registro.component.css'],
})
export class RegistroComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private session = inject(SessionService);
  private academia = inject(AcademiaService);
  private categoriasService = inject(CategoriaService);

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
  readonly tipoInicial = input<string>(undefined, { alias: 'tipo' });
  readonly codigoInicial = input<string>(undefined, { alias: 'codigo' });

  readonly paso = signal<Paso>(1);
  readonly tipo = signal<TipoCuenta | null>(null);
  readonly error = signal('');
  readonly enviando = signal(false);
  readonly resultado = signal<ResultadoRegistro | null>(null);

  // Curso de la invitación (si llegó con un código)
  readonly invitacion = rxResource({
    params: () => this.codigoInicial(),
    stream: ({ params }) => (params ? this.academia.cursoPorCodigo(params, null) : of(null)),
  });
  readonly categorias = rxResource({ stream: () => this.categoriasService.getAllCategorias(), defaultValue: [] });

  ngOnInit(): void {
    {
      if (this.codigoInicial()) {
        this.tipo.set('estudiante');
        this.cuentaModelo.update((m) => ({ ...m, codigo: this.codigoInicial()!.toUpperCase() }));
        this.paso.set(2);
      } else if (this.tipoInicial() === 'docente' || this.tipoInicial() === 'estudiante') {
        this.tipo.set(this.tipoInicial() as TipoCuenta);
      }
    }
  }

  elegir(tipo: TipoCuenta): void {
    this.tipo.set(tipo);
    this.paso.set(2);
  }

  // ---------- Paso 2: datos ----------
  readonly datos = signal({ nombre: '', primerApellido: '', segundoApellido: '', correo: '', usuario: '', clave: '', terminos: false });
  readonly fDatos = form(this.datos, (s) => {
    required(s.nombre, { message: 'Escribe tu nombre.' });
    required(s.primerApellido, { message: 'Escribe tu primer apellido.' });
    required(s.correo, { message: 'Escribe tu correo.' });
    pattern(s.correo, PATRON_CORREO, { message: 'Escribe un correo válido.' });
    required(s.usuario, { message: 'Elige un nombre de usuario.' });
    pattern(s.usuario, PATRON_USUARIO, { message: 'De 3 a 20 caracteres en minúscula: letras, números, punto o guion bajo.' });
    required(s.clave, { message: 'Crea una contraseña.' });
    validate(s.clave, ({ value }) => (errorClave(value()) ? { kind: 'debil', message: errorClave(value()) } : undefined));
    validate(s.terminos, ({ value }) => (!value() ? { kind: 'terminos', message: 'Debes aceptar los términos para continuar.' } : undefined));
  });
  readonly mostrar = signal(false);
  readonly usuarioOcupado = signal(false);
  readonly correoOcupado = signal(false);

  async revisarUsuario(): Promise<void> {
    const u = this.datos().usuario.trim().toLowerCase();
    this.usuarioOcupado.set(PATRON_USUARIO.test(u) && !(await firstValueFrom(this.auth.usuarioDisponible(u))));
  }

  async revisarCorreo(): Promise<void> {
    const c = this.datos().correo.trim().toLowerCase();
    this.correoOcupado.set(PATRON_CORREO.test(c) && !(await firstValueFrom(this.auth.correoDisponible(c))));
  }

  // Sugiere un usuario a partir del nombre si todavía no escribió uno
  sugerirUsuario(): void {
    const d = this.datos();
    if (d.usuario || !d.nombre.trim() || !d.primerApellido.trim()) return;
    const base = slugDe(`${d.nombre.split(' ')[0]}.${d.primerApellido}`).replace(/-/g, '.').slice(0, 20);
    this.datos.update((m) => ({ ...m, usuario: base }));
    this.revisarUsuario();
  }

  continuarDatos(): void {
    submit(this.fDatos, async () => {
      await Promise.all([this.revisarUsuario(), this.revisarCorreo()]);
      if (this.usuarioOcupado() || this.correoOcupado()) return;
      if (this.tipo() === 'docente' && !this.cuentaModelo().academia) {
        const nombre = `Academia de ${this.datos().nombre.split(' ')[0]} ${this.datos().primerApellido}`;
        this.cuentaModelo.update((m) => ({ ...m, academia: nombre, slug: slugDe(nombre) }));
        this.revisarSlug();
      }
      this.paso.set(3);
    });
  }

  // ---------- Paso 3: academia (docente) o curso (estudiante) ----------
  readonly cuentaModelo = signal({ academia: '', slug: '', curso: '', categoria: '', codigo: '' });
  readonly fCuenta = form(this.cuentaModelo, (s) => {
    maxLength(s.academia, 60, { message: 'Máximo 60 caracteres.' });
    pattern(s.slug, PATRON_SLUG, { message: 'Solo minúsculas, números y guiones.' });
    pattern(s.codigo, /^[A-Za-z0-9]{3}-[A-Za-z0-9]{4}$/, { message: 'El código tiene el formato ABC-1234.' });
    maxLength(s.codigo, 8, { message: 'El código tiene el formato ABC-1234.' });
  });
  private slugEditado = false;
  readonly slugOcupado = signal(false);

  cambiarNombreAcademia(nombre: string): void {
    this.cuentaModelo.update((m) => ({ ...m, academia: nombre, slug: this.slugEditado ? m.slug : slugDe(nombre) }));
  }

  cambiarSlug(slug: string): void {
    this.slugEditado = true;
    this.cuentaModelo.update((m) => ({ ...m, slug: slug.toLowerCase() }));
  }

  async revisarSlug(): Promise<void> {
    const slug = this.cuentaModelo().slug;
    this.slugOcupado.set(PATRON_SLUG.test(slug) && !(await firstValueFrom(this.auth.slugDisponible(slug))));
  }

  readonly puedeCrear = computed(() => {
    const m = this.cuentaModelo();
    if (this.tipo() === 'docente') return !!m.academia.trim() && m.slug.length >= 3 && PATRON_SLUG.test(m.slug) && !this.slugOcupado() && (!m.curso.trim() || !!m.categoria);
    return true;
  });

  crear(omitirCodigo = false): void {
    submit(this.fCuenta, async () => {
      if (this.tipo() === 'docente') await this.revisarSlug();
      if (!this.puedeCrear()) return;
      this.enviando.set(true);
      this.error.set('');
      try {
        const d = this.datos();
        const m = this.cuentaModelo();
        const resultado = await firstValueFrom(this.auth.registrar({
          tipo: this.tipo()!, nombre: d.nombre, primerApellido: d.primerApellido, segundoApellido: d.segundoApellido, correo: d.correo, usuario: d.usuario, clave: d.clave,
          academia: this.tipo() === 'docente' ? { nombre: m.academia, slug: m.slug, primerCurso: m.curso.trim() ? { nombre: m.curso, categoria: m.categoria } : null } : undefined,
          codigoCurso: this.tipo() === 'estudiante' && !omitirCodigo && m.codigo.trim() ? m.codigo.trim() : undefined,
        }));
        await firstValueFrom(this.session.iniciarSesion(resultado.usuarioId));
        olvidarVolverA();
        this.resultado.set(resultado);
        this.paso.set(4);
      } catch (e) {
        this.error.set(mensajeError(e));
      } finally {
        this.enviando.set(false);
      }
    });
  }

  // ---------- Paso 4: listo ----------
  readonly primerosPasos = computed(() => {
    const r = this.resultado();
    if (!r?.espacioSlug) return [];
    const base = `/${r.espacioSlug}/docente`;
    return [
      { titulo: r.aulaId ? 'Agrega contenido a tu curso' : 'Crea tu primer curso', texto: 'Unidades, temas, videos y PDF.', icono: faBookOpen, link: r.aulaId ? `${base}/clases/${r.aulaId}` : `${base}/cursos/nuevo`, query: r.aulaId ? { tab: 'contenido' } : {} },
      { titulo: 'Invita a tus estudiantes', texto: 'Comparte el link o el código del curso.', icono: faLink, link: `${base}/invitaciones`, query: {} },
      { titulo: 'Programa una sesión en vivo', texto: 'Con tu enlace de Meet o Zoom.', icono: faVideo, link: `${base}/sesiones`, query: {} },
    ];
  });

  irAlInicio(): void {
    const r = this.resultado();
    if (!r?.espacioSlug) return void this.router.navigateByUrl('/espacios');
    if (this.tipo() === 'estudiante' && r.aulaId && r.inscripcion === 'ACTIVA') return void this.router.navigate(['/', r.espacioSlug, 'estudiante', 'aulas', r.aulaId]);
    this.router.navigate(['/', r.espacioSlug, this.tipo(), 'inicio']);
  }

  atras(): void {
    this.error.set('');
    this.paso.update((p) => (p > 1 ? ((p - 1) as Paso) : p));
  }
}
