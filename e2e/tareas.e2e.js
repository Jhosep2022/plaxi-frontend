// Tareas: el docente asigna y revisa (con nota en la planilla), el estudiante entrega y el padre hace seguimiento
const { abrirNavegador } = require('./lib');

module.exports = async function tareas({ verificar }) {
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 19, 9, 0, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const tarjetas = () => b.evaluar(`[...document.querySelectorAll('.tarea .titulo strong')].map(t => t.textContent.trim())`);
  const tarjeta = (titulo) => b.evaluar(`[...document.querySelectorAll('.tarea')].find(t => t.querySelector('.titulo strong').textContent.includes(${JSON.stringify(titulo)}))?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  const fila = (nombre) => `[...document.querySelectorAll('#tabla-entregas tbody tr')].find(tr => tr.textContent.includes(${JSON.stringify(nombre)}))`;
  try {
    // ---------- Estudiante ----------
    await b.sesion('estudiante');
    await b.ir('/colegio-san-jose/estudiante/tareas', 3500);
    verificar('Luis tiene 2 tareas por entregar', (await tarjetas()).join('|') === 'Ejercicios de funciones lineales|Ensayo: mi lugar favorito de Bolivia', (await tarjetas()).join('|'));
    verificar('avisa cuándo vence cada una', (await tarjeta('funciones lineales')).includes('Vence en 2 días') && (await tarjeta('Ensayo')).includes('Vence en 4 días'));
    await b.clic('.ui-tab', 'Revisadas');
    await b.esperar(200);
    verificar('la tarea de inglés está revisada con el comentario del docente', (await tarjeta('Vocabulary')).includes('Good job, Luis!'));
    await b.clic('.ui-tab', 'Entregadas');
    await b.esperar(200);
    verificar('la de Física figura entregada', (await tarjeta('MRUV')).includes('Entregaste el'));

    await b.clic('.ui-tab', 'Por entregar');
    await b.esperar(200);
    await b.evaluar(`[...document.querySelectorAll('.tarea')].find(t => t.textContent.includes('funciones lineales')).querySelector('.acciones button').click()`);
    await b.esperar(300);
    verificar('sin texto ni archivo no deja entregar', await b.evaluar(`[...document.querySelectorAll('app-drawer footer button')].at(-1).disabled`));
    await b.escribir('#ent-texto', 'Adjunto las 6 gráficas con pendiente y ordenada.');
    await b.evaluar(`(() => { const dt = new DataTransfer(); dt.items.add(new File(['x'], 'funciones-luis.pdf', { type: 'application/pdf' }));
      const i = document.querySelector('#ent-archivo'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await b.evaluar(`[...document.querySelectorAll('app-drawer footer button')].at(-1).click()`);
    await b.esperar(1500);
    verificar('entrega la tarea', (await cuerpo()).includes('¡Listo! Entregaste') && (await tarjeta('funciones lineales')).includes('funciones-luis.pdf'));
    verificar('queda 1 por entregar', (await b.texto('.ui-tab:first-child .contador')) === '1');

    // ---------- Docente ----------
    await b.sesion('docente');
    await b.ir('/colegio-san-jose/docente/tareas', 3500);
    verificar('el docente ve sus tareas activas (2)', (await tarjetas()).length === 2, (await tarjetas()).join('|'));
    verificar('avisa las entregas por revisar', /Tienes \d+ entregas por revisar/.test(await cuerpo()));
    await b.clic('.ui-tab', 'Todas');
    await b.esperar(200);
    verificar('en "Todas" aparecen las 4 tareas de María', (await tarjetas()).length === 4);
    verificar('la de Física cuenta para la nota (Hacer)', (await tarjeta('MRUV')).includes('Cuenta para nota · Hacer'));

    // Revisar Física 3ro A: la nota va a la Práctica 3 de la planilla
    await b.evaluar(`[...document.querySelectorAll('.tarea')].find(t => t.textContent.includes('MRUV')).querySelector('.cabecera').click()`);
    await b.esperar(2500);
    verificar('el detalle muestra las entregas del curso (32)', (await b.evaluar(`document.querySelectorAll('#tabla-entregas tbody tr').length`)) === 32);
    verificar('Luis entregó a tiempo con su archivo', (await b.evaluar(`${fila('Luis Mamani')}.innerText`)).includes('Entregada'));
    await b.evaluar(`(() => { const i = ${fila('Luis Mamani')}.querySelector('input.nota'); i.value = '150'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await b.esperar(200);
    verificar('no acepta una nota fuera de rango', (await b.texto('.pie .ui-ayuda')).includes('fuera de rango'));
    await b.evaluar(`(() => { const i = ${fila('Luis Mamani')}.querySelector('input.nota'); i.value = '88'; i.dispatchEvent(new Event('input', { bubbles: true }));
      const c = ${fila('Luis Mamani')}.querySelector('input.comentario'); c.value = 'Muy bien, cuida el problema 7.'; c.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await b.esperar(200);
    verificar('cuenta la revisión pendiente de guardar', (await b.texto('.pie button')) === 'Guardar 1 revisión');
    await b.clic('.pie button', 'Guardar');
    await b.esperar(2000);
    verificar('guarda la revisión y la nota en la planilla', (await cuerpo()).includes('notas guardadas en la planilla') && (await b.evaluar(`${fila('Luis Mamani')}.innerText`)).includes('Revisada'));
    await b.navegarEnApp('/colegio-san-jose/docente/calificaciones?clase=9', 3000);
    const practica3 = await b.evaluar(`(() => { const i = [...document.querySelectorAll('.tabla th.actividad .nombre-act')].findIndex(t => t.textContent.trim() === 'Práctica 3');
      const tr = [...document.querySelectorAll('.tabla tbody tr')].find(t => t.textContent.includes('Luis Mamani')); return tr.querySelectorAll('td.celda')[i].querySelector('input').value; })()`);
    verificar('la nota aparece en la Práctica 3 de la planilla', practica3 === '88', practica3);

    // Nueva tarea que cuenta para la nota
    await b.navegarEnApp('/colegio-san-jose/docente/tareas', 2500);
    await b.clic('app-page-header button', 'Nueva tarea');
    await b.esperar(300);
    await b.elegir('#tar-clase', '9');
    await b.escribir('#tar-titulo', 'Resumen: leyes de Newton');
    await b.escribir('#tar-fecha', '2026-10-26');
    await b.elegir('#tar-criterio', '3');
    await b.clic('app-drawer footer button', 'Asignar tarea');
    await b.esperar(2000);
    verificar('crea la tarea y la agrega a la planilla', (await cuerpo()).includes('agregada a la planilla de notas') && (await tarjeta('leyes de Newton')).includes('Cuenta para nota · Hacer'));
    verificar('el curso empieza con 0 entregas', (await tarjeta('leyes de Newton')).includes('0 de 32 entregaron'));

    // ---------- Padre ----------
    await b.sesion('padre');
    await b.ir('/colegio-san-jose/padre/tareas', 3500);
    verificar('el padre ve las tareas de Luis sin poder entregarlas', (await b.texto('app-page-header h1')) === 'Tareas de Luis Mamani' && !(await b.evaluar(`!!document.querySelector('.tarea .acciones')`)));
    await b.clic('app-selector-hijo .ui-tab', 'Sofía Mamani');
    await b.esperar(2500);
    verificar('Sofía tiene una tarea vencida sin entregar', (await b.texto('app-page-header h1')) === 'Tareas de Sofía Mamani' && (await cuerpo()).includes('1 tarea venció sin entregar'));
    await b.navegarEnApp('/colegio-san-jose/padre/hijos', 3500);
    verificar('Mis hijos alerta la tarea no entregada de Sofía', (await b.texto('.hijo:nth-child(2) .alertas')).includes('No entregó la tarea "Fracciones'));
    await b.captura('tareas-padre-hijos.png');

    // ---------- Academia: tareas de práctica (sin planilla, se revisan con un comentario) ----------
    await b.sesion('estudiante');
    await b.ir('/academia-maria/estudiante/tareas', 3500);
    verificar('academia: Luis tiene el mini proyecto de Angular por entregar', (await tarjetas()).join('|') === 'Mini proyecto: lista de tareas con componentes', (await tarjetas()).join('|'));
    await b.clic('.ui-tab', 'Revisadas');
    await b.esperar(200);
    verificar('academia: el wireframe está revisado con el comentario de la docente', (await tarjeta('Wireframe')).includes('Buen flujo de pantallas'));
    await b.navegarEnApp('/academia-maria/estudiante/aulas/1001', 3000);
    await b.clic('[role=tab]', 'Tareas');
    await b.esperar(300);
    verificar('academia: el aula del curso muestra su tarea', (await cuerpo()).includes('Mini proyecto: lista de tareas'));

    await b.sesion('docente');
    await b.ir('/academia-maria/docente/tareas', 3500);
    await b.clic('.ui-tab', 'Todas');
    await b.esperar(200);
    verificar('academia: la docente ve las tareas de sus cursos', (await tarjetas()).length === 2 && !(await tarjeta('Mini proyecto')).includes('Cuenta para nota'), (await tarjetas()).join('|'));
    await b.evaluar(`[...document.querySelectorAll('.tarea')].find(t => t.textContent.includes('Mini proyecto')).querySelector('.cabecera').click()`);
    await b.esperar(2500);
    verificar('academia: el detalle lista a los inscritos del curso', (await b.evaluar(`document.querySelectorAll('#tabla-entregas tbody tr').length`)) === 2 && (await b.evaluar(`${fila('Carla Gutiérrez')}.innerText`)).includes('Entregada'));
    await b.evaluar(`(() => { const f = ${fila('Carla Gutiérrez')}; f.querySelector('input[type=checkbox]').click();
      const c = f.querySelector('input.comentario'); c.value = 'Muy buena separación en componentes.'; c.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await b.esperar(200);
    await b.clic('.pie button', 'Guardar');
    await b.esperar(2000);
    verificar('academia: guarda la revisión con el comentario', (await b.evaluar(`${fila('Carla Gutiérrez')}.innerText`)).includes('Revisada'));

    await b.navegarEnApp('/academia-maria/docente/tareas', 2500);
    await b.clic('app-page-header button', 'Nueva tarea');
    await b.esperar(300);
    await b.elegir('#tar-clase', '1003');
    await b.esperar(200);
    verificar('academia: no pregunta por la planilla de notas', !(await b.evaluar(`!!document.querySelector('#tar-criterio')`)));
    await b.escribir('#tar-titulo', 'Prototipo navegable en Figma');
    await b.escribir('#tar-fecha', '2026-10-30');
    await b.clic('app-drawer footer button', 'Asignar tarea');
    await b.esperar(2000);
    verificar('academia: crea la tarea para los inscritos del curso', (await cuerpo()).includes('Tarea asignada') && (await tarjeta('Prototipo navegable')).includes('0 de 1 entregaron'), await tarjeta('Prototipo navegable'));
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
