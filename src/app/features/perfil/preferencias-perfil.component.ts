import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBell, faEnvelope, faGlobe, faMobileScreen } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import type { Membresia } from '../../core/models/espacio.model';
import { NOTIFICACIONES } from '../../core/models/perfil.model';
import type { CanalNotificacion, Perfil, PreferenciasNotificacion, TipoNotificacion } from '../../core/models/perfil.model';
import { PerfilService } from '../../services/perfil.service';
import { AvisosService } from '../../shared/ui/avisos.service';
import { mensajeError } from '../direccion/academico/academico.ui';

// Pestaña "Preferencias": qué avisos recibir y por qué canal, idioma y región
@Component({
  selector: 'app-preferencias-perfil',
  imports: [FaIconComponent],
  templateUrl: './preferencias-perfil.component.html',
  styleUrls: ['./perfil-secciones.css', './preferencias-perfil.component.css'],
})
export class PreferenciasPerfilComponent {
  private session = inject(SessionService);
  private servicio = inject(PerfilService);
  private avisos = inject(AvisosService);

  readonly perfil = input.required<Perfil>();
  readonly membresia = input.required<Membresia>();
  readonly cambio = output<Perfil | null>();

  readonly faBell = faBell;
  readonly faEnvelope = faEnvelope;
  readonly faGlobe = faGlobe;
  readonly faMobileScreen = faMobileScreen;

  // Solo los avisos que aplican al rol y al tipo de espacio actual
  readonly tipos = computed(() => {
    const { rol, espacio } = this.membresia();
    return NOTIFICACIONES.filter((n) => (!n.roles || n.roles.includes(rol)) && (!n.tipo || n.tipo === espacio.tipo));
  });

  readonly notificaciones = linkedSignal<PreferenciasNotificacion>(() => structuredClone(this.perfil().notificaciones));
  readonly sinGuardar = computed(() => JSON.stringify(this.notificaciones()) !== JSON.stringify(this.perfil().notificaciones));
  readonly guardando = signal(false);

  alternar(tipo: TipoNotificacion, canal: CanalNotificacion): void {
    this.notificaciones.update((n) => ({ ...n, [tipo]: { ...n[tipo], [canal]: !n[tipo][canal] } }));
  }

  // Activa o desactiva un canal para todos los avisos visibles
  todos(canal: CanalNotificacion, valor: boolean): void {
    this.notificaciones.update((n) => {
      const copia = structuredClone(n);
      for (const t of this.tipos()) copia[t.id][canal] = valor;
      return copia;
    });
  }

  todosActivos(canal: CanalNotificacion): boolean {
    return this.tipos().every((t) => this.notificaciones()[t.id][canal]);
  }

  descartar(): void {
    this.notificaciones.set(structuredClone(this.perfil().notificaciones));
  }

  async guardar(): Promise<void> {
    this.guardando.set(true);
    try {
      this.cambio.emit(await firstValueFrom(this.servicio.guardarNotificaciones(this.session.usuarioId()!, this.notificaciones())));
      this.avisos.exito('Preferencias de avisos guardadas.');
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }
}
