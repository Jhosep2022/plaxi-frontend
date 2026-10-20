import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronRight, faCircleQuestion, faListCheck, faUsers } from '@fortawesome/free-solid-svg-icons';
import { hoyIso, sumarDias } from '../../core/utils/asistencia';
import { AulaResumen } from '../../services/aulas.service';
import { AnilloComponent } from './anillo.component';
import { PortadaAulaComponent } from './portada-aula.component';

// "Hace 2 h", "Ayer", "Hace 5 días"
function haceCuanto(iso: string): string {
  const fecha = iso.slice(0, 10);
  if (fecha === hoyIso()) {
    const horas = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 3600000));
    return horas < 1 ? 'Hace un momento' : `Hace ${horas} h`;
  }
  if (fecha === sumarDias(hoyIso(), -1)) return 'Ayer';
  const dias = Math.round((Date.parse(`${hoyIso()}T12:00:00`) - Date.parse(`${fecha}T12:00:00`)) / 86400000);
  return `Hace ${dias} días`;
}

// Tarjeta de un aula virtual: portada, estudiantes, dos anillos de progreso, etiquetas y contenido
@Component({
  selector: 'app-tarjeta-aula',
  imports: [FaIconComponent, RouterLink, PortadaAulaComponent, AnilloComponent],
  styles: `
    :host { display: block; }
    .tarjeta {
      display: flex; flex-direction: column; gap: 14px; height: 100%; box-sizing: border-box; padding: 12px;
      border: 1px solid var(--line); border-radius: 18px; background: var(--text-light); color: var(--dark-blue);
      text-decoration: none; transition: box-shadow 0.15s, transform 0.15s;
    }
    .tarjeta:hover { box-shadow: 0 12px 28px rgba(10, 10, 35, 0.08); transform: translateY(-2px); }
    .insignia {
      position: absolute; top: 10px; left: 10px; display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px;
      border-radius: 8px; background: rgba(10, 10, 35, 0.75); color: var(--text-light); font-size: 12px; font-weight: bold;
    }
    .pendiente {
      position: absolute; top: 10px; right: 10px; padding: 4px 9px; border-radius: 8px;
      background: var(--lime-green); color: var(--dark-blue); font-size: 12px; font-weight: bold;
    }
    .cuerpo { display: flex; flex-direction: column; gap: 14px; padding: 0 6px; flex: 1; }
    h3 { margin: 0; font-size: 17px; line-height: 1.3; }
    .sub { margin: 4px 0 0; font-size: 13px; color: var(--muted); }
    .anillos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .anillos app-anillo + app-anillo { padding-left: 12px; border-left: 1px solid var(--line); }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { padding: 5px 10px; border-radius: 8px; background: var(--page-bg); font-size: 12px; color: var(--muted); }
    .pie { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 4px; font-size: 12px; color: var(--muted); }
    .pie strong { color: var(--dark-blue); }
    .pie fa-icon { margin-right: 3px; }
    .ir { margin-left: auto; width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 50%; color: var(--dark-blue); }
  `,
  template: `
    <a class="tarjeta" [routerLink]="link()">
      <app-portada-aula [imagen]="aula().portada" [icono]="aula().icono" [tono]="aula().tono">
        <span class="insignia"><fa-icon [icon]="faUsers" /> {{ aula().estudiantes }} {{ aula().estudiantes === 1 ? 'estudiante' : 'estudiantes' }}</span>
        @if (aula().pendientes) {
          <span class="pendiente">{{ aula().pendientes }} {{ textoPendientes() }}</span>
        }
      </app-portada-aula>
      <div class="cuerpo">
        <div>
          <h3>{{ aula().nombre }}</h3>
          @if (subtitulo()) { <p class="sub">{{ subtitulo() }}</p> }
        </div>
        <div class="anillos">
          <app-anillo [etiqueta]="aula().anillos[0].label" [valor]="aula().anillos[0].valor" [umbral]="0" />
          <app-anillo [etiqueta]="aula().anillos[1].label" [valor]="aula().anillos[1].valor" />
        </div>
        <div class="chips">
          @for (c of aula().chips; track c) { <span class="chip">{{ c }}</span> }
        </div>
        <div class="pie">
          <span>{{ actualizado() }}</span> ·
          <span><strong>{{ aula().temas }}</strong> {{ aula().temas === 1 ? 'tema' : 'temas' }}</span> ·
          <span><fa-icon [icon]="faListCheck" /><strong>{{ aula().tareas }}</strong> {{ aula().tareas === 1 ? 'tarea' : 'tareas' }}</span>
          @if (aula().quiz) { · <span><fa-icon [icon]="faCircleQuestion" /><strong>{{ aula().quiz }}</strong> quiz</span> }
          <span class="ir"><fa-icon [icon]="faChevronRight" /></span>
        </div>
      </div>
    </a>
  `,
})
export class TarjetaAulaComponent {
  readonly aula = input.required<AulaResumen>();
  readonly link = input.required<(string | number)[]>();
  readonly subtitulo = input('');
  readonly textoPendientes = input('pendientes');

  readonly faChevronRight = faChevronRight;
  readonly faCircleQuestion = faCircleQuestion;
  readonly faListCheck = faListCheck;
  readonly faUsers = faUsers;

  readonly actualizado = computed(() => haceCuanto(this.aula().actualizado));
}
