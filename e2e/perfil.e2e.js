// Mi perfil: cabecera con indicadores por rol, datos editables, foto, espacios, seguridad, preferencias y baja
const { abrirNavegador } = require('./lib');

module.exports = async function perfil({ verificar }) {
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 19, 9, 0, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const indicadores = () => b.evaluar(`[...document.querySelectorAll('.indicador span')].map(s => s.textContent.trim()).join('|')`);
  const seccion = (id) => b.evaluar(`document.querySelector('#${id}')?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  const editar = (id) => b.evaluar(`document.querySelector('#${id} .seccion-cabecera button').click()`);
  const enviar = (id) => b.evaluar(`document.querySelector('#${id} form button[type=submit]').click()`);
  const pestana = async (texto) => { await b.clic('.pestanas a', texto); await b.esperar(800); };
  const aceptarConfirm = () => b.evaluar('window.confirm = () => true; true');
  try {
    // ---------- Docente del colegio ----------
    await b.sesion('docente');
    await b.ir('/colegio-san-jose/perfil', 3500);
    verificar('cabecera con nombre, usuario y rol', (await b.texto('.cabecera h1')) === 'María Fernández López' && (await b.texto('.usuario')) === '@docente' && (await b.texto('.cabecera .chips')).includes('Docente'));
    verificar('indicadores del docente del colegio', (await indicadores()) === 'Clases|Estudiantes|Por revisar|Puntualidad', await indicadores());
    verificar('muestra cuánto del perfil está completo', (await cuerpo()).includes('Tu perfil está al 100%'));

    await editar('sec-contacto');
    await b.esperar(200);
    await b.escribir('#per-cel', '123');
    await b.esperar(200);
    verificar('valida el celular', (await seccion('sec-contacto')).includes('8 dígitos'));
    await b.escribir('#per-cel', '71234567');
    await enviar('sec-contacto');
    await b.esperar(1200);
    verificar('guarda el contacto en su lugar', (await cuerpo()).includes('Datos de contacto actualizados') && (await seccion('sec-contacto')).includes('71234567') && !(await b.evaluar(`!!document.querySelector('#sec-contacto form')`)));

    await editar('sec-personales');
    await b.esperar(200);
    await b.escribir('#per-nombre', 'María José');
    await enviar('sec-personales');
    await b.esperar(1200);
    verificar('el nombre nuevo se ve en la cabecera', (await b.texto('.cabecera h1')) === 'María José Fernández López');

    await editar('sec-cuenta');
    await b.esperar(200);
    await b.escribir('#per-usuario', 'admin');
    await enviar('sec-cuenta');
    await b.esperar(1200);
    verificar('no deja usar un nombre de usuario ocupado', (await cuerpo()).includes('ya está ocupado'));
    await b.evaluar(`[...document.querySelectorAll('#sec-cuenta form button')].find(x => x.textContent.includes('Cancelar')).click()`);

    await b.evaluar(`(() => { const c = document.createElement('canvas'); c.width = c.height = 8; c.toBlob((blob) => {
      const dt = new DataTransfer(); dt.items.add(new File([blob], 'yo.png', { type: 'image/png' }));
      const i = document.querySelector('#perfil-foto'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); }); })()`);
    await b.esperar(1500);
    verificar('sube una foto de perfil', (await b.evaluar(`document.querySelector('.avatar img')?.src.startsWith('data:image') ?? false`)) && (await cuerpo()).includes('Foto de perfil actualizada'));
    await b.clic('.quitar-foto', 'Quitar foto');
    await b.esperar(1200);
    verificar('quita la foto y vuelve a las iniciales', (await b.texto('.avatar span')) === 'MF');

    // Seguridad
    await pestana('Seguridad');
    await b.escribir('#seg-nueva', 'abc');
    await b.esperar(200);
    verificar('marca las reglas que cumple la contraseña', (await b.evaluar(`document.querySelectorAll('.reglas li.ok').length`)) === 0 && (await b.texto('.fuerza small')) === 'Débil');
    await b.escribir('#seg-actual', 'vieja123');
    await b.escribir('#seg-nueva', 'Plaxi2026!');
    await b.escribir('#seg-repetir', 'Plaxi2026');
    await b.esperar(200);
    verificar('avisa si las contraseñas no coinciden', (await cuerpo()).includes('Las contraseñas no coinciden') && (await b.texto('.fuerza small')) === 'Muy segura');
    await b.escribir('#seg-repetir', 'Plaxi2026!');
    await b.clic('form button[type=submit]', 'Cambiar contraseña');
    await b.esperar(1200);
    verificar('cambia la contraseña', (await cuerpo()).includes('Contraseña actualizada') && (await b.evaluar(`document.querySelector('#seg-actual').value`)) === '');
    verificar('lista los dispositivos con sesión abierta', (await b.evaluar(`document.querySelectorAll('.dispositivos li').length`)) === 3);
    await aceptarConfirm();
    await b.clic('.seccion-cabecera button', 'Cerrar las demás');
    await b.esperar(1200);
    verificar('cierra la sesión en los demás dispositivos', (await b.evaluar(`document.querySelectorAll('.dispositivos li').length`)) === 1);
    await b.clic('.peligro button', 'Dar de baja');
    await b.esperar(300);
    verificar('la baja pide escribir el usuario', await b.evaluar(`[...document.querySelectorAll('app-drawer footer button')].at(-1).disabled`));
    await b.evaluar(`[...document.querySelectorAll('app-drawer footer button')].find(x => x.textContent.includes('Cancelar')).click()`);

    // Preferencias
    await pestana('Preferencias');
    verificar('solo muestra los avisos de su rol', (await b.evaluar(`[...document.querySelectorAll('.fila[data-aviso]')].map(f => f.dataset.aviso).join(',')`)) === 'comunicados,tareas,calificaciones,resumen');
    await b.evaluar(`document.querySelector('.fila[data-aviso=tareas] .canal:nth-child(2) input').click()`);
    await b.esperar(200);
    verificar('marca los cambios sin guardar', (await cuerpo()).includes('Cambios sin guardar'));
    await b.clic('.pie button', 'Guardar preferencias');
    await b.esperar(1200);
    verificar('guarda las preferencias', (await cuerpo()).includes('Preferencias de avisos guardadas') && !(await cuerpo()).includes('Cambios sin guardar'));

    await b.navegarEnApp('/colegio-san-jose/perfil/editar', 2500);
    verificar('la ruta vieja de editar lleva al perfil', (await b.evaluar('location.pathname')) === '/colegio-san-jose/perfil' && !!(await b.texto('#sec-personales h2')));

    // ---------- Docente de la academia ----------
    await b.ir('/academia-maria/perfil', 3500);
    verificar('indicadores de la docente de academia', (await indicadores()) === 'Cursos|Estudiantes|Sesiones|Por revisar', await indicadores());
    verificar('vista previa del perfil público con su presentación', (await b.texto('.vista-previa')).includes('Así te ven tus estudiantes') && (await b.texto('.tarjeta-docente')).includes('12 años de experiencia'));
    await editar('sec-docente');
    await b.esperar(200);
    await b.escribir('#per-instagram', 'instagram.com/profemaria');
    await enviar('sec-docente');
    await b.esperar(800);
    verificar('los enlaces deben empezar con https', (await seccion('sec-docente')).includes('Debe empezar con https://'));
    await b.escribir('#per-instagram', 'https://instagram.com/profemaria');
    await enviar('sec-docente');
    await b.esperar(1200);
    verificar('guarda el perfil público y se ve en la vista previa', (await cuerpo()).includes('Perfil público actualizado') && (await b.evaluar(`document.querySelectorAll('.iconos-enlaces a').length`)) === 4);

    // ---------- Estudiante ----------
    await b.sesion('estudiante');
    await b.ir('/colegio-san-jose/perfil', 3500);
    verificar('indicadores del estudiante del colegio', (await indicadores()) === 'Materias|Mi progreso|Asistencia|Tareas', await indicadores());
    verificar('el estudiante tiene contacto de emergencia', (await seccion('sec-emergencia')).includes('Rosa Quispe'));
    await pestana('Mis espacios');
    verificar('lista sus dos espacios', (await b.evaluar(`document.querySelectorAll('.espacio').length`)) === 2);
    verificar('del colegio no puede salir solo', (await b.evaluar(`[...document.querySelectorAll('.espacio')].find(e => e.textContent.includes('Colegio')).innerText`)).includes('habla con la dirección'));
    await b.evaluar(`[...document.querySelectorAll('.espacio')].find(e => e.textContent.includes('Academia')).querySelector('.switch input').click()`);
    await b.esperar(300);
    verificar('elige el espacio que se abre al iniciar sesión', (await b.evaluar(`[...document.querySelectorAll('.espacio')].find(e => e.textContent.includes('Academia')).innerText`)).includes('Se abre al iniciar sesión') && (await b.evaluar(`localStorage.getItem('espacioPredeterminado')`)).includes('academia-maria'));
    await b.escribir('#per-codigo', 'abc');
    await b.clic('form button[type=submit]', 'Buscar curso');
    await b.esperar(300);
    verificar('valida el código del curso', (await cuerpo()).includes('formato ABC-1234'));

    await b.ir('/academia-maria/perfil/espacios', 3500);
    await aceptarConfirm();
    await b.evaluar(`[...document.querySelectorAll('.espacio')].find(e => e.textContent.includes('Academia')).querySelector('.salir').click()`);
    await b.esperar(2500);
    verificar('sale de la academia y vuelve a su colegio', (await b.evaluar('location.pathname')) === '/colegio-san-jose/estudiante/inicio' && (await b.evaluar(`JSON.parse(localStorage.getItem('membresias')).length`)) === 1);

    // ---------- Dirección ----------
    await b.sesion('direccion');
    await b.ir('/colegio-san-jose/perfil', 3500);
    verificar('indicadores de la dirección', (await indicadores()) === 'Estudiantes|Docentes|Paralelos|Materias', await indicadores());

    // ---------- Padre: da de baja su cuenta ----------
    await b.sesion('padre');
    await b.ir('/colegio-san-jose/perfil', 3500);
    verificar('indicadores del padre', (await indicadores()) === 'Hijos|Tareas|Espacios' && (await b.texto('.indicador strong')) === '2', await indicadores());
    await pestana('Seguridad');
    await b.clic('.peligro button', 'Dar de baja');
    await b.esperar(300);
    await b.escribir('#seg-confirmar', 'padre');
    await b.esperar(200);
    await b.evaluar(`[...document.querySelectorAll('app-drawer footer button')].at(-1).click()`);
    await b.esperar(2000);
    verificar('al dar de baja cierra la sesión', (await b.evaluar('location.pathname')) === '/auth/login');
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
