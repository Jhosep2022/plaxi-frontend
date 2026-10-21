// Academia: crear curso, invitaciones, solicitudes, catálogo y el link público /unirse/:codigo
const { abrirNavegador } = require('./lib');

module.exports = async function academia({ verificar }) {
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 19, 9, 0, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const tarjetas = () => b.evaluar(`[...document.querySelectorAll('app-tarjeta-aula h3')].map(h => h.textContent.trim())`);
  const ultimoBotonDrawer = () => b.evaluar(`[...document.querySelectorAll('app-curso-form app-drawer footer button')].at(-1).click()`);
  const escribirEn = (selector, valor) => b.evaluar(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  try {
    // ---------- Docente: crear curso ----------
    await b.sesion('docente');
    await b.ir('/academia-maria/docente/cursos/nuevo', 4000);
    verificar('"Crear curso" abre el formulario sobre Mis cursos', (await tarjetas()).length === 4 && (await cuerpo()).includes('Nuevo curso'));
    await escribirEn('#curso-nombre', 'Excel desde cero');
    await ultimoBotonDrawer();
    await b.esperar(800);
    verificar('pide la categoría', (await cuerpo()).includes('Elige una categoría.'));
    await escribirEn('#curso-desc', 'Fórmulas, tablas dinámicas y gráficos para el trabajo.');
    await b.elegir('#curso-cat', 'Negocios');
    await b.elegir('#curso-nivel', 'Intermedio');
    await b.evaluar(`document.querySelector('#curso-privado').click()`);
    await b.evaluar(`document.querySelector('#curso-aprobacion').click()`);
    await ultimoBotonDrawer();
    await b.esperar(2500);
    verificar('crea el curso y abre su aula en Contenido', (await b.texto('.encabezado h1')) === 'Excel desde cero' && (await b.texto('.pestanas button.activa')).includes('Contenido'));

    // Invitación
    await b.clic('.botones button', 'Invitar');
    await b.esperar(400);
    const link = await b.evaluar(`document.querySelector('app-drawer app-invitacion input')?.value ?? ''`);
    verificar('genera un link de invitación propio', /\/unirse\/EXC-[A-Z0-9]{4}$/.test(link), link);
    await b.clic('app-drawer app-invitacion button', 'Copiar');
    await b.esperar(200);
    verificar('el botón confirma que se copió', (await b.texto('app-drawer app-invitacion .link button')).includes('Copiado'));
    await b.clic('app-drawer app-invitacion .regenerar', 'Generar');
    await b.esperar(800);
    verificar('puede generar un link nuevo', (await b.evaluar(`document.querySelector('app-drawer app-invitacion input').value`)) !== link);

    // Solicitudes del curso privado
    await b.navegarEnApp('/academia-maria/docente/clases/1004?tab=estudiantes', 3000);
    verificar('Figma avanzado tiene 2 solicitudes pendientes', (await b.evaluar(`document.querySelectorAll('.solicitudes li:not(.vacio)').length`)) === 2);
    await b.evaluar(`[...document.querySelectorAll('.solicitudes li')].find(li => li.textContent.includes('Valeria')).querySelector('button').click()`);
    await b.esperar(1500);
    verificar('aprobar suma a la estudiante al curso', (await b.texto('#tabla-estudiantes tbody')).includes('Valeria Quiroga'));
    await b.evaluar(`[...document.querySelectorAll('.solicitudes li')].find(li => li.textContent.includes('Pedro')).querySelectorAll('button')[1].click()`);
    await b.esperar(1500);
    verificar('rechazar la quita de pendientes', (await b.texto('.solicitudes')).includes('No hay solicitudes por revisar'));

    await b.navegarEnApp('/academia-maria/docente/estudiantes', 3000);
    verificar('Estudiantes reúne a los de todos los cursos', (await b.texto('#tabla-academia')).includes('Luis Mamani') && (await b.texto('#tabla-academia')).includes('Valeria Quiroga'));
    await b.clic('.ui-tab', 'Links de invitación');
    await b.esperar(300);
    verificar('Links de invitación lista los 5 cursos (con el nuevo)', (await b.evaluar(`document.querySelectorAll('app-invitacion').length`)) === 5);

    // ---------- Estudiante: catálogo ----------
    await b.sesion('estudiante');
    await b.ir('/academia-maria/estudiante/catalogo', 4000);
    const cursos = await b.evaluar(`[...document.querySelectorAll('.curso h3')].map(h => h.textContent.trim())`);
    verificar('el catálogo muestra solo los cursos públicos (3)', cursos.length === 3 && !cursos.includes('Figma avanzado'), cursos.join(' | '));
    await b.clic('.categoria', 'Diseño');
    await b.esperar(200);
    verificar('filtra por categoría', (await b.evaluar(`document.querySelectorAll('.curso').length`)) === 1);
    await b.clic('.categoria', 'Todas');
    await b.evaluar(`[...document.querySelectorAll('.curso')].find(c => c.textContent.includes('Java y Spring Boot')).querySelector('.pie button').click()`);
    await b.esperar(1200);
    verificar('se inscribe en Java y Spring Boot', (await cuerpo()).includes('Ya estás en "Java y Spring Boot"') && (await b.evaluar(`[...document.querySelectorAll('.curso')].find(c => c.textContent.includes('Java')).textContent.includes('Ir al curso')`)));
    await b.navegarEnApp('/academia-maria/estudiante/aulas', 3000);
    verificar('el curso aparece en Mis cursos', (await tarjetas()).includes('Java y Spring Boot'));

    // ---------- Link de invitación ----------
    await b.ir('/unirse/FIG-8T3W', 3500);
    verificar('el link muestra la vista previa del curso', (await b.texto('.tarjeta h1')) === 'Figma avanzado' && (await cuerpo()).includes('María Fernández te invitó'));
    await b.clic('.accion button', 'Solicitar inscripción');
    await b.esperar(1500);
    verificar('en un curso con aprobación queda pendiente', (await cuerpo()).includes('Tu solicitud está pendiente'));
    await b.ir('/unirse/NO-EXISTE', 3000);
    verificar('un link inválido muestra un aviso', (await cuerpo()).includes('Este link ya no es válido'));

    // Sin sesión: inicia sesión y vuelve al link
    await b.evaluar('localStorage.clear(); true');
    await b.ir('/unirse/ANG-7K2Q', 3500);
    await b.clic('.accion button', 'Inicia sesión');
    await b.esperar(1500);
    verificar('sin sesión, pide iniciar sesión y avisa de la invitación', (await b.evaluar('location.pathname')) === '/auth/login' && (await cuerpo()).includes('unirte al curso al que te invitaron'));
    await escribirEn('#login-usuario', 'estudiante');
    await escribirEn('#login-clave', '123456');
    await b.clic('form button[type=submit]', 'Iniciar sesión');
    await b.esperar(3500);
    verificar('después del login vuelve al link de invitación', (await b.evaluar('location.pathname')) === '/unirse/ANG-7K2Q' && (await cuerpo()).includes('Ya estás inscrito'), await b.evaluar('location.pathname'));
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
