import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, form, max, min, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCrosshairs, faDisplay, faLocationDot, faMapLocationDot, faPen, faPlus, faQrcode, faTrash } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { PuntoMarcacion, RADIO_POR_DEFECTO } from '../../../core/models/marcacion.model';
import { MarcacionService } from '../../../services/marcacion.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../academico/academico.ui';

const PUNTO_VACIO = { nombre: '', latitud: 0, longitud: 0, radioM: RADIO_POR_DEFECTO, activo: true };

@Component({
  selector: 'app-puntos-marcacion',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, RouterLink, PageHeaderComponent, DrawerComponent, EmptyStateComponent],
  templateUrl: './puntos-marcacion.component.html',
  styles: `
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
    .punto { display: flex; flex-direction: column; gap: 12px; }
    .punto.inactivo { opacity: 0.6; }
    .punto header { display: flex; align-items: center; gap: 12px; }
    .titulo { flex: 1; min-width: 0; }
    .titulo h3 { margin: 0; font-size: 16px; }
    .titulo small { color: var(--muted); font-size: 12px; }
    .datos { display: flex; gap: 8px; flex-wrap: wrap; }
    .acciones { display: flex; gap: 8px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--line); }
    .acciones .ui-btn { height: 34px; font-size: 13px; }
    .derecha { margin-left: auto; display: flex; gap: 6px; }
    .check { display: flex; align-items: center; gap: 10px; font-size: 14px; }
    .check input { width: 18px; height: 18px; accent-color: var(--dark-blue); }
  `,
})
export class PuntosMarcacionComponent {
  private marcacion = inject(MarcacionService);
  private avisos = inject(AvisosService);
  protected readonly session = inject(SessionService);
  private readonly espacioId = this.session.espacioActivo()!.id;

  readonly faPlus = faPlus;
  readonly faPen = faPen;
  readonly faTrash = faTrash;
  readonly faQrcode = faQrcode;
  readonly faDisplay = faDisplay;
  readonly faLocationDot = faLocationDot;
  readonly faCrosshairs = faCrosshairs;
  readonly faMapLocationDot = faMapLocationDot;

  readonly puntos = rxResource({ stream: () => this.marcacion.puntos(this.espacioId), defaultValue: [] });

  readonly drawerAbierto = signal(false);
  readonly editandoId = signal(0);
  readonly guardando = signal(false);
  readonly modelo = signal({ ...PUNTO_VACIO });
  readonly formulario = form(this.modelo, (s) => {
    required(s.nombre, { message: 'Escribe el nombre del punto.' });
    min(s.latitud, -90, { message: 'Latitud no válida.' });
    max(s.latitud, 90, { message: 'Latitud no válida.' });
    min(s.longitud, -180, { message: 'Longitud no válida.' });
    max(s.longitud, 180, { message: 'Longitud no válida.' });
    min(s.radioM, 10, { message: 'El radio mínimo es 10 m.' });
    max(s.radioM, 1000, { message: 'El radio máximo es 1000 m.' });
  });

  nuevo(): void {
    this.abrir(0, { ...PUNTO_VACIO });
  }

  editar(p: PuntoMarcacion): void {
    this.abrir(p.id, { nombre: p.nombre, latitud: p.latitud, longitud: p.longitud, radioM: p.radioM, activo: p.activo });
  }

  // Carga la ubicación actual del dispositivo (pensado para hacerlo parado en el punto)
  usarMiUbicacion(): void {
    if (!('geolocation' in navigator)) {
      this.avisos.error('Tu navegador no permite obtener la ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => this.modelo.update((m) => ({ ...m, latitud: +pos.coords.latitude.toFixed(6), longitud: +pos.coords.longitude.toFixed(6) })),
      () => this.avisos.error('No pudimos obtener tu ubicación. Revisa el permiso del navegador.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  guardar(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        await firstValueFrom(this.marcacion.guardarPunto({ ...this.modelo(), id: this.editandoId() || undefined, espacioId: this.espacioId }));
        this.avisos.exito(this.editandoId() ? 'Punto de marcación actualizado.' : 'Punto de marcación creado.');
        this.drawerAbierto.set(false);
        this.puntos.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  async eliminar(p: PuntoMarcacion): Promise<void> {
    if (!confirm(`¿Eliminar el punto "${p.nombre}"? Su pantalla de QR dejará de funcionar.`)) return;
    await firstValueFrom(this.marcacion.eliminarPunto(p.id));
    this.avisos.exito('Punto de marcación eliminado.');
    this.puntos.reload();
  }

  mapa(p: PuntoMarcacion): string {
    return `https://www.openstreetmap.org/?mlat=${p.latitud}&mlon=${p.longitud}#map=18/${p.latitud}/${p.longitud}`;
  }

  private abrir(id: number, valores: typeof PUNTO_VACIO): void {
    this.editandoId.set(id);
    this.modelo.set(valores);
    this.formulario().reset();
    this.drawerAbierto.set(true);
  }
}
