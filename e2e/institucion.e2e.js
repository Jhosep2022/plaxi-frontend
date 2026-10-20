// Datos de la institución: edición, validaciones, logo y su uso en el sidebar y los boletines
const { abrirNavegador } = require('./lib');

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#bccf4e"/></svg>`;

module.exports = async function institucion({ verificar }) {
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 19, 9, 0, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const valor = (id) => b.evaluar(`document.querySelector('#${id}').value`);
  const guardarDeshabilitado = () => b.evaluar(`[...document.querySelectorAll('app-page-header button')].find(x => x.textContent.includes('Guardar')).disabled`);
  const guardar = async () => { await b.clic('app-page-header button', 'Guardar'); await b.esperar(1000); };
  try {
    await b.sesion('direccion');
    await b.ir('/colegio-san-jose/direccion/institucion', 3000);
    verificar('carga los datos del colegio', (await valor('inst-nombre')) === 'Colegio San José' && (await valor('inst-sie')) === '80730215');
    verificar('sin cambios, "Guardar" está deshabilitado', await guardarDeshabilitado());
    verificar('muestra el resumen de la gestión', (await b.texto('.cifras')).includes('9 paralelos') && (await b.texto('.cifras')).includes('245 estudiantes'));

    await b.escribir('#inst-sigla', 'SJ');
    await b.esperar(200);
    verificar('avisa los cambios sin guardar', (await cuerpo()).includes('Cambios sin guardar') && !(await guardarDeshabilitado()));
    await b.clic('app-page-header button', 'Descartar');
    await b.esperar(200);
    verificar('"Descartar" vuelve a los datos guardados', (await valor('inst-sigla')) === 'CSJ' && (await guardarDeshabilitado()));

    await b.escribir('#inst-sie', '123');
    await guardar();
    verificar('valida el código SIE de 8 dígitos', (await cuerpo()).includes('Debe tener 8 dígitos'));
    await b.escribir('#inst-sie', '80730215');

    await b.evaluar(`document.querySelector('#inst-nivel-secundaria').click()`);
    await guardar();
    verificar('no deja quitar un nivel con paralelos', (await cuerpo()).includes('Secundaria tiene paralelos en la gestión activa'));
    await b.evaluar(`document.querySelector('#inst-nivel-secundaria').click()`);

    await b.escribir('#inst-nombre', 'Unidad Educativa San José');
    await b.escribir('#inst-lema', 'Ciencia y virtud');
    await b.escribir('#inst-subdirector', 'Jorge Vargas');
    await b.evaluar(`(() => { const dt = new DataTransfer(); dt.items.add(new File([${JSON.stringify(LOGO_SVG)}], 'logo.svg', { type: 'image/svg+xml' }));
      const input = document.querySelector('#inst-logo'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await b.esperar(400);
    verificar('el logo se ve en la vista previa', await b.evaluar(`!!document.querySelector('.encabezado-boletin img')`));
    verificar('la vista previa muestra el lema', (await b.texto('.encabezado-boletin')).includes('Ciencia y virtud'));
    await guardar();
    verificar('guarda los datos', (await cuerpo()).includes('Datos de la institución guardados') && (await guardarDeshabilitado()));
    verificar('el sidebar muestra el nuevo nombre', (await b.texto('app-sidebar')).includes('Unidad Educativa San José'));
    await b.captura('institucion-datos.png');

    // El boletín usa el logo, el nombre, el lema y las firmas
    await b.navegarEnApp('/colegio-san-jose/direccion/calificaciones/boletines', 3000);
    await b.clic('.ui-tabla button', 'Ver boletín');
    await b.esperar(800);
    const encabezado = await b.texto('app-boletin .encabezado');
    verificar('el boletín muestra el nuevo nombre, el SIE y el lema', encabezado.includes('Unidad Educativa San José') && encabezado.includes('SIE 80730215') && encabezado.includes('Ciencia y virtud'), encabezado);
    verificar('el boletín muestra el logo', await b.evaluar(`!!document.querySelector('app-boletin .escudo img')`));
    verificar('el boletín lleva las firmas de las autoridades', (await b.texto('app-boletin .firmas')).includes('Ana Rojas') && (await b.texto('app-boletin .firmas')).includes('Jorge Vargas'));
    await b.captura('institucion-boletin.png');
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
