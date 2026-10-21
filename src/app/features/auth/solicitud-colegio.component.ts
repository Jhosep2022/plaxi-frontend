import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, form, max, maxLength, min, pattern, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faCircleExclamation, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { CIUDADES } from '../../core/models/auth.model';
import { AuthService } from '../../services/auth.service';
import { PATRON_CELULAR, PATRON_CORREO } from '../../services/perfil.service';
import { mensajeError } from '../direccion/academico/academico.ui';

// "Soy un colegio": los colegios no se registran solos; dejan sus datos y el equipo de QuizWiz los da de alta
@Component({
  selector: 'app-solicitud-colegio',
  imports: [FormField, RouterLink, FaIconComponent],
  styleUrls: ['./auth.css'],
  template: `
    @if (enviada()) {
      <div class="exito">
        <span class="icono"><fa-icon [icon]="faPaperPlane" /></span>
        <h1>¡Gracias, {{ modelo().contacto.split(' ')[0] }}!</h1>
        <p>Recibimos la solicitud de <strong>{{ modelo().colegio }}</strong>. Te escribiremos a {{ modelo().correo }} en las próximas 24 horas para preparar tu institución.</p>
      </div>
      <a class="ui-btn ui-btn--secundario boton-ancho" routerLink="/auth/login"><fa-icon [icon]="faArrowLeft" /> Volver al inicio</a>
    } @else {
      <header class="encabezado">
        <h1>Lleva QuizWiz a tu colegio</h1>
        <p>Déjanos tus datos. Preparamos tu institución, creamos la cuenta de la dirección y te acompañamos en la puesta en marcha. Incluye 30 días de prueba.</p>
      </header>
      <form class="ui-form" (submit)="$event.preventDefault(); enviar()" novalidate>
        <div class="ui-campo">
          <label for="col-nombre">Nombre del colegio</label>
          <input id="col-nombre" class="ui-input" placeholder="Ej. Unidad Educativa San Martín" [formField]="formulario.colegio" />
          @if (formulario.colegio().touched() && formulario.colegio().invalid()) { <span class="ui-error">{{ formulario.colegio().errors()[0].message }}</span> }
        </div>
        <div class="ui-fila">
          <div class="ui-campo">
            <label for="col-ciudad">Ciudad</label>
            <select id="col-ciudad" class="ui-input" [formField]="formulario.ciudad">
              @for (c of ciudades; track c) { <option [value]="c">{{ c }}</option> }
            </select>
          </div>
          <div class="ui-campo">
            <label for="col-estudiantes">Estudiantes (aprox.)</label>
            <input id="col-estudiantes" type="number" class="ui-input" [formField]="formulario.estudiantes" />
            @if (formulario.estudiantes().touched() && formulario.estudiantes().invalid()) { <span class="ui-error">{{ formulario.estudiantes().errors()[0].message }}</span> }
          </div>
        </div>
        <div class="ui-fila">
          <div class="ui-campo">
            <label for="col-contacto">Tu nombre</label>
            <input id="col-contacto" class="ui-input" autocomplete="name" [formField]="formulario.contacto" />
            @if (formulario.contacto().touched() && formulario.contacto().invalid()) { <span class="ui-error">{{ formulario.contacto().errors()[0].message }}</span> }
          </div>
          <div class="ui-campo">
            <label for="col-cargo">Cargo</label>
            <input id="col-cargo" class="ui-input" placeholder="Ej. Director(a)" [formField]="formulario.cargo" />
          </div>
        </div>
        <div class="ui-fila">
          <div class="ui-campo">
            <label for="col-correo">Correo</label>
            <input id="col-correo" type="email" class="ui-input" autocomplete="email" [formField]="formulario.correo" />
            @if (formulario.correo().touched() && formulario.correo().invalid()) { <span class="ui-error">{{ formulario.correo().errors()[0].message }}</span> }
          </div>
          <div class="ui-campo">
            <label for="col-telefono">Celular</label>
            <input id="col-telefono" class="ui-input" inputmode="numeric" autocomplete="tel" [formField]="formulario.telefono" />
            @if (formulario.telefono().touched() && formulario.telefono().invalid()) { <span class="ui-error">{{ formulario.telefono().errors()[0].message }}</span> }
          </div>
        </div>
        <div class="ui-campo">
          <label for="col-mensaje">¿Qué te gustaría resolver? <span class="ui-ayuda">(opcional)</span></label>
          <textarea id="col-mensaje" class="ui-input" rows="3" placeholder="Ej. digitalizar la asistencia, el registro de notas…" [formField]="formulario.mensaje"></textarea>
        </div>
        @if (error()) { <p class="error-general" role="alert"><fa-icon [icon]="faCircleExclamation" /> {{ error() }}</p> }
        <button type="submit" class="ui-btn boton-ancho" [disabled]="enviando()">{{ enviando() ? 'Enviando…' : 'Enviar solicitud' }}</button>
      </form>
      <p class="alterno"><a class="enlace" routerLink="/auth/registro"><fa-icon [icon]="faArrowLeft" /> Volver al registro</a></p>
    }
  `,
  styles: `textarea.ui-input { resize: vertical; font: inherit; }`,
})
export class SolicitudColegioComponent {
  private auth = inject(AuthService);

  readonly faArrowLeft = faArrowLeft;
  readonly faCircleExclamation = faCircleExclamation;
  readonly faPaperPlane = faPaperPlane;
  readonly ciudades = CIUDADES;

  readonly modelo = signal({ colegio: '', ciudad: 'Cochabamba', contacto: '', cargo: '', correo: '', telefono: '', estudiantes: 100, mensaje: '' });
  readonly formulario = form(this.modelo, (s) => {
    required(s.colegio, { message: 'Escribe el nombre del colegio.' });
    maxLength(s.colegio, 100, { message: 'Máximo 100 caracteres.' });
    required(s.contacto, { message: 'Escribe tu nombre.' });
    required(s.correo, { message: 'Escribe tu correo.' });
    pattern(s.correo, PATRON_CORREO, { message: 'Escribe un correo válido.' });
    required(s.telefono, { message: 'Escribe un celular de contacto.' });
    pattern(s.telefono, PATRON_CELULAR, { message: '8 dígitos, empieza con 6 o 7.' });
    min(s.estudiantes, 1, { message: 'Indica cuántos estudiantes tiene.' });
    max(s.estudiantes, 20000, { message: 'Revisa la cantidad.' });
  });
  readonly enviando = signal(false);
  readonly enviada = signal(false);
  readonly error = signal('');

  enviar(): void {
    submit(this.formulario, async () => {
      this.enviando.set(true);
      this.error.set('');
      try {
        await firstValueFrom(this.auth.solicitarColegio({ ...this.modelo(), estudiantes: Number(this.modelo().estudiantes) }));
        this.enviada.set(true);
      } catch (e) {
        this.error.set(mensajeError(e));
      } finally {
        this.enviando.set(false);
      }
    });
  }
}
