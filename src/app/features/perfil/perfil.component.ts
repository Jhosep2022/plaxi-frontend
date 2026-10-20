import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faCamera, faTrash } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { ROL_LABEL } from '../../core/models/espacio.model';
import { FOTO_MAX_KB, Perfil } from '../../core/models/perfil.model';
import { mesAnio } from '../../core/utils/asistencia';
import { PerfilService } from '../../services/perfil.service';
import { AvisosService } from '../../shared/ui/avisos.service';
import { mensajeError } from '../direccion/academico/academico.ui';
import { DatosPerfilComponent } from './datos-perfil.component';
import { EspaciosPerfilComponent } from './espacios-perfil.component';
import { PreferenciasPerfilComponent } from './preferencias-perfil.component';
import { SeguridadPerfilComponent } from './seguridad-perfil.component';

export type PestanaPerfil = 'datos' | 'espacios' | 'seguridad' | 'preferencias';

// "Mi perfil": cabecera con foto e indicadores del rol, y pestañas de datos, espacios, seguridad y preferencias
@Component({
  selector: 'app-perfil',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, DatosPerfilComponent, EspaciosPerfilComponent, SeguridadPerfilComponent, PreferenciasPerfilComponent],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css'],
})
export class PerfilComponent {
  private session = inject(SessionService);
  private servicio = inject(PerfilService);
  private avisos = inject(AvisosService);

  readonly faCamera = faCamera;
  readonly faTrash = faTrash;
  readonly faCalendarDays = faCalendarDays;
  readonly mesAnio = mesAnio;
  readonly FOTO_MAX_KB = FOTO_MAX_KB;

  readonly tab = input<PestanaPerfil>('datos'); // de la ruta (data)
  readonly membresia = this.session.membresiaActiva()!;
  readonly rolLabel = ROL_LABEL[this.membresia.rol];
  private readonly usuarioId = this.session.usuarioId()!;

  readonly datos = rxResource({ stream: () => this.servicio.perfil(this.usuarioId) });
  // Copia local que se actualiza al guardar cualquier sección sin volver a cargar la página
  readonly perfil = linkedSignal<Perfil | null>(() => this.datos.value() ?? null);
  readonly indicadores = rxResource({ stream: () => this.servicio.indicadores(this.membresia, this.usuarioId), defaultValue: [] });

  readonly nombreCompleto = computed(() => {
    const p = this.perfil();
    return p ? [p.nombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ') : '';
  });
  readonly iniciales = computed(() => {
    const p = this.perfil();
    return p ? `${p.nombre.charAt(0)}${p.primerApellido.charAt(0)}`.toUpperCase() : '';
  });

  readonly pestanas: { id: PestanaPerfil; label: string; link: (string | number)[] }[] = [
    { id: 'datos', label: 'Datos personales', link: this.session.ruta('perfil') },
    { id: 'espacios', label: 'Mis espacios', link: this.session.ruta('perfil', 'espacios') },
    { id: 'seguridad', label: 'Seguridad', link: this.session.ruta('perfil', 'seguridad') },
    { id: 'preferencias', label: 'Preferencias', link: this.session.ruta('perfil', 'preferencias') },
  ];

  actualizado(perfil: Perfil | null): void {
    this.perfil.set(perfil);
  }

  // ---------- Foto ----------
  elegirFoto(event: Event): void {
    const entrada = event.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) return this.avisos.error('La foto debe ser una imagen.');
    if (archivo.size > FOTO_MAX_KB * 1024) return this.avisos.error(`La foto debe pesar menos de ${FOTO_MAX_KB} KB.`);
    const lector = new FileReader();
    lector.onload = () => this.guardarFoto(String(lector.result), 'Foto de perfil actualizada.');
    lector.readAsDataURL(archivo);
  }

  async guardarFoto(foto: string, mensaje: string): Promise<void> {
    try {
      this.perfil.set(await firstValueFrom(this.servicio.cambiarFoto(this.usuarioId, foto)));
      this.avisos.exito(mensaje);
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }
}
