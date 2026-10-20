import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { FormField, form, max, maxLength, min, pattern, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faChalkboardTeacher, faImage, faLocationDot, faSchool, faSitemap, faTrash, faUserGraduate } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../../core/auth/session.service';
import { NIVELES, Nivel } from '../../../../core/models/academico.model';
import { DEPARTAMENTOS, DEPENDENCIAS, Institucion } from '../../../../core/models/institucion.model';
import { AcademicoService } from '../../../../services/academico.service';
import { InstitucionService, LOGO_MAX_KB } from '../../../../services/institucion.service';
import { PersonasService } from '../../../../services/personas.service';
import { AvisosService } from '../../../../shared/ui/avisos.service';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { mensajeError } from '../../academico/academico.ui';
import { PATRON_EMAIL, PATRON_TELEFONO } from '../../personas/personas.ui';

type Modelo = Omit<Institucion, 'id'>;

const VACIO: Modelo = {
  nombre: '', sigla: '', lema: '', codigoSie: '', dependencia: 'particular', niveles: [], fundacion: new Date().getFullYear(),
  departamento: 'La Paz', municipio: '', zona: '', direccion: '', telefono: '', email: '', sitioWeb: '', director: '', subdirector: '', logo: '',
};

// Datos generales de la institución: identidad, ubicación, contacto, autoridades y logo
@Component({
  selector: 'app-datos-institucion',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, RouterLink, PageHeaderComponent],
  templateUrl: './datos-institucion.component.html',
  styleUrls: ['./datos-institucion.component.css'],
})
export class DatosInstitucionComponent {
  private session = inject(SessionService);
  private institucion = inject(InstitucionService);
  private academico = inject(AcademicoService);
  private personas = inject(PersonasService);
  private avisos = inject(AvisosService);
  private readonly espacioId = this.session.espacioActivo()!.id;

  readonly niveles = NIVELES;
  readonly dependencias = DEPENDENCIAS;
  readonly departamentos = DEPARTAMENTOS;
  readonly LOGO_MAX_KB = LOGO_MAX_KB;
  readonly anioActual = new Date().getFullYear();
  readonly faCalendarDays = faCalendarDays;
  readonly faChalkboardTeacher = faChalkboardTeacher;
  readonly faImage = faImage;
  readonly faLocationDot = faLocationDot;
  readonly faSchool = faSchool;
  readonly faSitemap = faSitemap;
  readonly faTrash = faTrash;
  readonly faUserGraduate = faUserGraduate;

  readonly datos = rxResource({ stream: () => this.institucion.datos(this.espacioId) });
  private readonly original = computed<Modelo>(() => {
    const d = this.datos.value();
    if (!d) return { ...VACIO, nombre: this.session.espacioActivo()!.nombre };
    const { id: _id, ...resto } = d;
    return resto;
  });

  readonly modelo = linkedSignal<Modelo>(() => structuredClone(this.original()));
  readonly formulario = form(this.modelo, (s) => {
    required(s.nombre, { message: 'El nombre es obligatorio.' });
    maxLength(s.nombre, 100, { message: 'Máximo 100 caracteres.' });
    maxLength(s.sigla, 10, { message: 'Máximo 10 caracteres.' });
    maxLength(s.lema, 120, { message: 'Máximo 120 caracteres.' });
    required(s.codigoSie, { message: 'El código SIE es obligatorio.' });
    pattern(s.codigoSie, /^\d{8}$/, { message: 'Debe tener 8 dígitos.' });
    min(s.fundacion, 1800, { message: 'Año no válido.' });
    max(s.fundacion, this.anioActual, { message: 'No puede ser un año futuro.' });
    required(s.municipio, { message: 'Indica el municipio.' });
    required(s.direccion, { message: 'Indica la dirección.' });
    pattern(s.telefono, PATRON_TELEFONO, { message: 'Debe tener 7 u 8 dígitos.' });
    pattern(s.email, PATRON_EMAIL, { message: 'Correo no válido.' });
    pattern(s.sitioWeb, /^(https?:\/\/[^\s/.]+\.[^\s]+)?$/, { message: 'Debe empezar con http:// o https://' });
    required(s.director, { message: 'Indica quién dirige la institución.' });
  });

  readonly sinGuardar = computed(() => JSON.stringify(this.modelo()) !== JSON.stringify(this.original()));
  readonly guardando = signal(false);

  // Resumen de la institución en la gestión activa
  readonly resumen = rxResource({
    stream: () =>
      forkJoin({
        gestion: this.academico.gestionActiva(this.espacioId),
        paralelos: this.academico.paralelosActivos(this.espacioId),
        docentes: this.personas.docentes(),
      }),
  });

  readonly cifras = computed(() => {
    const r = this.resumen.value();
    return {
      gestion: r?.gestion?.anio ?? '—',
      paralelos: r?.paralelos.length ?? 0,
      estudiantes: r?.paralelos.reduce((s, p) => s + p.estudiantes, 0) ?? 0,
      docentes: r?.docentes.filter((d) => d.activo).length ?? 0,
    };
  });

  ruta(...segmentos: string[]) {
    return this.session.rutaRol(...segmentos);
  }

  tieneNivel(nivel: Nivel): boolean {
    return this.modelo().niveles.includes(nivel);
  }

  cambiarNivel(nivel: Nivel, activo: boolean): void {
    this.modelo.update((m) => ({ ...m, niveles: NIVELES.map((n) => n.id).filter((id) => (id === nivel ? activo : m.niveles.includes(id))) }));
  }

  dependenciaLabel(): string {
    return DEPENDENCIAS.find((d) => d.id === this.modelo().dependencia)?.label ?? '';
  }

  elegirLogo(event: Event): void {
    const entrada = event.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      this.avisos.error('El logo debe ser una imagen (PNG, JPG o SVG).');
      return;
    }
    if (archivo.size > LOGO_MAX_KB * 1024) {
      this.avisos.error(`El logo debe pesar menos de ${LOGO_MAX_KB} KB.`);
      return;
    }
    const lector = new FileReader();
    lector.onload = () => this.modelo.update((m) => ({ ...m, logo: String(lector.result) }));
    lector.readAsDataURL(archivo);
  }

  quitarLogo(): void {
    this.modelo.update((m) => ({ ...m, logo: '' }));
  }

  descartar(): void {
    this.modelo.set(structuredClone(this.original()));
  }

  guardar(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        const m = this.modelo();
        const guardado = await firstValueFrom(this.institucion.guardar({ ...m, id: this.espacioId, fundacion: Number(m.fundacion) }));
        this.session.renombrarEspacio(this.espacioId, guardado.nombre);
        this.avisos.exito('Datos de la institución guardados.');
        this.datos.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }
}
