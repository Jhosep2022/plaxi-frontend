// Aulas virtuales: Mis clases (docente) y Mis materias (estudiante), el aula con sus pestañas y el contenido
const { abrirNavegador } = require('./lib');

const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#0a0a23"/></svg>';

module.exports = async function clases({ verificar }) {
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 19, 9, 0, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const tarjetas = () => b.evaluar(`[...document.querySelectorAll('app-tarjeta-aula h3')].map(h => h.textContent.trim())`);
  const tarjeta = (nombre) => b.evaluar(`[...document.querySelectorAll('app-tarjeta-aula')].find(t => t.querySelector('h3').textContent.trim() === ${JSON.stringify(nombre)})?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  const pestana = async (nombre) => { await b.clic('.pestanas button', nombre); await b.esperar(1200); };
  const unidades = () => b.evaluar(`[...document.querySelectorAll('app-contenido-docente .unidad h3')].map(h => h.textContent.trim())`);
  const ultimoBotonDrawer = () => b.evaluar(`[...document.querySelectorAll('app-drawer footer button')].at(-1).click()`);
  try {
    // ---------- Docente: Mis clases ----------
    await b.sesion('docente');
    await b.ir('/colegio-san-jose/docente/clases', 4500);
    verificar('Mis clases muestra las 6 aulas de María', (await tarjetas()).length === 6);
    verificar('la tarjeta de Física 3ro A muestra estudiantes, entregas y pendientes', /32 estudiantes/.test(await tarjeta('Física · 3ro A')) && (await tarjeta('Física · 3ro A')).includes('30 por revisar') && (await tarjeta('Física · 3ro A')).includes('Entregas 94%'), await tarjeta('Física · 3ro A'));
    await b.clic('.ui-tab', 'Por revisar');
    await b.esperar(200);
    verificar('"Por revisar" filtra las aulas con entregas pendientes (3)', (await tarjetas()).length === 3);
    await b.clic('.ui-tab', 'Todas');
    await b.escribir('.buscar input', 'física');
    await b.esperar(200);
    verificar('el buscador filtra (2 de Física)', (await tarjetas()).length === 2);
    verificar('el sidebar lista las aulas', (await b.texto('app-sidebar')).includes('Química · 5to A'));

    // ---------- Docente: aula de Física 3ro A ----------
    await b.evaluar(`[...document.querySelectorAll('app-tarjeta-aula')].find(t => t.textContent.includes('Física · 3ro A')).querySelector('a').click()`);
    await b.esperar(3500);
    verificar('abre el aula de la clase', (await b.texto('.encabezado h1')) === 'Física · 3ro A');
    verificar('Inicio: avance, asistencia, promedio y estudiantes en riesgo', (await b.evaluar(`document.querySelectorAll('.indicador').length`)) === 4 && (await cuerpo()).includes('estudiantes en riesgo'));
    verificar('Inicio: lo que falta revisar', (await b.texto('.pendientes')).includes('Problemas de MRUV (guía 3)'));

    await pestana('Contenido');
    verificar('Contenido: 3 unidades con su contenido', (await unidades()).length === 3 && (await cuerpo()).includes('Movimiento rectilíneo uniforme (MRU)'));
    verificar('la unidad 3 está en borrador y la 2 bloqueada hasta completar la 1', (await cuerpo()).includes('Borrador') && (await cuerpo()).includes('Se abre al completar la anterior'));

    await b.clic('app-contenido-docente .barra button', 'Unidad');
    await b.esperar(300);
    await b.escribir('#uni-titulo', 'Unidad 4: Ondas');
    await b.evaluar(`document.querySelector('#uni-bloqueo').click()`);
    await ultimoBotonDrawer();
    await b.esperar(1200);
    verificar('crea una unidad nueva al final', (await unidades()).at(-1) === 'Unidad 4: Ondas' && (await b.evaluar(`[...document.querySelectorAll('app-contenido-docente .unidad')].at(-1).textContent.includes('Se abre al completar la anterior')`)));

    await b.evaluar(`[...document.querySelectorAll('app-contenido-docente .unidad')].at(-1).querySelector('.agregar').click()`);
    await b.esperar(300);
    await b.escribir('#tema-titulo', 'Simulador de ondas');
    await b.evaluar(`document.querySelector('#tema-tipo-enlace').click()`);
    await b.esperar(200);
    await ultimoBotonDrawer();
    await b.esperar(800);
    verificar('un enlace sin URL no se guarda', (await cuerpo()).includes('Indica el enlace del recurso'));
    await b.escribir('#tema-url', 'https://phet.colorado.edu/es/simulations/wave-on-a-string');
    await ultimoBotonDrawer();
    await b.esperar(1200);
    verificar('agrega el tema a la unidad', (await b.evaluar(`[...document.querySelectorAll('app-contenido-docente .unidad')].at(-1).textContent`)).includes('Simulador de ondas'));

    await b.evaluar(`[...document.querySelectorAll('app-contenido-docente .unidad')].at(-1).querySelector('.acciones button:nth-child(2)').click()`);
    await b.esperar(1200);
    verificar('reordena: la unidad 4 sube un lugar', (await unidades())[2] === 'Unidad 4: Ondas', (await unidades()).join(' | '));

    await b.clic('app-contenido-docente .barra button', 'Copiar a otro paralelo');
    await b.esperar(500);
    verificar('ofrece copiar a Física 4to B', (await cuerpo()).includes('Copiar a') && (await b.evaluar(`!!document.querySelector('app-drawer input[id^="copiar-a-"]')`)));
    await b.evaluar(`[...document.querySelectorAll('app-drawer input[id^="copiar-a-"]')][0].click()`);
    await ultimoBotonDrawer();
    await b.esperar(1500);
    verificar('copia el contenido como borrador', (await cuerpo()).includes('como borrador'));

    // Portada propia
    await b.evaluar(`(() => { const dt = new DataTransfer(); dt.items.add(new File([${JSON.stringify(LOGO)}], 'portada.svg', { type: 'image/svg+xml' }));
      const i = document.querySelector('#aula-portada'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await b.esperar(1200);
    verificar('el docente puede subir su propia portada', (await cuerpo()).includes('Portada actualizada') && await b.evaluar(`!!document.querySelector('.encabezado app-portada-aula img')`));

    await pestana('Estudiantes');
    verificar('Estudiantes: los 32 con su avance en el contenido', (await b.evaluar(`document.querySelectorAll('#tabla-estudiantes tbody tr').length`)) === 32 && (await b.texto('#tabla-estudiantes tbody tr')).includes('%'));
    await b.evaluar(`document.querySelector('#solo-riesgo').click()`);
    await b.esperar(200);
    verificar('"Solo en riesgo" deja a los 7 en riesgo', (await b.evaluar(`document.querySelectorAll('#tabla-estudiantes tbody tr').length`)) === 7);

    await pestana('Notas');
    verificar('Notas: resumen y acceso a la planilla', (await cuerpo()).includes('Abrir la planilla de notas'));

    await b.clic('.menu-nuevo > button', 'Nuevo');
    await b.esperar(200);
    await b.clic('.menu button', 'Tarea');
    await b.esperar(2500);
    verificar('"Nuevo → Tarea" abre Tareas filtrado por la clase', (await b.evaluar('location.search')).includes('clase=9') && (await b.evaluar(`document.querySelector('.filtros select').value`)) === '9');

    await b.navegarEnApp('/colegio-san-jose/docente/clases/999', 2500);
    verificar('un aula ajena o inexistente muestra un aviso', (await cuerpo()).includes('No encontramos esta clase'));

    // ---------- Estudiante: Mis materias ----------
    await b.sesion('estudiante');
    await b.ir('/colegio-san-jose/estudiante/aulas', 4500);
    verificar('Mis materias muestra las 6 materias de Luis (no cursos de academia)', (await tarjetas()).length === 6 && !(await cuerpo()).includes('Angular desde cero'));
    verificar('Física: mi progreso 71% y mi nota 62%', (await tarjeta('Física · 3ro A')).includes('Mi progreso 71%') && (await tarjeta('Física · 3ro A')).includes('Mi nota 62%'), await tarjeta('Física · 3ro A'));

    await b.navegarEnApp('/colegio-san-jose/estudiante/aulas/9', 3500);
    verificar('"Continuar" lleva al siguiente tema pendiente', (await b.texto('.continuar')).includes('Segunda ley de Newton'));
    verificar('no ve la unidad en borrador', (await b.evaluar(`document.querySelectorAll('.indice .unidad').length`)) === 2);
    verificar('el contador muestra 5 de 7 temas vistos', (await b.texto('.pestanas button')).includes('5/7'));
    await b.clic('.visor .pie button', 'Marcar como visto');
    await b.esperar(800);
    verificar('marcar como visto suma al avance', (await b.texto('.pestanas button')).includes('6/7') && (await b.texto('.visor .pie')).includes('Visto'));
    await pestana('Notas');
    verificar('la pestaña Notas muestra su 62 por criterio', (await b.texto('.nota-final')).includes('62') && (await cuerpo()).includes('Saber'));

    // Unidad bloqueada (Matemáticas 3ro A)
    await b.navegarEnApp('/colegio-san-jose/estudiante/aulas/8', 3500);
    verificar('la unidad 3 está bloqueada hasta completar la 2', (await b.evaluar(`[...document.querySelectorAll('.indice .unidad')][2].classList.contains('bloqueada')`)) && (await cuerpo()).includes('Completa la unidad anterior'));
    // Completar la unidad 2 desbloquea la 3
    for (let i = 0; i < 3; i++) {
      const pendiente = await b.evaluar(`(() => { const t = [...document.querySelectorAll('.indice .unidad')][1].querySelector('.tema:not(.visto)'); if (!t) return false; t.click(); return true; })()`);
      if (!pendiente) break;
      await b.esperar(300);
      await b.clic('.visor .pie button', 'Marcar como visto');
      await b.esperar(800);
    }
    verificar('al completar la unidad 2 se desbloquea la 3', (await cuerpo()).includes('Se desbloqueó la siguiente') && !(await b.evaluar(`[...document.querySelectorAll('.indice .unidad')][2].classList.contains('bloqueada')`)));
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
