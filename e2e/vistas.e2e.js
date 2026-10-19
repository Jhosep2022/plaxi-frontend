// Vistas por docente/aula, "Mi horario" y horario real en los resúmenes (simulando lunes 08:30)
const { abrirNavegador } = require('./lib');

const LUNES_0830 = new Date(2026, 9, 19, 8, 30, 0);

module.exports = async function vistas({ verificar }) {
  const b = await abrirNavegador({ fecha: LUNES_0830 });
  const tab = (nombre) => b.evaluar(`[...document.querySelectorAll('.ui-tab')].find(x => x.textContent.trim() === '${nombre}').click()`);
  const eventos = () => b.evaluar(`[...document.querySelectorAll('app-schedule-timeline .evento strong')].map(e => e.textContent.trim())`);
  try {
    // Dirección: vistas por docente y por aula
    await b.sesion('direccion');
    await b.ir('/colegio-san-jose/direccion/academico/horarios');
    await tab('Por docente');
    await b.esperar(400);
    verificar('por docente elige primero a quien tiene más clases', (await b.texto('.lectura .paralelo.elegido .nombre-lista span')) === 'María Fernández');
    verificar('María tiene 8 clases en la grilla', (await b.evaluar(`document.querySelectorAll('app-horario-semanal .clase').length`)) === 8);
    verificar('la columna de hoy (lunes) está resaltada', (await b.texto('app-horario-semanal th.hoy')).includes('Lunes'));
    await b.evaluar(`[...document.querySelectorAll('app-horario-semanal button.clase')].find(x => x.textContent.includes('3ro B')).click()`);
    await b.esperar(500);
    verificar('tocar una clase abre el horario de su paralelo', (await b.texto('.semana .cabecera h2')) === '3ro B');
    await tab('Por aula');
    await b.esperar(400);
    await b.evaluar(`[...document.querySelectorAll('.lectura .paralelo')].find(x => x.textContent.includes('Laboratorio de física')).click()`);
    await b.esperar(400);
    verificar('el laboratorio de física tiene 2 clases', (await b.evaluar(`document.querySelectorAll('app-horario-semanal .clase').length`)) === 2);

    // Mi horario
    await b.sesion('docente');
    await b.ir('/colegio-san-jose/docente/horario');
    verificar('Mi horario del docente: 8 clases', (await b.evaluar(`document.querySelectorAll('app-horario-semanal .clase').length`)) === 8);
    await b.sesion('padre');
    await b.ir('/colegio-san-jose/padre/horario');
    verificar('el padre ve el horario de su hijo', (await b.texto('app-page-header h1')) === 'Horario de Luis');

    // Resúmenes con el horario real
    await b.sesion('docente');
    await b.ir('/colegio-san-jose/docente/inicio');
    const clasesLunes = ['Matemáticas · 3ro A', 'Matemáticas · 3ro B', 'Física · 3ro A'];
    verificar('resumen docente: clases del lunes', JSON.stringify(await eventos()) === JSON.stringify(clasesLunes), JSON.stringify(await eventos()));
    verificar('resumen docente: marcador de la hora actual', (await b.texto('app-schedule-timeline .hora.ahora')) === '08:30');
    const proximas = await b.evaluar(`[...document.querySelectorAll('app-upcoming-list .texto strong')].map(e => e.textContent.trim())`);
    verificar('resumen docente: próximas clases reales', JSON.stringify(proximas) === JSON.stringify(clasesLunes), JSON.stringify(proximas));
    verificar('resumen docente: "Tomar asistencia" en la primera', (await b.texto('app-upcoming-list .item .accion')).includes('Tomar asistencia'));

    await b.sesion('estudiante');
    await b.ir('/colegio-san-jose/estudiante/inicio');
    verificar('resumen estudiante: 4 clases el lunes (3ro A)', (await eventos()).length === 4);

    await b.sesion('padre');
    await b.ir('/colegio-san-jose/padre/inicio');
    const titulo = await b.evaluar(`[...document.querySelectorAll('app-dash-card h3')].map(h => h.textContent.trim()).find(t => t.startsWith('Horario'))`);
    verificar('resumen padre: horario de su hijo', titulo === 'Horario de Luis hoy', titulo);
    verificar('resumen padre: 4 clases el lunes', (await eventos()).length === 4);
  } finally {
    await b.cerrar();
  }
};
