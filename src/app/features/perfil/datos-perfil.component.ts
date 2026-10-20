import { Component, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faAddressCard, faBriefcase, faCameraRetro, faChalkboardTeacher, faCircleCheck, faEnvelope, faEye, faGlobe, faHeartPulse, faPen, faPlay, faUser, faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import type { Membresia } from '../../core/models/espacio.model';
import type { Perfil } from '../../core/models/perfil.model';
import { fechaConAnio, fechaLarga, hoyIso } from '../../core/utils/asistencia';
import { PATRON_CELULAR, PATRON_CORREO, PATRON_ENLACE, PATRON_USUARIO, PerfilService } from '../../services/perfil.service';
import { AvisosService } from '../../shared/ui/avisos.service';
import { mensajeError } from '../direccion/academico/academico.ui';

type Seccion = 'personales' | 'contacto' | 'cuenta' | 'docente' | 'emergencia';

const PATRON_CI = /^\d{5,10}(-?[A-Za-z0-9]{1,3})?$/;

// Pestaña "Datos personales": tarjetas que se editan en su lugar, avance del perfil y vista previa del perfil público
@Component({
  selector: 'app-datos-perfil',
  imports: [FaIconComponent, FormField],
  templateUrl: './datos-perfil.component.html',
  styleUrls: ['./perfil-secciones.css', './datos-perfil.component.css'],
})
export class DatosPerfilComponent {
  private session = inject(SessionService);
  private servicio = inject(PerfilService);
  private avisos = inject(AvisosService);

  readonly perfil = input.required<Perfil>();
  readonly membresia = input.required<Membresia>();
  readonly cambio = output<Perfil | null>();

  readonly fechaConAnio = fechaConAnio;
  readonly hoy = hoyIso();
  readonly faAddressCard = faAddressCard;
  readonly faBriefcase = faBriefcase;
  readonly faCameraRetro = faCameraRetro;
  readonly faChalkboardTeacher = faChalkboardTeacher;
  readonly faCircleCheck = faCircleCheck;
  readonly faEnvelope = faEnvelope;
  readonly faEye = faEye;
  readonly faGlobe = faGlobe;
  readonly faHeartPulse = faHeartPulse;
  readonly faPen = faPen;
  readonly faPlay = faPlay;
  readonly faUser = faUser;
  readonly faUserShield = faUserShield;

  private readonly usuarioId = this.session.usuarioId()!;
  readonly esDocente = computed(() => this.membresia().rol === 'docente');
  readonly esEstudiante = computed(() => this.membresia().rol === 'estudiante');
  readonly esAcademia = computed(() => this.membresia().espacio.tipo === 'academia');

  readonly editando = signal<Seccion | null>(null);
  readonly guardando = signal(false);

  // ---------- Formularios (uno por tarjeta) ----------
  readonly mPersonales = signal({ nombre: '', primerApellido: '', segundoApellido: '', ci: '', fechaNacimiento: '' });
  readonly fPersonales = form(this.mPersonales, (s) => {
    required(s.nombre, { message: 'Escribe tu nombre.' });
    required(s.primerApellido, { message: 'Escribe tu primer apellido.' });
    pattern(s.ci, PATRON_CI, { message: 'Solo números (5 a 10), con complemento opcional.' });
  });

  readonly mContacto = signal({ gmail: '', telefono: '', direccion: '' });
  readonly fContacto = form(this.mContacto, (s) => {
    required(s.gmail, { message: 'Escribe tu correo.' });
    pattern(s.gmail, PATRON_CORREO, { message: 'Escribe un correo válido.' });
    pattern(s.telefono, PATRON_CELULAR, { message: '8 dígitos, empieza con 6 o 7.' });
    maxLength(s.direccion, 120, { message: 'Máximo 120 caracteres.' });
  });

  readonly mCuenta = signal({ username: '' });
  readonly fCuenta = form(this.mCuenta, (s) => {
    required(s.username, { message: 'Escribe un nombre de usuario.' });
    pattern(s.username, PATRON_USUARIO, { message: 'De 3 a 20 caracteres en minúscula: letras, números, punto o guion bajo.' });
  });

  readonly mDocente = signal({ especialidad: '', bio: '', sitio: '', linkedin: '', instagram: '', youtube: '' });
  readonly fDocente = form(this.mDocente, (s) => {
    maxLength(s.especialidad, 80, { message: 'Máximo 80 caracteres.' });
    maxLength(s.bio, 400, { message: 'Máximo 400 caracteres.' });
    for (const campo of [s.sitio, s.linkedin, s.instagram, s.youtube]) pattern(campo, PATRON_ENLACE, { message: 'Debe empezar con https://' });
  });

  readonly mEmergencia = signal({ nombre: '', parentesco: '', telefono: '' });
  readonly fEmergencia = form(this.mEmergencia, (s) => {
    pattern(s.telefono, PATRON_CELULAR, { message: '8 dígitos, empieza con 6 o 7.' });
  });

  editar(seccion: Seccion): void {
    const p = this.perfil();
    switch (seccion) {
      case 'personales':
        this.mPersonales.set({ nombre: p.nombre, primerApellido: p.primerApellido, segundoApellido: p.segundoApellido, ci: p.ci, fechaNacimiento: p.fechaNacimiento });
        this.fPersonales().reset();
        break;
      case 'contacto':
        this.mContacto.set({ gmail: p.gmail, telefono: p.telefono, direccion: p.direccion });
        this.fContacto().reset();
        break;
      case 'cuenta':
        this.mCuenta.set({ username: p.username });
        this.fCuenta().reset();
        break;
      case 'docente':
        this.mDocente.set({ especialidad: p.especialidad, bio: p.bio, ...p.enlaces });
        this.fDocente().reset();
        break;
      case 'emergencia':
        this.mEmergencia.set({ ...p.contactoEmergencia });
        this.fEmergencia().reset();
        break;
    }
    this.editando.set(seccion);
  }

  guardar(seccion: Seccion): void {
    const id = this.usuarioId;
    switch (seccion) {
      case 'personales':
        return void submit(this.fPersonales, () => this.ejecutar(() => this.servicio.guardarPersonales(id, this.mPersonales()), 'Datos personales actualizados.'));
      case 'contacto':
        return void submit(this.fContacto, () => this.ejecutar(() => this.servicio.guardarContacto(id, this.mContacto()), 'Datos de contacto actualizados.'));
      case 'cuenta':
        return void submit(this.fCuenta, () => this.ejecutar(() => this.servicio.guardarUsuario(id, this.mCuenta().username), 'Nombre de usuario actualizado.'));
      case 'docente': {
        const { especialidad, bio, ...enlaces } = this.mDocente();
        return void submit(this.fDocente, () => this.ejecutar(() => this.servicio.guardarDocente(id, { especialidad, bio, enlaces }), this.esAcademia() ? 'Perfil público actualizado.' : 'Perfil profesional actualizado.'));
      }
      case 'emergencia':
        return void submit(this.fEmergencia, () => this.ejecutar(() => this.servicio.guardarEmergencia(id, this.mEmergencia()), 'Contacto de emergencia actualizado.'));
    }
  }

  private async ejecutar(accion: () => Observable<Perfil | null>, mensaje: string): Promise<void> {
    this.guardando.set(true);
    try {
      this.cambio.emit(await firstValueFrom(accion()));
      this.avisos.exito(mensaje);
      this.editando.set(null);
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  // ---------- Avance del perfil ----------
  readonly avance = computed(() => {
    const p = this.perfil();
    const campos: { label: string; listo: boolean }[] = [
      { label: 'Foto de perfil', listo: !!p.imagenUrl },
      { label: 'Carnet de identidad', listo: !!p.ci },
      { label: 'Fecha de nacimiento', listo: !!p.fechaNacimiento },
      { label: 'Celular', listo: !!p.telefono },
      { label: 'Dirección', listo: !!p.direccion },
    ];
    if (this.esDocente()) campos.push({ label: 'Especialidad', listo: !!p.especialidad }, { label: 'Presentación', listo: !!p.bio });
    if (this.esEstudiante()) campos.push({ label: 'Contacto de emergencia', listo: !!p.contactoEmergencia.nombre && !!p.contactoEmergencia.telefono });
    const listos = campos.filter((c) => c.listo).length;
    return { porcentaje: Math.round((listos / campos.length) * 100), faltan: campos.filter((c) => !c.listo).map((c) => c.label) };
  });

  readonly enlaces = computed(() => {
    const e = this.perfil().enlaces;
    return [
      { url: e.sitio, label: 'Sitio web', icono: faGlobe },
      { url: e.linkedin, label: 'LinkedIn', icono: faBriefcase },
      { url: e.instagram, label: 'Instagram', icono: faCameraRetro },
      { url: e.youtube, label: 'YouTube', icono: faPlay },
    ].filter((x) => x.url);
  });

  readonly iniciales = computed(() => `${this.perfil().nombre.charAt(0)}${this.perfil().primerApellido.charAt(0)}`.toUpperCase());

  edad(fecha: string): number {
    const [a, m, d] = fecha.split('-').map(Number);
    const [ha, hm, hd] = this.hoy.split('-').map(Number);
    return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
  }

  ultimoAcceso(iso: string): string {
    return iso ? `${fechaLarga(iso.slice(0, 10))}, ${iso.slice(11, 16)}` : '—';
  }
}
