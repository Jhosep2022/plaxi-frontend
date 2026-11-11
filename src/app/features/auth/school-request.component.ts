import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, form, max, maxLength, min, pattern, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faCircleExclamation, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { CITIES, SCHOOL_POSITIONS } from '../../core/models/auth.model';
import { AuthApiService } from '../../core/api/auth-api.service';
import { readApiError } from '../../core/api/api-error';
import { PATRON_CELULAR, PATRON_CORREO } from '../../services/account-profile.service';
import { SELECT } from '../../shared/ui/select.component';

// Schools submit their details for the Aulix team to set up their accounts.
@Component({
  selector: 'app-school-request',
  imports: [FormField, RouterLink, FaIconComponent, ...SELECT],
  styleUrls: ['./auth.css'],
  template: `
    @if (isSubmitted()) {
      <div class="exito">
        <span class="icono"><fa-icon [icon]="faPaperPlane" /></span>
        <h1>¡Gracias, {{ requestDetails().contact.split(' ')[0] }}!</h1>
        <p>Recibimos la solicitud de <strong>{{ requestDetails().school }}</strong>. Te escribiremos a {{ requestDetails().email }} en las próximas 24 horas para preparar tu institución.</p>
      </div>
      <a class="ui-btn ui-btn--secundario boton-ancho" routerLink="/auth/login"><fa-icon [icon]="faArrowLeft" /> Volver al inicio</a>
    } @else {
      <header class="encabezado">
        <h1>Lleva Aulix a tu colegio</h1>
        <p>Déjanos tus datos. Te contactaremos para conocer tu colegio, mostrarte la demo y preparar una propuesta.</p>
      </header>
      <form class="ui-form" (submit)="$event.preventDefault(); submitSchoolRequest()" novalidate>
        <div class="ui-campo">
          <label for="col-nombre">Nombre del colegio</label>
          <input id="col-nombre" class="ui-input" placeholder="Ej. Unidad Educativa San Martín" [formField]="requestForm.school" />
          @if (requestForm.school().touched() && requestForm.school().invalid()) { <span class="ui-error">{{ requestForm.school().errors()[0].message }}</span> }
        </div>
        <div class="ui-fila">
          <div class="ui-campo">
            <label for="col-ciudad">Ciudad</label>
            <app-select inputId="col-ciudad" [options]="cities" placeholder="Elige la ciudad" searchPlaceholder="Buscar ciudad…" [formField]="requestForm.city" />
            @if (requestForm.city().touched() && requestForm.city().invalid()) { <span class="ui-error">{{ requestForm.city().errors()[0].message }}</span> }
          </div>
          <div class="ui-campo">
            <label for="col-estudiantes">Estudiantes (aprox.)</label>
            <input id="col-estudiantes" type="number" class="ui-input" [formField]="requestForm.students" />
            @if (requestForm.students().touched() && requestForm.students().invalid()) { <span class="ui-error">{{ requestForm.students().errors()[0].message }}</span> }
          </div>
        </div>
        <div class="ui-fila">
          <div class="ui-campo">
            <label for="col-contacto">Tu nombre</label>
            <input id="col-contacto" class="ui-input" autocomplete="name" [formField]="requestForm.contact" />
            @if (requestForm.contact().touched() && requestForm.contact().invalid()) { <span class="ui-error">{{ requestForm.contact().errors()[0].message }}</span> }
          </div>
          <div class="ui-campo">
            <label for="col-cargo">Cargo</label>
            <app-select inputId="col-cargo" [options]="positions" placeholder="Elige tu cargo" searchPlaceholder="Buscar o escribir tu cargo…" [allowCustom]="true" [formField]="requestForm.position" />
            @if (requestForm.position().touched() && requestForm.position().invalid()) { <span class="ui-error">{{ requestForm.position().errors()[0].message }}</span> }
          </div>
        </div>
        <div class="ui-fila">
          <div class="ui-campo">
            <label for="col-correo">Correo</label>
            <input id="col-correo" type="email" class="ui-input" autocomplete="email" [formField]="requestForm.email" />
            @if (requestForm.email().touched() && requestForm.email().invalid()) { <span class="ui-error">{{ requestForm.email().errors()[0].message }}</span> }
          </div>
          <div class="ui-campo">
            <label for="col-telefono">Celular</label>
            <input id="col-telefono" class="ui-input" inputmode="numeric" autocomplete="tel" [formField]="requestForm.phone" />
            @if (requestForm.phone().touched() && requestForm.phone().invalid()) { <span class="ui-error">{{ requestForm.phone().errors()[0].message }}</span> }
          </div>
        </div>
        <div class="ui-campo">
          <label for="col-mensaje">¿Qué te gustaría resolver? <span class="ui-ayuda">(opcional)</span></label>
          <textarea id="col-mensaje" class="ui-input" rows="3" placeholder="Ej. digitalizar la asistencia, el registro de notas…" [formField]="requestForm.message"></textarea>
        </div>
        @if (error()) { <p class="error-general" role="alert"><fa-icon [icon]="faCircleExclamation" /> {{ error() }}</p> }
        <button type="submit" class="ui-btn boton-ancho" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Enviando…' : 'Enviar solicitud' }}</button>
      </form>
      <p class="alterno"><a class="enlace" routerLink="/auth/registro"><fa-icon [icon]="faArrowLeft" /> Volver al registro</a></p>
    }
  `,
  styles: `textarea.ui-input { resize: vertical; font: inherit; }`,
})
export class SchoolRequestComponent {
  private auth = inject(AuthApiService);

  readonly faArrowLeft = faArrowLeft;
  readonly faCircleExclamation = faCircleExclamation;
  readonly faPaperPlane = faPaperPlane;
  readonly cities = CITIES;
  readonly positions = SCHOOL_POSITIONS;

  readonly requestDetails = signal({ school: '', city: 'Cochabamba', contact: '', position: '', email: '', phone: '', students: 100, message: '' });
  readonly requestForm = form(this.requestDetails, (fields) => {
    required(fields.school, { message: 'Escribe el nombre del colegio.' });
    maxLength(fields.school, 100, { message: 'Máximo 100 caracteres.' });
    required(fields.city, { message: 'Elige la ciudad.' });
    required(fields.contact, { message: 'Escribe tu nombre.' });
    required(fields.position, { message: 'Elige tu cargo.' });
    required(fields.email, { message: 'Escribe tu correo.' });
    pattern(fields.email, PATRON_CORREO, { message: 'Escribe un correo válido.' });
    required(fields.phone, { message: 'Escribe un celular de contacto.' });
    pattern(fields.phone, PATRON_CELULAR, { message: '8 dígitos, empieza con 6 o 7.' });
    min(fields.students, 1, { message: 'Indica cuántos estudiantes tiene.' });
    max(fields.students, 20000, { message: 'Revisa la cantidad.' });
  });
  readonly isSubmitting = signal(false);
  readonly isSubmitted = signal(false);
  readonly error = signal('');

  submitSchoolRequest(): void {
    submit(this.requestForm, async () => {
      this.isSubmitting.set(true);
      this.error.set('');
      try {
        const { school, city, contact, position, email, phone, students, message } = this.requestDetails();
        await firstValueFrom(this.auth.requestSchool({
          colegio: school, ciudad: city, contacto: contact, cargo: position, correo: email,
          telefono: phone, estudiantes: Number(students), mensaje: message,
        }));
        this.isSubmitted.set(true);
      } catch (e) {
        this.error.set(readApiError(e).message);
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }
}
