import { Component, computed, inject, input, resource } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { toString as qrSvg } from 'qrcode';

// Dibuja un código QR como SVG (con el azul de la paleta)
@Component({
  selector: 'app-qr',
  styles: `
    :host { display: block; line-height: 0; }
    :host ::ng-deep svg { width: 100%; height: auto; }
  `,
  template: `<div [innerHTML]="svg()" role="img" [attr.aria-label]="etiqueta()"></div>`,
})
export class QrComponent {
  private sanitizer = inject(DomSanitizer);

  readonly texto = input.required<string>();
  readonly etiqueta = input('Código QR');

  private readonly dibujo = resource({
    params: () => this.texto(),
    loader: ({ params }) =>
      qrSvg(params, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0a0a23', light: '#ffffff' } }),
  });

  // El SVG lo genera la librería localmente a partir de un texto propio: es seguro insertarlo
  readonly svg = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.dibujo.value() ?? ''));
}
