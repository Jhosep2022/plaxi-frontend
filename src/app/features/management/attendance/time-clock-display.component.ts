import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { timer, map, tap } from 'rxjs';
import { TimeTrackingService } from '../../../services/time-tracking.service';
import { QrComponent } from '../../../shared/ui/qr.component';

@Component({
  selector: 'app-time-clock-display',
  imports: [QrComponent],
  styleUrls: ['./time-clock-display.component.css'],
  template: `
    <main class="pantalla">
      @if (display.hasValue() && display.value(); as data) {
        <header>
          <img src="assets/aulix-icon-light.svg" alt="Aulix" class="logo" />
          <div>
            <h1>{{ data.punto.nombre }}</h1>
            <p>{{ data.espacio }} · Marcación del personal</p>
          </div>
          <span class="reloj">{{ time() }}</span>
        </header>
        <section class="centro">
          <div class="qr-marco">
            @if (remaining() > 0 && !display.error()) {
              <app-qr
                [texto]="data.contenido"
                etiqueta="Código QR de marcación"
              />
            } @else {
              <p>Actualizando código…</p>
            }
          </div>
          <div class="lateral">
            <h2>Escanea para marcar</h2>
            <ol>
              <li>Abre Aulix en tu celular → <strong>Marcación</strong>.</li>
              <li>Permite tu ubicación.</li>
              <li>Escanea este código o escribe el número.</li>
            </ol>
            @if (remaining() > 0 && !display.error()) {
              <p class="codigo">
                {{ data.codigo.slice(0, 3) }} {{ data.codigo.slice(3) }}
              </p>
            }
            <div class="cuenta">
              <div class="barra">
                <span [style.width.%]="(remaining() / 30) * 100"></span>
              </div>
              <small>Cambia en {{ remaining() }} s</small>
            </div>
          </div>
        </section>
      } @else if (display.isLoading()) {
        <p role="status">Cargando pantalla de marcación…</p>
      }
      @if (display.error()) {
        <p class="error" role="alert">
          No pudimos actualizar esta pantalla. Comprueba la conexión o pide a
          dirección un enlace vigente.
        </p>
        <button type="button" (click)="display.reload()">Reintentar</button>
      }
    </main>
  `,
})
export class TimeClockDisplayComponent {
  private readonly tracking = inject(TimeTrackingService);
  readonly espacio = input.required<string>();
  readonly token = input.required<string>();
  private readonly receivedAt = signal(Date.now());
  private readonly now = toSignal(timer(0, 1000).pipe(map(() => Date.now())), {
    initialValue: Date.now(),
  });
  readonly display = rxResource({
    params: () => ({ slug: this.espacio(), token: this.token() }),
    stream: ({ params }) =>
      this.tracking
        .getDisplay(params.slug, params.token)
        .pipe(tap(() => this.receivedAt.set(Date.now()))),
  });
  readonly remaining = computed(() =>
    Math.max(
      0,
      (this.display.hasValue() ? this.display.value()!.segundosRestantes : 0) -
        Math.floor((this.now() - this.receivedAt()) / 1000),
    ),
  );
  readonly time = computed(() =>
    new Date(this.now()).toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  );
  constructor() {
    const interval = setInterval(() => {
      if (
        this.display.hasValue() &&
        this.remaining() <= 0 &&
        !this.display.isLoading() &&
        !this.display.error()
      )
        this.display.reload();
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(interval));
  }
}
