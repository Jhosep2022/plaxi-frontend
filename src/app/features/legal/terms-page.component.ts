import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalHeaderComponent } from './legal-header.component';
import { TERMS_DATE_LABEL } from './legal-version';

// Terms of use (T07). The master text, its version and what is pending are in the cerebro:
// "Productos/Aulix/Términos de uso y privacidad". If the text changes, raise the version.
@Component({
  selector: 'app-terms-page',
  imports: [RouterLink, LegalHeaderComponent],
  styleUrls: ['./legal-page.css'],
  template: `
    <main class="legal">
      <app-legal-header current="terminos" />
      <h1>Términos de uso de Aulix</h1>
      <p class="version">Versión del {{ date }}</p>

      <h2>1. Qué es Aulix</h2>
      <p>Aulix es una plataforma para colegios y academias de Bolivia: notas, asistencia, aulas virtuales, comunicados, pagos y cursos en línea. La ofrece <strong>Alclick</strong>, con sede en Cochabamba, Bolivia.</p>

      <h2>2. Quién puede usarla</h2>
      <ul>
        <li><strong>Colegios:</strong> la dirección crea las cuentas de su personal, estudiantes y padres. El uso del colegio se rige además por el contrato que firma con Alclick.</li>
        <li><strong>Academias:</strong> un docente crea su academia y sus cursos; sus estudiantes se inscriben con un código o enlace.</li>
        <li><strong>Menores de edad:</strong> usan Aulix con la cuenta que les da su colegio o academia. Su padre, madre o tutor es responsable de su uso y acepta el tratamiento de sus datos al activar su propia cuenta.</li>
      </ul>

      <h2>3. Tu cuenta</h2>
      <ul>
        <li>Tu usuario y contraseña son personales. No los compartas.</li>
        <li>Si crees que alguien entró a tu cuenta, cambia tu contraseña y cierra las sesiones de otros dispositivos desde <strong>Mi perfil → Seguridad</strong>.</li>
        <li>Puedes dar de baja tu cuenta desde tu perfil. Las notas y registros que el colegio necesita conservar siguen siendo del colegio.</li>
      </ul>

      <h2>4. Uso permitido</h2>
      <p>Usa Aulix solo para enseñar, aprender y comunicarte con tu colegio o academia. No está permitido:</p>
      <ul>
        <li>Publicar contenido ilegal, ofensivo, discriminatorio o que acose a otra persona.</li>
        <li>Subir datos o fotos de otras personas sin su permiso.</li>
        <li>Hacerte pasar por otra persona o usar la cuenta de otro.</li>
        <li>Intentar entrar a lo que no te corresponde, probar fallas de seguridad o sobrecargar el servicio.</li>
        <li>Copiar el contenido de cursos ajenos para publicarlo en otro lugar.</li>
      </ul>
      <p>Alclick puede suspender una cuenta que incumpla estas reglas y avisará al colegio o academia.</p>

      <h2>5. Tu contenido</h2>
      <p>Lo que subes (tareas, materiales, cursos, comentarios) sigue siendo tuyo o de tu colegio o academia. Nos das permiso para guardarlo y mostrarlo <strong>solo dentro de tu espacio</strong> y a quienes tu colegio o academia autoriza. Debes tener derecho a usar lo que publicas.</p>

      <h2>6. Planes y pagos</h2>
      <ul>
        <li>Las academias tienen un plan gratis hasta 10 estudiantes activos y 1 GB, sin vencimiento. Para crecer, pasan a un plan pagado.</li>
        <li>Los colegios pagan según su contrato. Si un pago vence, el espacio puede pasar a <strong>solo lectura</strong>: se pueden ver y descargar los datos, pero no agregar nuevos.</li>
      </ul>

      <h2>7. Disponibilidad</h2>
      <p>Trabajamos para que Aulix funcione siempre y hacemos respaldos de los datos, pero puede haber cortes. Los mantenimientos planificados se avisan con 48 horas de anticipación.</p>

      <h2>8. Responsabilidad</h2>
      <p>Aulix es una herramienta: las notas, la asistencia y las decisiones académicas son responsabilidad del colegio, la academia y sus docentes. Alclick responde por el funcionamiento del servicio según su contrato con cada colegio.</p>

      <h2>9. Cambios</h2>
      <p>Si cambiamos estos términos, publicaremos una versión nueva con su fecha y te pediremos aceptarla la próxima vez que entres.</p>

      <h2>10. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes del Estado Plurinacional de Bolivia.</p>

      <h2>11. Contacto</h2>
      <p>Puedes escribirnos por los canales de contacto de alclick.dev o pedir ayuda a la dirección de tu colegio. Cómo tratamos tus datos está en la <a routerLink="/privacidad">política de privacidad</a>.</p>
    </main>
  `,
})
export class TermsPageComponent {
  readonly date = TERMS_DATE_LABEL;
}
