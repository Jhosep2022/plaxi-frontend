// Inicio (resumen) de cada rol del colegio: sus números deben coincidir con los de los módulos
const { abrirNavegador } = require('./lib');

module.exports = async function inicio({ verificar }) {
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 19, 9, 0, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const accion = () => b.texto('app-dash-header .accion');
  const tarjetas = () => b.evaluar(`[...document.querySelectorAll('app-progress-card')].map(t => t.innerText.replace(/\\s+/g, ' ').trim())`);
  try {
    // Estudiante: notas de Calificaciones y tareas de Tareas
    await b.sesion('estudiante');
    await b.ir('/colegio-san-jose/estudiante/inicio', 5000);
    verificar('estudiante: el botón muestra sus 2 tareas por entregar', (await accion()).includes('Mis tareas (2)'), await accion());
    verificar('estudiante: Física con 62 (la misma nota de Mis calificaciones)', (await tarjetas())[0]?.includes('Física') && (await tarjetas())[0]?.includes('62'), (await tarjetas()).join(' | '));
    verificar('estudiante: lista sus materias con la nota del periodo', (await cuerpo()).includes('62 pts') && (await cuerpo()).includes('Prof. María Fernández'));
    verificar('estudiante: las novedades salen de sus tareas reales', (await cuerpo()).includes('Ejercicios de funciones lineales') && !(await cuerpo()).includes('Ensayo argumentativo'));

    // Padre: comunicados reales y tareas del hijo
    await b.sesion('padre');
    await b.ir('/colegio-san-jose/padre/inicio', 5000);
    verificar('padre: el botón cuenta sus 3 comunicados sin leer', (await accion()).includes('Comunicados (3)'), await accion());
    verificar('padre: los próximos eventos salen de los comunicados', (await cuerpo()).includes('Reunión general de padres de familia') && (await cuerpo()).includes('Feria de ciencias 2026'));
    verificar('padre: avisa la falta reciente de Luis', (await cuerpo()).includes('Faltó a una clase'));

    // Docente: Mis clases, Tareas y Calificaciones
    await b.sesion('docente');
    await b.ir('/colegio-san-jose/docente/inicio', 5000);
    verificar('docente: avance de notas por clase', (await tarjetas()).every((t) => t.includes('notas cargadas')) && (await tarjetas()).length === 3);
    verificar('docente: "Para hacer" muestra las entregas por revisar', (await cuerpo()).includes('30 entregas por revisar'));
    verificar('docente: lista sus 6 clases', (await b.evaluar(`[...document.querySelectorAll('app-dash-card')].find(c => c.textContent.includes('Mis clases'))?.querySelectorAll('.fila').length ?? 0`)) === 6);

    // Dirección: alertas y comunicados reales
    await b.sesion('direccion');
    await b.ir('/colegio-san-jose/direccion/inicio', 5000);
    verificar('dirección: alerta los 4 estudiantes sin inscribir', (await cuerpo()).includes('4 estudiantes sin inscribir'));
    verificar('dirección: alerta las 2 licencias por responder', (await cuerpo()).includes('2 licencias por responder'));
    verificar('dirección: muestra los últimos comunicados', (await cuerpo()).includes('Asueto por Todos Santos'));
    verificar('dirección: clases de hoy del colegio', (await cuerpo()).includes('Clases de hoy en el colegio') && (await cuerpo()).includes('Física · 3ro A'));
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
