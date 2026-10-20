// Comunicados (dirección, docente, padre, estudiante) y Mis hijos (padre con dos hijos)
const { abrirNavegador } = require('./lib');

module.exports = async function comunicados({ verificar }) {
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 19, 9, 0, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const items = () => b.evaluar(`[...document.querySelectorAll('.lista .item .titulo-item')].map(t => t.textContent.trim())`);
  const abrir = (titulo) => b.evaluar(`[...document.querySelectorAll('.lista .item')].find(i => i.textContent.includes(${JSON.stringify(titulo)})).click()`);
  const tarjetaEnviado = (titulo) => b.evaluar(`[...document.querySelectorAll('.enviado')].find(e => e.querySelector('h3').textContent.includes(${JSON.stringify(titulo)}))?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  try {
    // ---------- Padre: bandeja ----------
    await b.sesion('padre');
    await b.ir('/colegio-san-jose/padre/comunicados', 3000);
    verificar('el padre recibe 4 comunicados (generales, de padres y de 3ro A)', (await items()).length === 4, (await items()).join(' | '));
    verificar('no recibe los de otros cursos ni los de docentes', !(await items()).some((t) => t.includes('Material para la práctica') || t.includes('Plazo para el registro')));
    verificar('avisa el comunicado que pide confirmación', (await cuerpo()).includes('Tienes 1 comunicado que pide confirmar'));
    verificar('3 sin leer (la feria ya la había leído)', (await b.texto('.ui-tab:nth-child(2) .contador')) === '3');
    await abrir('Reunión general de padres');
    await b.esperar(800);
    verificar('al abrirlo muestra el mensaje y la fecha del evento', (await b.texto('.detalle .mensaje')).includes('coliseo') && (await b.texto('.detalle .evento')).includes('sábado, 24 de octubre'.replace('sábado', 'Sábado')));
    verificar('al leerlo baja el contador de no leídos', (await b.texto('.ui-tab:nth-child(2) .contador')) === '2');
    await b.clic('.detalle .confirmacion button', 'Enterado');
    await b.esperar(800);
    verificar('"Enterado" confirma la recepción', (await b.texto('.detalle .confirmacion')).includes('Confirmaste que lo recibiste') && !(await cuerpo()).includes('pide confirmar'));
    await b.clic('.ui-tab', 'Importantes');
    await b.esperar(200);
    verificar('el filtro "Importantes" deja 2', (await items()).length === 2);

    // ---------- Padre: Mis hijos y selector ----------
    await b.navegarEnApp('/colegio-san-jose/padre/hijos', 3000);
    const hijos = await b.evaluar(`[...document.querySelectorAll('.hijo h2')].map(h => h.textContent.trim())`);
    verificar('Mis hijos muestra a Luis y a Sofía', hijos.join('|') === 'Luis Mamani|Sofía Mamani', hijos.join('|'));
    verificar('la ficha de Luis muestra su curso y su asistencia', (await b.texto('.hijo:first-child .nombre small')).startsWith('3ro A') && (await b.texto('.hijo:first-child .datos')).includes('%'));
    verificar('avisa los comunicados sin leer', (await b.texto('.aviso-comunicados')).includes('2 comunicados sin leer'));
    await b.evaluar(`[...document.querySelectorAll('.hijo')][1].querySelector('.acciones button:nth-child(2)').click()`);
    await b.esperar(3000);
    verificar('"Notas" de Sofía abre sus calificaciones', (await b.texto('app-page-header h1')) === 'Calificaciones de Sofía Mamani', await b.texto('app-page-header h1'));
    verificar('el selector de hijo marca a Sofía', (await b.texto('app-selector-hijo .ui-tab.activa')).startsWith('Sofía Mamani'));
    await b.clic('app-selector-hijo .ui-tab', 'Luis Mamani');
    await b.esperar(2500);
    verificar('el selector cambia a Luis', (await b.texto('app-page-header h1')) === 'Calificaciones de Luis Mamani');
    await b.navegarEnApp('/colegio-san-jose/padre/horario', 2500);
    verificar('el horario sigue al hijo elegido (Luis, 3ro A)', (await b.texto('app-page-header h1')) === 'Horario de Luis Mamani' && (await cuerpo()).includes('3ro A'));

    // ---------- Docente: recibidos y enviados ----------
    await b.sesion('docente');
    await b.ir('/colegio-san-jose/docente/comunicados', 3000);
    verificar('el docente recibe los de la dirección (3), no los suyos', (await items()).length === 3 && (await items()).includes('Plazo para el registro de notas del 3er trimestre'), (await items()).join(' | '));
    await b.clic('.ui-tab', 'Enviados');
    await b.esperar(1200);
    verificar('en "Enviados" ve sus 2 comunicados', (await b.evaluar(`document.querySelectorAll('.enviado').length`)) === 2);
    verificar('muestra cuántos lo leyeron', /Leído por \d+ de \d+/.test(await tarjetaEnviado('Examen de Física')));
    await b.clic('.barra-enviados button', 'Nuevo comunicado');
    await b.esperar(300);
    verificar('el docente no puede escribir a docentes', !(await b.evaluar(`!!document.querySelector('#com-pub-docentes')`)));
    await b.escribir('#com-titulo', 'Salida al museo');
    await b.escribir('#com-mensaje', 'El viernes visitaremos el museo de historia natural. Traer autorización firmada.');
    await b.evaluar(`document.querySelector('#com-pub-estudiantes').click()`);
    await b.esperar(200);
    const alcance = await b.texto('.alcance-previo');
    verificar('calcula a cuántos llegará (padres + estudiantes de su primer curso)', /Llegará a \d+ personas/.test(alcance), alcance);
    await b.clic('app-drawer footer button', 'Enviar');
    await b.esperar(1200);
    verificar('envía el comunicado', (await cuerpo()).includes('Comunicado enviado a') && (await b.evaluar(`document.querySelectorAll('.enviado').length`)) === 3);

    // ---------- Dirección ----------
    await b.sesion('direccion');
    await b.ir('/colegio-san-jose/direccion/comunicados', 3000);
    verificar('la dirección ve todos los comunicados del colegio (6)', (await b.evaluar(`document.querySelectorAll('.enviado').length`)) === 6);
    const reunion = await tarjetaEnviado('Reunión general de padres');
    verificar('la reunión de padres muestra lecturas y confirmaciones', reunion.includes('confirmaron "Enterado"'), reunion);
    await b.evaluar(`[...document.querySelectorAll('.enviado')].find(e => e.textContent.includes('Reunión general')).querySelector('.acciones-enviado button').click()`);
    await b.esperar(1000);
    verificar('el detalle lista quién falta confirmar', (await b.texto('app-drawer .sub')).startsWith('Falta que confirmen') && (await b.evaluar(`document.querySelectorAll('app-drawer .pendientes li').length`)) > 0);
    await b.evaluar(`document.querySelector('app-drawer .cerrar').click()`);
    await b.clic('.barra-enviados button', 'Nuevo comunicado');
    await b.esperar(300);
    await b.escribir('#com-titulo', 'Vacunación escolar');
    await b.escribir('#com-mensaje', 'El jueves habrá una campaña de vacunación en el colegio.');
    await b.clic('app-drawer footer button', 'Enviar');
    await b.esperar(1200);
    verificar('la dirección envía a todo el colegio', (await cuerpo()).includes('Comunicado enviado a') && (await b.evaluar(`document.querySelectorAll('.enviado').length`)) === 7);
    await b.captura('comunicados-direccion.png');

    // ---------- Estudiante ----------
    await b.sesion('estudiante');
    await b.ir('/colegio-san-jose/estudiante/comunicados', 3000);
    verificar('el estudiante recibe los suyos (sin la reunión de padres)', (await items()).length === 3 && !(await items()).includes('Reunión general de padres de familia'), (await items()).join(' | '));
    await b.captura('comunicados-estudiante.png');
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
