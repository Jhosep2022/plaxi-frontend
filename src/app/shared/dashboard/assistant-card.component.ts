import { Component, input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faGlobe, faMicrophone, faPaperPlane, faPlus } from '@fortawesome/free-solid-svg-icons';

// Asistente IA (por ahora solo la interfaz; la integración llega más adelante)
@Component({
  selector: 'app-assistant-card',
  imports: [FaIconComponent],
  styles: `
    :host {
      position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 16px;
      min-height: 250px; padding: 18px; overflow: hidden; box-sizing: border-box;
      background: var(--text-light); border: 1px solid var(--line); border-radius: 16px;
    }
    .orbe {
      position: absolute; top: 40px; left: 50%; width: 150px; height: 150px; transform: translateX(-50%);
      border-radius: 50%; filter: blur(30px); opacity: 0.9;
      background: radial-gradient(circle at 40% 40%, var(--lime-green), var(--light-cream) 60%, transparent 75%);
    }
    header { position: relative; display: flex; align-items: center; justify-content: space-between; }
    h3 { margin: 0; font-size: 16px; color: var(--dark-blue); }
    .insignia { padding: 4px 10px; border-radius: 20px; background: var(--light-cream); color: var(--cream-strong); font-size: 11px; font-weight: bold; }
    .caja { position: relative; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--text-light); }
    textarea {
      width: 100%; border: none; outline: none; resize: none; font: inherit; font-size: 14px;
      color: var(--dark-blue); background: none; box-sizing: border-box;
    }
    .barra { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; color: var(--muted); font-size: 12px; }
    .barra span { display: flex; align-items: center; gap: 12px; }
    button { border: none; background: none; color: var(--muted); cursor: pointer; padding: 4px; }
    .enviar { width: 30px; height: 30px; border-radius: 8px; background: var(--dark-blue); color: var(--lime-green); }
  `,
  template: `
    <div class="orbe"></div>
    <header>
      <h3>Asistente IA</h3>
      <span class="insignia">QuizWiz IA</span>
    </header>
    <div class="caja">
      <textarea rows="2" [value]="sugerencia()" (input)="texto.set($any($event.target).value)" aria-label="Pregunta al asistente"></textarea>
      <div class="barra">
        <span>
          <button type="button" aria-label="Adjuntar"><fa-icon [icon]="faPlus" /></button>
          <span><fa-icon [icon]="faGlobe" /> Buscar</span>
        </span>
        <span>
          <button type="button" aria-label="Dictar"><fa-icon [icon]="faMicrophone" /></button>
          <button type="button" class="enviar" aria-label="Enviar" title="Próximamente"><fa-icon [icon]="faPaperPlane" /></button>
        </span>
      </div>
    </div>
  `,
})
export class AssistantCardComponent {
  readonly sugerencia = input('');
  readonly texto = signal('');

  readonly faPlus = faPlus;
  readonly faGlobe = faGlobe;
  readonly faMicrophone = faMicrophone;
  readonly faPaperPlane = faPaperPlane;
}
