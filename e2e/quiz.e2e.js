// Quiz: el docente crea, publica y ve resultados; el estudiante responde con corrección automática
const { abrirNavegador } = require('./lib');

module.exports = async function quiz({ verificar }) {
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 19, 9, 0, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const tarjetas = () => b.evaluar(`[...document.querySelectorAll('app-quiz-docente .quiz h3')].map(h => h.textContent.trim())`);
  const tarjeta = (titulo) => b.evaluar(`[...document.querySelectorAll('app-quiz-docente .quiz')].find(t => t.querySelector('h3').textContent.trim() === ${JSON.stringify(titulo)})?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  const escribirEn = (selector, valor) => b.evaluar(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  try {
    // ---------- Docente ----------
    await b.sesion('docente');
    await b.ir('/colegio-san-jose/docente/clases/9?tab=quiz', 4500);
    verificar('la pestaña Quiz lista los 3 quiz de Física 3ro A', (await tarjetas()).length === 3);
    verificar('MRU: cerrado, 31 respondieron, con precisión y completado', (await tarjeta('Quiz: MRU y MRUV')).includes('31 respondieron') && (await tarjeta('Quiz: MRU y MRUV')).includes('Cerrado') && /Completado \d+%/.test(await tarjeta('Quiz: MRU y MRUV')), await tarjeta('Quiz: MRU y MRUV'));
    verificar('el repaso está en borrador', (await tarjeta('Repaso: trabajo y energía')).includes('Borrador'));
    await b.evaluar(`[...document.querySelectorAll('app-quiz-docente .quiz')].find(t => t.textContent.includes('Repaso')).querySelector('.pie button.ui-btn:not(.ui-btn--icono)').click()`);
    await b.esperar(1200);
    verificar('publica el borrador', (await tarjeta('Repaso: trabajo y energía')).includes('Abierto'));

    // Resultados
    await b.evaluar(`[...document.querySelectorAll('app-quiz-docente .quiz')].find(t => t.textContent.includes('MRU')).querySelector('a[href*="resultados"]').click()`);
    await b.esperar(2500);
    verificar('resultados: acierto de las 5 preguntas', (await b.evaluar(`document.querySelectorAll('#lista-preguntas li').length`)) === 5);
    const luis = await b.evaluar(`[...document.querySelectorAll('#tabla-resultados tbody tr')].find(tr => tr.textContent.includes('Luis Mamani'))?.innerText.replace(/\\s+/g, ' ') ?? ''`);
    verificar('resultados: Luis sacó 4/5', luis.includes('4/5'), luis);

    // Nuevo quiz que cuenta para la nota
    await b.navegarEnApp('/colegio-san-jose/docente/clases/9/quiz/nuevo', 2500);
    await escribirEn('#quiz-titulo', 'Quiz: estados del agua');
    await b.clic('.cabecera button', 'Publicar');
    await b.esperar(800);
    verificar('no publica preguntas sin enunciado', (await b.texto('.error-general')).includes('no tiene enunciado'), await b.texto('.error-general'));
    await escribirEn('#q-enunciado-0', '¿A qué temperatura hierve el agua al nivel del mar?');
    await escribirEn('#q-0-op-0', '50 °C');
    await escribirEn('#q-0-op-1', '100 °C');
    await escribirEn('#q-0-op-2', '150 °C');
    await b.evaluar(`document.querySelectorAll('.pregunta')[0].querySelectorAll('.marcar')[1].click()`);
    await b.clic('.agregar-pregunta button', 'Verdadero o falso');
    await b.esperar(200);
    await escribirEn('#q-enunciado-1', 'El hielo es agua en estado gaseoso.');
    await b.evaluar(`document.querySelector('#q-1-f').click()`);
    await b.clic('.agregar-pregunta button', 'Respuesta corta');
    await b.esperar(200);
    await escribirEn('#q-enunciado-2', '¿Cómo se llama el paso de líquido a gas?');
    await escribirEn('#q-2-aceptadas', 'evaporación, ebullición');
    await escribirEn('#quiz-cierre', '2026-10-30');
    await b.elegir('#quiz-criterio', '3');
    verificar('el editor suma preguntas y puntos', (await b.texto('.cabecera p')).includes('3 preguntas · 3 puntos'));
    await b.clic('.cabecera button', 'Publicar');
    await b.esperar(2500);
    verificar('publica el quiz y vuelve al aula', (await cuerpo()).includes('Quiz publicado') && (await tarjetas()).includes('Quiz: estados del agua'));
    verificar('marca que cuenta para la nota', (await tarjeta('Quiz: estados del agua')).includes('Cuenta para nota'));
    await b.navegarEnApp('/colegio-san-jose/docente/calificaciones?clase=9', 3000);
    verificar('el quiz aparece como actividad en la planilla', (await b.evaluar(`[...document.querySelectorAll('.tabla th.actividad .nombre-act')].map(t => t.textContent.trim())`)).includes('Quiz: estados del agua'));

    // ---------- Estudiante ----------
    await b.sesion('estudiante');
    await b.ir('/colegio-san-jose/estudiante/aulas/9', 4500);
    await b.clic('.pestanas button', 'Quiz');
    await b.esperar(500);
    const filas = await b.evaluar(`[...document.querySelectorAll('.quiz .texto strong')].map(s => s.textContent.trim())`);
    verificar('el estudiante ve solo los quiz publicados (2)', filas.length === 2 && !filas.includes('Repaso: trabajo y energía'), filas.join(' | '));
    verificar('MRU cerrado con su mejor puntaje', (await cuerpo()).includes('Mejor: 4/5'));

    await b.evaluar(`[...document.querySelectorAll('a.quiz')].find(a => a.textContent.includes('Newton')).click()`);
    await b.esperar(2500);
    verificar('pantalla de inicio con preguntas, tiempo e intentos', (await b.texto('.inicio .datos')).includes('4') && (await b.texto('.inicio .datos')).includes('10 min') && (await b.texto('.inicio .datos')).includes('0 de 1'));
    await b.clic('.inicio button', 'Comenzar');
    await b.esperar(500);
    verificar('el cronómetro arranca en 10:00', (await b.texto('.reloj')).includes('10:00') || (await b.texto('.reloj')).includes('9:5'));
    await b.clic('.opcion', 'Verdadero');
    await b.clic('.navegacion button', 'Siguiente');
    await b.clic('.opcion', 'F = m·a');
    await b.clic('.navegacion button', 'Siguiente');
    await b.clic('.opcion', 'Igual y opuesta');
    await b.clic('.navegacion button', 'Siguiente');
    await escribirEn('#respuesta-corta', 'Newton');
    verificar('cuenta las preguntas respondidas', (await b.texto('.navegacion .ui-ayuda')) === '4 de 4 respondidas');
    await b.clic('.navegacion button', 'Enviar');
    await b.esperar(1500);
    verificar('corrige automáticamente: 100%', (await b.texto('.puntaje')).includes('100%') && (await b.texto('.puntaje')).includes('5 de 5'), await b.texto('.puntaje'));
    verificar('muestra la revisión de respuestas', (await b.evaluar(`document.querySelectorAll('.revision li.bien').length`)) === 4);
    verificar('con un solo intento ya no ofrece reintentar', !(await cuerpo()).includes('Intentar de nuevo'));

    // Respuesta incorrecta y revisión (Matemáticas, segundo intento de Luis)
    await b.navegarEnApp('/colegio-san-jose/estudiante/aulas/8/quiz/4', 2500);
    verificar('ofrece el segundo intento', (await b.texto('.inicio button')).includes('Intentar de nuevo'));
    await b.clic('.inicio button', 'Intentar de nuevo');
    await b.esperar(400);
    await b.clic('.opcion', '3');
    await b.clic('.navegacion button', 'Siguiente');
    await b.clic('.navegacion button', 'Siguiente');
    await b.clic('.navegacion button', 'Siguiente');
    await b.clic('.navegacion button', 'Siguiente');
    await b.clic('.navegacion button', 'Enviar');
    await b.esperar(1500);
    verificar('pide confirmación si faltan preguntas', (b.dialogos.at(-1) ?? '').includes('faltan 4 preguntas'), b.dialogos.at(-1));
    verificar('muestra la respuesta correcta de lo que falló', (await b.texto('.revision li.mal')).includes('Correcta: 2'), await b.texto('.revision li.mal'));
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
