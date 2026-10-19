import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChalkboardTeacher, faChevronRight, faSchool } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { ROL_LABEL, TIPO_ESPACIO_LABEL } from '../../core/models/espacio.model';

// Se muestra después del login cuando el usuario pertenece a varios espacios
@Component({
  selector: 'app-seleccionar-espacio',
  imports: [RouterLink, FaIconComponent],
  styleUrls: ['./estado-pagina.css'],
  styles: `
    .estado { max-width: 480px; width: 100%; }
    .lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; text-align: left; }
    .espacio { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid #ececf0;
      border-radius: 12px; color: var(--dark-blue); text-decoration: none; }
    .espacio:hover { border-color: var(--lime-green); background: #fafaf2; }
    .espacio-icono { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 10px;
      background: var(--dark-blue); color: var(--lime-green); font-size: 18px; }
    .espacio-texto { flex: 1; display: flex; flex-direction: column; }
    .espacio-texto small { color: #6b6b80; }
    .salir { margin-top: 20px; border: none; background: none; color: #6b6b80; cursor: pointer; text-decoration: underline; }
  `,
  template: `
    <div class="estado">
      <h1>¿Dónde quieres trabajar hoy?</h1>
      <p>Perteneces a varios espacios. Elige uno para continuar.</p>
      <ul class="lista">
        @for (membresia of session.membresias(); track membresia.espacio.id) {
          <li>
            <a class="espacio" [routerLink]="session.rutaInicio(membresia)">
              <span class="espacio-icono">
                <fa-icon [icon]="membresia.espacio.tipo === 'colegio' ? faSchool : faChalkboardTeacher" />
              </span>
              <span class="espacio-texto">
                <strong>{{ membresia.espacio.nombre }}</strong>
                <small>{{ tipoLabel[membresia.espacio.tipo] }} · {{ rolLabel[membresia.rol] }}</small>
              </span>
              <fa-icon [icon]="faChevronRight" />
            </a>
          </li>
        }
      </ul>
      <button type="button" class="salir" (click)="session.cerrarSesion()">Cerrar sesión</button>
    </div>
  `,
})
export class SeleccionarEspacioComponent {
  protected readonly session = inject(SessionService);
  readonly rolLabel = ROL_LABEL;
  readonly tipoLabel = TIPO_ESPACIO_LABEL;
  readonly faSchool = faSchool;
  readonly faChalkboardTeacher = faChalkboardTeacher;
  readonly faChevronRight = faChevronRight;
}
