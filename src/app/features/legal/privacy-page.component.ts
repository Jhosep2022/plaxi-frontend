import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalHeaderComponent } from './legal-header.component';
import { TERMS_DATE_LABEL } from './legal-version';

// Privacy policy (T07). The master text, its version and what is pending are in the cerebro:
// "Productos/Aulix/Términos de uso y privacidad". If the text changes, raise the version.
@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink, LegalHeaderComponent],
  styleUrls: ['./legal-page.css'],
  template: `
    <main class="legal">
      <app-legal-header current="privacidad" />
      <h1>Política de privacidad de Aulix</h1>
      <p class="version">Versión del {{ date }}</p>

      <h2>1. Quién cuida tus datos</h2>
      <ul>
        <li>En un <strong>colegio</strong>, los datos son del colegio. Alclick los guarda y procesa por encargo del colegio, solo para prestar el servicio.</li>
        <li>En una <strong>academia</strong>, los datos los comparten el docente dueño de la academia y Alclick, con el mismo fin.</li>
      </ul>

      <h2>2. Qué datos guardamos</h2>
      <ul>
        <li><strong>Cuenta:</strong> nombre y apellidos, usuario, correo y celular (si los das), carnet de identidad y fecha de nacimiento (para activar cuentas y evitar duplicados).</li>
        <li><strong>Datos académicos:</strong> cursos, notas, asistencia, tareas y entregas, comunicados.</li>
        <li><strong>Docentes:</strong> marcación de entrada y salida. La ubicación se toma <strong>solo en el momento de marcar</strong>, nunca en segundo plano.</li>
        <li><strong>Pagos del colegio o academia:</strong> montos, fechas y comprobantes. No guardamos datos de tarjetas.</li>
        <li><strong>Seguridad:</strong> dispositivos y navegadores donde iniciaste sesión, dirección IP, fecha del último acceso e intentos fallidos de inicio de sesión.</li>
      </ul>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Para que Aulix funcione: mostrar a cada persona lo que le corresponde.</li>
        <li>Para avisarte de tareas, notas, comunicados y pagos, según tus preferencias.</li>
        <li>Para proteger las cuentas y atender pedidos de soporte.</li>
      </ul>
      <p><strong>No vendemos tus datos, no los usamos para publicidad y no los compartimos con terceros</strong> fuera de lo que dice el punto 6.</p>

      <h2>4. Menores de edad</h2>
      <ul>
        <li>El colegio registra a sus estudiantes. El padre, madre o tutor acepta el uso de los datos de su hijo al activar su cuenta.</li>
        <li>Los estudiantes no suben fotos: usan un avatar.</li>
        <li>Un padre solo ve a los hijos vinculados a su cuenta.</li>
      </ul>

      <h2>5. Quién ve qué</h2>
      <ul>
        <li>Cada persona ve solo lo suyo: el estudiante, sus materias y notas; el padre, a sus hijos; el docente, sus paralelos o cursos; la dirección, su colegio.</li>
        <li>Los datos de cada colegio están separados en la base de datos: un colegio no puede ver los de otro.</li>
        <li>El equipo de Alclick entra a los datos solo para soporte o cuando el colegio lo pide.</li>
      </ul>

      <h2>6. Dónde se guardan</h2>
      <p>Usamos proveedores que guardan los datos por nosotros y no pueden usarlos para otra cosa: <strong>DigitalOcean</strong> (servidores y base de datos), <strong>Cloudflare</strong> (página web, protección y archivos) y un servicio de envío de correos. Sus servidores pueden estar fuera de Bolivia.</p>

      <h2>7. Cómo los protegemos</h2>
      <p>Conexión cifrada (HTTPS), contraseñas guardadas de forma que nadie puede leerlas, separación de datos por colegio, límite de intentos para entrar y respaldos.</p>

      <h2>8. Cuánto tiempo</h2>
      <ul>
        <li>Mientras tu cuenta o el contrato de tu colegio estén activos.</li>
        <li>Si un colegio deja Aulix: su espacio pasa a solo lectura, tiene 30 días para descargar todo y el día 90 se borran sus datos. Alclick entrega una constancia del borrado.</li>
        <li>Si das de baja tu cuenta, se desactiva y se cierran tus sesiones. Los registros académicos que el colegio debe conservar quedan con el colegio.</li>
      </ul>

      <h2>9. Tus derechos</h2>
      <p>Puedes ver y corregir tus datos desde <strong>Mi perfil</strong>, y pedir una copia o que se eliminen. Si estás en un colegio, pídelo a la dirección; si no, escríbenos. La Constitución Política del Estado protege tu intimidad y tu derecho a conocer, corregir y eliminar tus datos (artículos 21 y 130).</p>

      <h2>10. Cookies</h2>
      <p>Usamos una sola cookie, necesaria para mantener tu sesión abierta, y el almacenamiento del navegador para recordar tus preferencias. <strong>No usamos cookies de publicidad ni de seguimiento.</strong></p>

      <h2>11. Cambios</h2>
      <p>Si cambiamos esta política, publicaremos una versión nueva con su fecha y te pediremos aceptarla la próxima vez que entres.</p>

      <h2>12. Contacto</h2>
      <p>Puedes escribirnos por los canales de contacto de alclick.dev o pedir ayuda a la dirección de tu colegio. Las reglas de uso están en los <a routerLink="/terminos">términos de uso</a>.</p>
    </main>
  `,
})
export class PrivacyPageComponent {
  readonly date = TERMS_DATE_LABEL;
}
