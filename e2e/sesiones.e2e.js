// Academia: sesiones en vivo (asistencia automática), asistencia, calificaciones de los quiz e Inicio con datos reales
const { abrirNavegador } = require('./lib');

module.exports = async function sesiones({ verificar }) {
  // Lunes 19 de octubre a las 18:05: la sesión "Preguntas y respuestas" (18:00–19:00) está en vivo
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 19, 18, 5, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const titulos = () => b.evaluar(`[...document.querySelectorAll('app-tarjeta-sesion .texto > strong')].map(s => s.textContent.trim())`);
  const tarjeta = (titulo) => `[...document.querySelectorAll('app-tarjeta-sesion')].find(t => t.querySelector('.texto > strong').textContent.trim() === ${JSON.stringify(titulo)})`;
  const escribirEn = (selector, valor) => b.evaluar(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  try {
    // ---------- Estudiante: se une a la sesión en vivo ----------
    await b.sesion('estudiante');
    await b.ir('/academia-maria/estudiante/sesiones', 4000);
    await b.evaluar(`window.__abiertos = []; window.open = (url) => { window.__abiertos.push(url); return null; }; true`);
    verificar('el estudiante ve sus 4 próximas sesiones', (await titulos()).length === 4);
    verificar('la de hoy está en vivo y se puede entrar', (await b.evaluar(`${tarjeta('Preguntas y respuestas')}.innerText`)).includes('En vivo ahora'));
    verificar('las demás muestran cuándo abren', (await b.evaluar(`${tarjeta('Servicios e inyección de dependencias')}.innerText`)).includes('Abre a las 09:50'));
    await b.evaluar(`${tarjeta('Preguntas y respuestas')}.querySelector('button').click()`);
    await b.esperar(1200);
    verificar('al unirse abre la reunión y registra la asistencia', (await b.evaluar('window.__abiertos[0] ?? ""')).includes('meet.google.com') && (await cuerpo()).includes('Tu asistencia quedó registrada'));
    await b.clic('.ui-tab', 'Pasadas');
    await b.esperar(200);
    verificar('en las pasadas ve a cuáles asistió y las grabaciones', (await b.evaluar(`${tarjeta('Componentes y comunicación')}.innerText`)).includes('No asististe') && (await b.evaluar(`${tarjeta('Componentes y comunicación')}.innerText`)).includes('Ver grabación'));

    await b.navegarEnApp('/academia-maria/estudiante/asistencia', 2500);
    verificar('Mi asistencia: porcentaje de sesiones asistidas', /\d+%/.test(await b.texto('.indicador strong')) && (await cuerpo()).includes('sesiones asistidas'));

    await b.navegarEnApp('/academia-maria/estudiante/calificaciones', 2500);
    verificar('Mis calificaciones: notas de los quiz por curso', (await cuerpo()).includes('Quiz: fundamentos de Angular') && (await cuerpo()).includes('75%'));

    await b.navegarEnApp('/academia-maria/estudiante/inicio', 4000);
    verificar('Inicio del estudiante: próximas sesiones reales', (await cuerpo()).includes('Servicios e inyección de dependencias') && (await cuerpo()).includes('Quiz: componentes'));

    // ---------- Docente: sesiones ----------
    await b.sesion('docente');
    await b.ir('/academia-maria/docente/sesiones', 4000);
    verificar('el docente ve 5 próximas sesiones', (await titulos()).length === 5);
    verificar('la sesión en vivo ofrece Iniciar', (await b.evaluar(`${tarjeta('Preguntas y respuestas')}.innerText`)).includes('Iniciar'));
    await b.clic('app-page-header button', 'Programar sesión');
    await b.esperar(300);
    await b.elegir('#ses-curso', '1003');
    await escribirEn('#ses-titulo', 'Revisión de portafolios');
    await escribirEn('#ses-fecha', '2026-10-29');
    await escribirEn('#ses-enlace', 'zoom');
    await b.evaluar(`[...document.querySelectorAll('app-drawer footer button')].find(x => x.textContent.includes('Programar')).click()`);
    await b.esperar(800);
    verificar('pide un enlace válido', (await cuerpo()).includes('Pega el enlace de la reunión'));
    await escribirEn('#ses-enlace', 'https://zoom.us/j/11122233344');
    await b.evaluar(`[...document.querySelectorAll('app-drawer footer button')].find(x => x.textContent.includes('Programar')).click()`);
    await b.esperar(1500);
    verificar('programa la sesión', (await cuerpo()).includes('Sesión programada') && (await titulos()).includes('Revisión de portafolios'));

    await b.clic('.ui-tab', 'Pasadas');
    await b.esperar(200);
    await b.evaluar(`[...${tarjeta('Componentes y comunicación')}.querySelectorAll('button')].find(x => x.textContent.includes('Asistencia')).click()`);
    await b.esperar(800);
    verificar('la asistencia muestra quién entró', (await b.texto('.asistentes')).includes('Carla Gutiérrez') && (await b.evaluar(`[...document.querySelectorAll('.asistentes input')].filter(i => i.checked).length`)) === 1);
    await b.evaluar(`[...document.querySelectorAll('.asistentes li')].find(li => li.textContent.includes('Luis')).querySelector('input').click()`);
    await b.esperar(800);
    await b.evaluar(`[...document.querySelectorAll('app-drawer')].find(d => d.textContent.includes('Asistencia')).querySelector('.cerrar').click()`);
    await b.esperar(300);
    verificar('el docente corrige la asistencia a mano', (await b.evaluar(`${tarjeta('Componentes y comunicación')}.innerText`)).includes('2 de 2 asistieron'));
    await b.evaluar(`[...${tarjeta('Principios de diseño visual')}.querySelectorAll('button')].find(x => x.textContent.includes('grabación')).click()`);
    await b.esperar(300);
    await escribirEn('#ses-grabacion', 'https://drive.google.com/file/d/uiux-1');
    await b.evaluar(`[...document.querySelectorAll('app-drawer')].find(d => d.textContent.includes('Grabación')).querySelector('footer .ui-btn:not(.ui-btn--secundario)').click()`);
    await b.esperar(1200);
    verificar('agrega la grabación', (await b.evaluar(`${tarjeta('Principios de diseño visual')}.innerText`)).includes('Ver grabación'));

    await b.navegarEnApp('/academia-maria/docente/asistencia', 2500);
    verificar('Asistencia: tabla de sesiones por curso', (await b.evaluar(`document.querySelectorAll('app-asistencia-academia-docente table').length`)) >= 1 && (await cuerpo()).includes('Angular desde cero'));

    await b.navegarEnApp('/academia-maria/docente/calificaciones', 2500);
    verificar('Calificaciones: notas de los quiz del curso', (await b.texto('#tabla-notas-academia')).includes('Carla Gutiérrez') && (await b.texto('#tabla-notas-academia')).includes('100%'));

    await b.navegarEnApp('/academia-maria/docente/inicio', 4000);
    verificar('Inicio del docente: sesiones y solicitudes reales', (await cuerpo()).includes('Preguntas y respuestas') && (await cuerpo()).includes('quiere unirse'));
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
