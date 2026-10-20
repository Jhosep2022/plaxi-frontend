import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCirclePlay, faVideo } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { MINUTOS_ANTES } from '../../core/models/sesiones.model';
import { aHora, aMinutos } from '../../core/utils/jornada';
import { SesionVista, SesionesService } from '../../services/sesiones.service';
import { AvisosService } from '../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { mensajeError } from '../direccion/academico/academico.ui';
import { TarjetaSesionComponent } from './tarjeta-sesion.component';

type Pestana = 'proximas' | 'pasadas';

// Sesiones en vivo del estudiante: unirse (registra su asistencia), sesiones pasadas y grabaciones
@Component({
  selector: 'app-sesiones-estudiante',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, EmptyStateComponent, TarjetaSesionComponent],
  styleUrls: ['./sesiones.css'],
  template: `
    <app-page-header miga="Sesiones" titulo="Sesiones en vivo" [descripcion]="'Las clases en vivo de tus cursos. Puedes entrar ' + minutosAntes + ' minutos antes; al unirte desde aquí queda registrada tu asistencia.'" />
    <div class="barra">
      <div class="ui-tabs" role="tablist">
        <button type="button" class="ui-tab" [class.activa]="pestana() === 'proximas'" (click)="pestana.set('proximas')">Próximas <span class="contador">{{ proximas().length }}</span></button>
        <button type="button" class="ui-tab" [class.activa]="pestana() === 'pasadas'" (click)="pestana.set('pasadas')">Pasadas <span class="contador">{{ pasadas().length }}</span></button>
      </div>
    </div>
    @if (sesiones.isLoading() && !sesiones.value().length) {
      <p class="cargando">Cargando sesiones…</p>
    } @else {
      <div class="lista">
        @for (s of (pestana() === 'proximas' ? proximas() : pasadas()); track s.id) {
          <app-tarjeta-sesion [sesion]="s">
            @if (s.estado === 'en-curso') {
              <button type="button" class="ui-btn" [disabled]="uniendo() === s.id" (click)="unirse(s)"><fa-icon [icon]="faCirclePlay" /> {{ s.asisti ? 'Volver a entrar' : 'Unirme' }}</button>
            } @else if (s.estado === 'proxima') {
              <span class="ui-ayuda">Abre a las {{ apertura(s) }}</span>
            }
          </app-tarjeta-sesion>
        } @empty {
          <div class="ui-card"><app-empty-state [icono]="faVideo" [titulo]="pestana() === 'proximas' ? 'No hay sesiones programadas' : 'Todavía no hubo sesiones'" texto="Cuando tu docente programe una clase en vivo aparecerá aquí." /></div>
        }
      </div>
    }
  `,
})
export class SesionesEstudianteComponent {
  private session = inject(SessionService);
  private servicio = inject(SesionesService);
  private avisos = inject(AvisosService);

  readonly minutosAntes = MINUTOS_ANTES;
  readonly faCirclePlay = faCirclePlay;
  readonly faVideo = faVideo;

  private readonly estudianteId = this.session.usuarioId()!;
  readonly sesiones = rxResource({ stream: () => this.servicio.sesionesEstudiante(this.session.espacioActivo()!.id, this.estudianteId), defaultValue: [] });
  readonly pestana = signal<Pestana>('proximas');
  readonly proximas = computed(() => this.sesiones.value().filter((s) => s.estado !== 'finalizada').sort((a, b) => `${a.fecha}${a.inicio}`.localeCompare(`${b.fecha}${b.inicio}`)));
  readonly pasadas = computed(() => this.sesiones.value().filter((s) => s.estado === 'finalizada').sort((a, b) => `${b.fecha}${b.inicio}`.localeCompare(`${a.fecha}${a.inicio}`)));
  readonly uniendo = signal(0);

  apertura(s: SesionVista): string {
    return aHora(Math.max(0, aMinutos(s.inicio) - MINUTOS_ANTES));
  }

  async unirse(s: SesionVista): Promise<void> {
    this.uniendo.set(s.id);
    try {
      const enlace = await firstValueFrom(this.servicio.unirse(s.id, this.estudianteId));
      window.open(enlace, '_blank', 'noopener');
      if (!s.asisti) this.avisos.exito('¡Te uniste! Tu asistencia quedó registrada.');
      this.sesiones.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.uniendo.set(0);
    }
  }
}
