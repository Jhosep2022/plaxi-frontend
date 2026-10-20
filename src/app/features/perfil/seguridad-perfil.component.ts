import { Component, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faDesktop, faEye, faEyeSlash, faKey, faLaptop, faMobileScreen, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import type { Dispositivo, Perfil } from '../../core/models/perfil.model';
import { fechaConAnio, fechaLarga } from '../../core/utils/asistencia';
import { PerfilService } from '../../services/perfil.service';
import { AvisosService } from '../../shared/ui/avisos.service';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { mensajeError } from '../direccion/academico/academico.ui';

const VACIA = { actual: '', nueva: '', repetir: '' };

// Reglas de la nueva contraseña (se muestran como lista que se va marcando)
const REGLAS = [
  { label: 'Al menos 8 caracteres', cumple: (c: string) => c.length >= 8 },
  { label: 'Letras y números', cumple: (c: string) => /[a-zA-Z]/.test(c) && /\d/.test(c) },
  { label: 'Una mayúscula', cumple: (c: string) => /[A-Z]/.test(c) },
  { label: 'Un símbolo (!, #, @…)', cumple: (c: string) => /[^a-zA-Z0-9]/.test(c) },
];

// Pestaña "Seguridad": cambio de contraseña, dispositivos con la sesión abierta y baja de la cuenta
@Component({
  selector: 'app-seguridad-perfil',
  imports: [FaIconComponent, FormField, DrawerComponent],
  templateUrl: './seguridad-perfil.component.html',
  styleUrls: ['./perfil-secciones.css', './seguridad-perfil.component.css'],
})
export class SeguridadPerfilComponent {
  private session = inject(SessionService);
  private servicio = inject(PerfilService);
  private avisos = inject(AvisosService);

  readonly perfil = input.required<Perfil>();
  readonly cambio = output<Perfil | null>();

  readonly fechaConAnio = fechaConAnio;
  readonly faCheck = faCheck;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faKey = faKey;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faXmark = faXmark;

  private readonly usuarioId = this.session.usuarioId()!;

  // ---------- Contraseña ----------
  readonly modelo = signal({ ...VACIA });
  readonly formulario = form(this.modelo, (s) => {
    required(s.actual, { message: 'Escribe tu contraseña actual.' });
    required(s.nueva, { message: 'Escribe la nueva contraseña.' });
    validate(s.nueva, ({ value }) => (value() && !REGLAS[0].cumple(value()) ? { kind: 'corta', message: 'Debe tener al menos 8 caracteres.' } : value() && !REGLAS[1].cumple(value()) ? { kind: 'debil', message: 'Combina letras y números.' } : undefined));
    validate(s.repetir, ({ value, valueOf }) => (value() !== valueOf(s.nueva) ? { kind: 'distinta', message: 'Las contraseñas no coinciden.' } : undefined));
  });
  readonly mostrar = signal(false);
  readonly guardando = signal(false);

  readonly reglas = computed(() => REGLAS.map((r) => ({ label: r.label, ok: r.cumple(this.modelo().nueva) })));
  readonly fuerza = computed(() => {
    const n = this.reglas().filter((r) => r.ok).length;
    const clave = this.modelo().nueva;
    if (!clave) return { nivel: 0, label: '' };
    return n <= 1 ? { nivel: 1, label: 'Débil' } : n === 2 ? { nivel: 2, label: 'Aceptable' } : n === 3 ? { nivel: 3, label: 'Buena' } : { nivel: 4, label: 'Muy segura' };
  });

  cambiarClave(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        const m = this.modelo();
        this.cambio.emit(await firstValueFrom(this.servicio.cambiarClave(this.usuarioId, m.actual, m.nueva)));
        this.avisos.exito('Contraseña actualizada.');
        this.modelo.set({ ...VACIA });
        this.formulario().reset();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  // ---------- Dispositivos ----------
  icono(d: Dispositivo) {
    return d.tipo === 'movil' ? faMobileScreen : d.nombre.includes('macOS') ? faLaptop : faDesktop;
  }

  cuando(iso: string): string {
    return `${fechaLarga(iso.slice(0, 10))}, ${iso.slice(11, 16)}`;
  }

  readonly otros = computed(() => this.perfil().dispositivos.filter((d) => !d.actual).length);

  async cerrarDispositivo(d: Dispositivo): Promise<void> {
    try {
      this.cambio.emit(await firstValueFrom(this.servicio.cerrarDispositivo(this.usuarioId, d.id)));
      this.avisos.exito(`Cerraste la sesión en ${d.nombre}.`);
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  async cerrarOtros(): Promise<void> {
    if (!confirm('¿Cerrar la sesión en todos los demás dispositivos?')) return;
    try {
      this.cambio.emit(await firstValueFrom(this.servicio.cerrarOtrosDispositivos(this.usuarioId)));
      this.avisos.exito('Cerraste la sesión en los demás dispositivos.');
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  // ---------- Baja ----------
  readonly bajaAbierta = signal(false);
  readonly confirmacion = signal('');
  readonly puedeDarDeBaja = computed(() => this.confirmacion().trim().toLowerCase() === this.perfil().username);
  readonly dandoDeBaja = signal(false);

  abrirBaja(): void {
    this.confirmacion.set('');
    this.bajaAbierta.set(true);
  }

  async darDeBaja(): Promise<void> {
    if (!this.puedeDarDeBaja()) return;
    this.dandoDeBaja.set(true);
    try {
      await firstValueFrom(this.servicio.darDeBaja(this.usuarioId));
      this.avisos.exito('Tu cuenta fue dada de baja. ¡Gracias por haber sido parte!');
      this.session.cerrarSesion();
    } catch (error) {
      this.avisos.error(mensajeError(error));
      this.dandoDeBaja.set(false);
    }
  }
}
