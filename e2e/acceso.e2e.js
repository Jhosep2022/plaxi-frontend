// Acceso: login, registro (docente que crea su academia, estudiante por invitación o sin código),
// recuperar contraseña, solicitud de colegios y elegir espacio
const { abrirNavegador } = require('./lib');

module.exports = async function acceso({ verificar }) {
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 20, 9, 0, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const ruta = () => b.evaluar('location.pathname');
  const enviar = async (texto, ms = 1500) => { await b.clic('form button[type=submit]', texto); await b.esperar(ms); };
  const marcar = (selector) => b.evaluar(`(() => { const c = document.querySelector(${JSON.stringify(selector)}); c.click(); return c.checked; })()`);
  const salir = async () => {
    await b.evaluar(`document.querySelector('app-sidebar button.avatar').click()`);
    await b.esperar(200);
    await b.evaluar(`document.querySelector('.user-menu .logout').click()`);
    await b.esperar(1200);
  };
  const datosPersonales = async (nombre, apellido, correo, clave) => {
    await b.escribir('#reg-nombre', nombre);
    await b.escribir('#reg-ap1', apellido);
    await b.esperar(300);
    await b.escribir('#reg-correo', correo);
    await b.escribir('#reg-clave', clave);
    await marcar('#reg-terminos');
  };
  try {
    // ---------- Login ----------
    await b.ir('/auth/login', 2500);
    await b.evaluar('localStorage.clear(); sessionStorage.clear(); true');
    await b.ir('/auth/login', 2500);
    verificar('el login muestra el panel de la marca y el formulario', (await cuerpo()).includes('Tu colegio y tu academia, en un solo lugar') && !!(await b.texto('#login-usuario').then(() => true)));
    await enviar('Iniciar sesión', 400);
    verificar('pide usuario y contraseña', (await cuerpo()).includes('Escribe tu usuario o correo') && (await cuerpo()).includes('Escribe tu contraseña'));
    await b.escribir('#login-usuario', 'nadie');
    await b.escribir('#login-clave', 'x');
    await enviar('Iniciar sesión');
    verificar('avisa si la cuenta no existe', (await cuerpo()).includes('No encontramos una cuenta con ese usuario o correo'));
    await b.escribir('#login-usuario', 'docente@plaxi.com');
    await b.escribir('#login-clave', 'cualquiera');
    await enviar('Iniciar sesión', 2500);
    verificar('entra con el correo y elige entre sus espacios', (await ruta()) === '/espacios' && (await b.evaluar(`document.querySelectorAll('.espacio').length`)) === 2);

    // ---------- Registro de un docente que crea su academia ----------
    await b.evaluar('localStorage.clear(); sessionStorage.clear(); true');
    await b.ir('/auth/registro', 2500);
    verificar('el registro empieza eligiendo el tipo de cuenta', (await b.evaluar(`document.querySelectorAll('.tipo').length`)) === 3 && (await cuerpo()).includes('Soy un colegio'));
    await b.clic('.tipo', 'Quiero enseñar');
    await b.esperar(300);
    await datosPersonales('Ana', 'López', 'docente@plaxi.com', 'abc');
    await b.evaluar(`document.querySelector('#reg-correo').dispatchEvent(new Event('blur'))`);
    await b.esperar(600);
    verificar('sugiere un usuario a partir del nombre', (await b.evaluar(`document.querySelector('#reg-usuario').value`)) === 'ana.lopez');
    verificar('avisa si el correo ya tiene cuenta', (await cuerpo()).includes('Ya existe una cuenta con ese correo'));
    verificar('valida la contraseña con el medidor', (await cuerpo()).includes('Debe tener al menos 8 caracteres') && (await b.texto('app-medidor-clave .fuerza small')) === 'Débil');
    await b.escribir('#reg-correo', 'ana.lopez@gmail.com');
    await b.escribir('#reg-clave', 'Clases2026!');
    await enviar('Continuar', 1200);
    verificar('propone el nombre y la dirección web de la academia', (await b.evaluar(`document.querySelector('#reg-academia').value`)) === 'Academia de Ana López' && (await b.evaluar(`document.querySelector('#reg-slug').value`)) === 'academia-de-ana-lopez');
    await b.escribir('#reg-slug', 'academia-maria');
    await b.esperar(600);
    verificar('no deja usar una dirección web ocupada', (await cuerpo()).includes('Esa dirección ya está en uso'));
    await b.escribir('#reg-slug', 'ana-lopez');
    await b.escribir('#reg-curso', 'Excel desde cero');
    await b.esperar(200);
    verificar('el primer curso pide categoría', (await cuerpo()).includes('Elige la categoría del curso'));
    await b.elegir('#reg-categoria', 'Negocios');
    await b.esperar(300);
    await enviar('Crear mi academia', 2500);
    verificar('crea la academia y muestra los primeros pasos', (await cuerpo()).includes('¡Tu academia está lista!') && (await b.evaluar(`document.querySelectorAll('.primeros-pasos li').length`)) === 3);
    await b.clic('.boton-ancho', 'Ir a mi academia');
    await b.esperar(3500);
    verificar('entra a su academia nueva como docente', (await ruta()) === '/ana-lopez/docente/inicio' && (await cuerpo()).includes('Excel desde cero'), await ruta());
    await salir();
    verificar('cierra la sesión', (await ruta()) === '/auth/login');
    await b.escribir('#login-usuario', 'ana.lopez');
    await b.escribir('#login-clave', 'otra-clave1');
    await enviar('Iniciar sesión');
    verificar('la cuenta nueva exige su contraseña', (await cuerpo()).includes('La contraseña no es correcta'));
    await b.escribir('#login-clave', 'Clases2026!');
    await enviar('Iniciar sesión', 3000);
    verificar('con su contraseña entra directo a su academia', (await ruta()) === '/ana-lopez/docente/inicio');

    // ---------- Estudiante que llega por un link de invitación ----------
    await b.evaluar('localStorage.clear(); sessionStorage.clear(); true');
    await b.ir('/unirse/ANG-7K2Q', 3500);
    await b.clic('.accion a', 'Crear cuenta y unirme');
    await b.esperar(2500);
    verificar('el registro por invitación salta al paso de datos y nombra el curso', (await cuerpo()).includes('te invitó a Angular desde cero') && !!(await b.evaluar(`!!document.querySelector('#reg-nombre')`)));
    await datosPersonales('Diego', 'Vargas', 'diego.vargas@gmail.com', 'Aprender2026');
    await enviar('Continuar', 1200);
    verificar('trae el código de la invitación', (await b.evaluar(`document.querySelector('#reg-codigo').value`)) === 'ANG-7K2Q');
    await enviar('Crear cuenta y unirme', 2500);
    verificar('crea la cuenta y lo inscribe', (await cuerpo()).includes('¡Ya estás dentro!'));
    await b.clic('.boton-ancho', 'Ir a mi curso');
    await b.esperar(3500);
    verificar('entra directo al curso', (await ruta()) === '/academia-maria/estudiante/aulas/1001', await ruta());

    // ---------- Estudiante sin código: elegir espacio vacío y crear su academia ----------
    await b.evaluar('localStorage.clear(); sessionStorage.clear(); true');
    await b.ir('/auth/registro?tipo=estudiante', 2500);
    await b.clic('.tipo', 'Quiero aprender');
    await b.esperar(300);
    await datosPersonales('Lucía', 'Rojas', 'lucia.rojas@gmail.com', 'Lucia2026');
    await enviar('Continuar', 1200);
    await enviar('Crear cuenta', 2500);
    verificar('sin código la cuenta queda creada', (await cuerpo()).includes('¡Cuenta creada!'));
    await b.clic('.boton-ancho', 'Continuar');
    await b.esperar(2000);
    verificar('sin espacios ve las opciones para empezar', (await ruta()) === '/espacios' && (await cuerpo()).includes('Todavía no perteneces a ningún curso'));
    await b.escribir('#esp-codigo', 'abc');
    await b.clic('.opcion form button', 'Buscar');
    await b.esperar(200);
    verificar('valida el código', (await cuerpo()).includes('formato ABC-1234'));
    await b.escribir('#esp-academia', 'Academia de Lucía');
    await b.esperar(200);
    verificar('muestra la dirección web que tendrá', (await cuerpo()).includes('quizwiz.app/academia-de-lucia'));
    await b.clic('.opcion form button', 'Crear');
    await b.esperar(3500);
    verificar('crea su academia y entra como docente', (await ruta()) === '/academia-de-lucia/docente/inicio', await ruta());

    // ---------- Recuperar contraseña ----------
    await b.evaluar('localStorage.clear(); sessionStorage.clear(); true');
    await b.ir('/auth/recuperar-contrasena', 2500);
    await b.escribir('#rec-correo', 'nadie@gmail.com');
    await enviar('Enviar enlace');
    verificar('con un correo desconocido responde igual, sin enlace', (await cuerpo()).includes('Revisa tu correo') && !(await b.evaluar(`!!document.querySelector('#enlace-recuperacion')`)));
    await b.clic('.boton-enlace', 'otro correo');
    await b.esperar(200);
    await b.escribir('#rec-correo', 'docente@plaxi.com');
    await enviar('Enviar enlace');
    await b.evaluar(`document.querySelector('#enlace-recuperacion').click()`);
    await b.esperar(1500);
    verificar('el enlace abre la pantalla de contraseña nueva', (await ruta()) === '/auth/nueva-contrasena' && (await cuerpo()).includes('Crea tu contraseña nueva'));
    await b.escribir('#nc-clave', 'Nueva2026!');
    await b.escribir('#nc-repetir', 'Nueva2026');
    await enviar('Guardar contraseña', 400);
    verificar('avisa si no coinciden', (await cuerpo()).includes('Las contraseñas no coinciden'));
    await b.escribir('#nc-repetir', 'Nueva2026!');
    await enviar('Guardar contraseña', 2000);
    verificar('guarda y vuelve al login con un aviso', (await ruta()) === '/auth/login' && (await cuerpo()).includes('Tu contraseña se cambió'));
    await b.escribir('#login-usuario', 'docente');
    await b.escribir('#login-clave', 'Nueva2026!');
    await enviar('Iniciar sesión', 2500);
    verificar('entra con la contraseña nueva', (await ruta()) === '/espacios');
    await b.evaluar('localStorage.clear(); true');
    await b.ir('/auth/nueva-contrasena?token=usado', 2500);
    verificar('un enlace usado o inventado no sirve', (await cuerpo()).includes('Este enlace ya no es válido'));

    // ---------- Solicitud de un colegio ----------
    await b.ir('/auth/colegio', 2500);
    await enviar('Enviar solicitud', 400);
    verificar('la solicitud pide los datos obligatorios', (await cuerpo()).includes('Escribe el nombre del colegio') && (await cuerpo()).includes('Escribe un celular de contacto'));
    await b.escribir('#col-nombre', 'Unidad Educativa San Martín');
    await b.escribir('#col-contacto', 'Rocío Flores');
    await b.escribir('#col-correo', 'direccion@sanmartin.edu.bo');
    await b.escribir('#col-telefono', '71234567');
    await enviar('Enviar solicitud', 1500);
    verificar('envía la solicitud del colegio', (await cuerpo()).includes('¡Gracias, Rocío!') && (await cuerpo()).includes('Unidad Educativa San Martín'));
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
