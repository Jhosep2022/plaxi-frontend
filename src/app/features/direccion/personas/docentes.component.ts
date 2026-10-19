import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChalkboardTeacher, faEnvelope, faMagnifyingGlass, faPen, faPhone, faPlus, faUserSlash, faUserTie } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { Docente } from '../../../core/models/academico.model';
import { iniciales } from '../../../core/models/personas.model';
import { PersonasService } from '../../../services/personas.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../academico/academico.ui';
import { PATRON_CI, PATRON_EMAIL, PATRON_TELEFONO } from './personas.ui';

const DOCENTE_VACIO = { nombre: '', ci: '', especialidad: '', telefono: '', email: '', activo: true };
type Filtro = 'activos' | 'baja' | 'todos';

// Docentes del colegio: datos personales, materias que dictan y estado (activo / de baja)
@Component({
  selector: 'app-docentes',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, PageHeaderComponent, DrawerComponent],
  templateUrl: './docentes.component.html',
  styleUrls: ['./personas.css'],
})
export class DocentesComponent {
  private personas = inject(PersonasService);
  private avisos = inject(AvisosService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly iniciales = iniciales;
  readonly faChalkboardTeacher = faChalkboardTeacher;
  readonly faEnvelope = faEnvelope;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faPen = faPen;
  readonly faPhone = faPhone;
  readonly faPlus = faPlus;
  readonly faUserSlash = faUserSlash;
  readonly faUserTie = faUserTie;

  readonly docentes = rxResource({ stream: () => this.personas.docentes(), defaultValue: [] });
  readonly carga = rxResource({ stream: () => this.personas.cargaDocentes(), defaultValue: new Map() });
  readonly cuentas = rxResource({ stream: () => this.personas.cuentas(this.espacioId), defaultValue: new Set<number>() });

  readonly busqueda = signal('');
  readonly filtro = signal<Filtro>('activos');

  readonly conteo = computed(() => {
    const activos = this.docentes.value().filter((d) => d.activo);
    return {
      activos: activos.length,
      conMaterias: activos.filter((d) => this.carga.value().has(d.id)).length,
      sinMaterias: activos.filter((d) => !this.carga.value().has(d.id)).length,
      baja: this.docentes.value().length - activos.length,
    };
  });

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return this.docentes.value()
      .filter((d) => this.filtro() === 'todos' || (this.filtro() === 'activos') === d.activo)
      .filter((d) => !texto || [d.nombre, d.ci, d.especialidad, d.email].some((v) => v.toLowerCase().includes(texto)));
  });

  // ---------- Formulario ----------
  readonly drawerAbierto = signal(false);
  readonly editandoId = signal(0);
  readonly guardando = signal(false);
  readonly modelo = signal({ ...DOCENTE_VACIO });
  readonly formulario = form(this.modelo, (s) => {
    required(s.nombre, { message: 'Escribe el nombre completo.' });
    maxLength(s.nombre, 80, { message: 'Máximo 80 caracteres.' });
    required(s.ci, { message: 'El CI es obligatorio.' });
    pattern(s.ci, PATRON_CI, { message: 'Solo números (con complemento opcional, ej. 4876512-1B).' });
    required(s.especialidad, { message: 'Indica su especialidad.' });
    pattern(s.telefono, PATRON_TELEFONO, { message: 'Debe tener 7 u 8 dígitos.' });
    pattern(s.email, PATRON_EMAIL, { message: 'Correo no válido.' });
  });

  nuevo(): void {
    this.abrir(0, { ...DOCENTE_VACIO });
  }

  editar(d: Docente): void {
    const { nombre, ci, especialidad, telefono, email, activo } = d;
    this.abrir(d.id, { nombre, ci, especialidad, telefono, email, activo });
  }

  guardar(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        await firstValueFrom(this.personas.guardarDocente({ ...this.modelo(), id: this.editandoId() || undefined }));
        this.avisos.exito(this.editandoId() ? 'Docente actualizado.' : `${this.modelo().nombre.trim()} fue registrado.`);
        this.drawerAbierto.set(false);
        this.docentes.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  private abrir(id: number, valores: typeof DOCENTE_VACIO): void {
    this.editandoId.set(id);
    this.modelo.set(valores);
    this.formulario().reset();
    this.drawerAbierto.set(true);
  }
}
