// Ejecuta las pruebas e2e contra la app corriendo (por defecto http://localhost:4200).
// Uso:  npm start   (en otra terminal)   y luego   npm run e2e
//       npm run e2e -- horarios          (solo las suites cuyo nombre contenga "horarios")
const { BASE, crearReporte } = require('./lib');

const SUITES = {
  academico: require('./academico.e2e'),
  horarios: require('./horarios.e2e'),
  vistas: require('./vistas.e2e'),
  asistencia: require('./asistencia.e2e'),
};

async function main() {
  const filtro = process.argv[2];
  try {
    await fetch(BASE);
  } catch {
    console.error(`No pude conectarme a ${BASE}. Levanta la app con "npm start" (o define BASE_URL).`);
    process.exit(1);
  }

  const reportes = [];
  for (const [nombre, suite] of Object.entries(SUITES)) {
    if (filtro && !nombre.includes(filtro)) continue;
    console.log(`\n▶ ${nombre}`);
    const reporte = crearReporte(nombre);
    try {
      await suite(reporte);
    } catch (error) {
      reporte.verificar('la suite terminó sin errores', false, error.message);
    }
    reportes.push(reporte);
  }

  const todos = reportes.flatMap((r) => r.resultados);
  const fallas = todos.filter((r) => !r.ok);
  console.log(`\n${todos.length - fallas.length} de ${todos.length} verificaciones correctas${fallas.length ? ` · ${fallas.length} fallaron` : ''}.`);
  process.exitCode = fallas.length ? 1 : 0;
}

main();
