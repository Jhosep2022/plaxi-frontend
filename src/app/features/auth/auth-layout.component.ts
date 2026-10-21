import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChalkboardTeacher, faQrcode, faStar } from '@fortawesome/free-solid-svg-icons';

// Marco de las pantallas de acceso: panel de la marca a la izquierda y el formulario a la derecha
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, RouterLink, FaIconComponent],
  template: `
    <div class="marco">
      <aside class="marca">
        <svg class="fondo" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <circle cx="560" cy="80" r="190" class="c1" />
          <circle cx="40" cy="860" r="160" class="c2" />
          <circle cx="470" cy="760" r="46" class="c3" />
          <path d="M-20 520 Q 160 440 300 500 T 640 470" class="onda" />
        </svg>
        <a routerLink="/auth/login" class="logo"><img src="assets/Logo_icon.png" alt="" /> <span>QuizWiz</span></a>
        <div class="mensaje">
          <h2>Tu colegio y tu academia, en un solo lugar.</h2>
          <p>Clases, tareas, asistencia y notas conectadas para docentes, estudiantes y familias.</p>
          <ul>
            <li><span><fa-icon [icon]="faChalkboardTeacher" /></span> Aulas virtuales con contenido, quiz y tareas</li>
            <li><span><fa-icon [icon]="faQrcode" /></span> Asistencia por clase y marcación docente con QR</li>
            <li><span><fa-icon [icon]="faStar" /></span> Notas que se calculan solas con tu escala</li>
          </ul>
        </div>
        <small class="pie">© 2026 QuizWiz</small>
      </aside>
      <main class="contenido">
        <div class="caja"><router-outlet /></div>
      </main>
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--page-bg); }
    .marco { display: grid; grid-template-columns: minmax(360px, 44%) 1fr; min-height: 100vh; }
    .marca { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 32px; padding: 40px 48px; overflow: hidden; background: var(--dark-blue); color: var(--text-light); }
    .fondo { position: absolute; inset: 0; width: 100%; height: 100%; }
    .c1 { fill: var(--lime-green); opacity: 0.9; }
    .c2 { fill: var(--light-cream); opacity: 0.85; }
    .c3 { fill: var(--lime-green); opacity: 0.55; }
    .onda { fill: none; stroke: var(--lime-green); stroke-width: 2; opacity: 0.3; }
    .logo, .mensaje, .pie { position: relative; }
    .logo { display: inline-flex; align-items: center; gap: 10px; color: var(--text-light); font-size: 22px; font-weight: bold; text-decoration: none; }
    .logo img { height: 40px; display: block; filter: invert(1); }
    .mensaje { max-width: 420px; }
    .mensaje h2 { margin: 0 0 12px; font-size: 32px; line-height: 1.2; }
    .mensaje p { margin: 0 0 24px; opacity: 0.8; line-height: 1.5; }
    .mensaje ul { display: flex; flex-direction: column; gap: 14px; margin: 0; padding: 0; list-style: none; }
    .mensaje li { display: flex; align-items: center; gap: 12px; }
    .mensaje li span { width: 36px; height: 36px; display: grid; place-items: center; flex-shrink: 0; border-radius: 10px; background: rgba(188, 207, 78, 0.16); color: var(--lime-green); }
    .pie { opacity: 0.6; }
    .contenido { display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
    .caja { width: 100%; max-width: 460px; }
    @media (max-width: 900px) {
      .marco { grid-template-columns: 1fr; }
      .marca { padding: 20px 16px; min-height: 0; }
      .mensaje, .pie { display: none; }
      .contenido { align-items: flex-start; padding: 28px 16px; }
    }
  `,
})
export class AuthLayoutComponent {
  readonly faChalkboardTeacher = faChalkboardTeacher;
  readonly faQrcode = faQrcode;
  readonly faStar = faStar;
}
