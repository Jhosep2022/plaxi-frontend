# Plan de la plataforma QuizWiz

> Documento vivo: es la fuente de verdad del plan. Léelo antes de empezar cualquier tarea grande.
> Última actualización: 20 de octubre de 2026.

## 1. Qué es QuizWiz

Plataforma educativa con dos tipos de **espacio**:

- **Colegio**: institución completa con dirección, docentes, estudiantes y padres. Incluye paralelos, materias, horarios, asistencia por clase, marcación docente con QR y GPS, calificaciones con escala editable, comunicados, tareas y aulas virtuales.
- **Academia**: docente independiente con sus cursos, links de invitación, estudiantes, sesiones en vivo (enlaces de Meet o Zoom), quiz, tareas y notas.

Un usuario puede pertenecer a varios espacios, con un rol en cada uno: `direccion`, `docente`, `estudiante` o `padre`.

## 2. Estado actual (octubre de 2026)

- **Frontend**: Angular 22, standalone, signals y zoneless. Todo funciona con **datos mock** en memoria. Pruebas e2e propias (`npm run e2e`): 417 verificaciones en verde.
- **Hecho**: académico, horarios, asistencia, marcación, calificaciones, personas, reportes, institución, comunicados, tareas (colegio y academia), aulas virtuales, quiz, academia (cursos, invitaciones, catálogo, sesiones), perfil y acceso (login, registro en pasos, recuperar contraseña, solicitud de colegios).
- **Backend** (`plaxi-backend`): NestJS 12 + Drizzle + PostgreSQL. Fases 1 a 8 listas: base con RLS, autenticación, espacios, perfil, correos por SMTP, académico y personas (fichas con cuenta y activación por correo o carnet), horarios sin choques, asistencia por clase con licencias, marcación con QR + GPS, calificaciones con notas congeladas al cerrar e historial de cambios, aulas virtuales con contenido, quiz corregidos en el servidor y tareas, y la academia (cursos con link de invitación, inscripciones con aprobación, sesiones en vivo y avisos), comunicados con confirmación de lectura, reportes de la dirección e indicadores del perfil. 364 pruebas en verde (120 unitarias, 4 e2e y 240 contra PostgreSQL real). PostgreSQL local en el puerto 5433. Ver §5.6.

## 3. Decisiones de producto confirmadas

- **Registro público**: solo **estudiantes** y **docentes independientes**. El docente crea su academia al registrarse.
- **Colegios**: no se registran solos. Dejan una solicitud en `/auth/colegio` y el equipo de QuizWiz los da de alta junto con la cuenta de la dirección. La dirección registra luego a su gente desde Personas.
- **Administrador de la plataforma** (`RolPlataforma 'admin'`): rol aparte, por encima de todos los espacios, con panel en `/admin` (resumen, colegios, academias, usuarios, solicitudes, estado de prueba de cada espacio).
  - **Solo ve datos de gestión** (decidido el 24/10/2026): administra los espacios, pero no entra a notas, asistencia ni datos de estudiantes. No es miembro de ningún espacio.
  - Se crea solo desde el backend (`npm run admin`), nunca desde la página.
- **Cobro**: prueba gratis de 30 días y luego planes pagos para colegios y docentes. Precios, costo por usuario y márgenes se definen **al terminar el sistema** (estudio comercial).
- **Video**: ver §7.
- **Nombre de la app y dominio**: **pendiente**. "QuizWiz" es un nombre provisional. Hay que decidirlo antes del despliegue (fase 12) y del proyecto de marketing. Recomendación técnica: `app.<dominio>` para el frontend y `api.<dominio>` para el backend, bajo el mismo dominio, para que la cookie de sesión funcione sin trucos.

## 4. Límites (obligatorios)

### 4.1 Prueba gratis

| Espacio | Duración | Límites |
|---|---|---|
| Academia | 30 días | hasta **30 estudiantes**, **3 cursos** y **1 GB** de archivos |
| Colegio | 30 días (piloto acompañado) | hasta **~500 estudiantes** y **5 GB** de archivos |

- **Al vencer la prueba**: el espacio queda en **solo lectura**, con un aviso para elegir un plan.
- **Pruebas no convertidas**: sus archivos se borran **60 días después** de vencer. Se avisa por correo a los 30 días y 7 días antes.
- Los límites se ven y se administran desde el panel `/admin`.

### 4.2 Archivos

| Tipo | Límite |
|---|---|
| Imágenes (foto de perfil, portada de aula, logo) | **800 KB**, solo imágenes (ya aplicado en el frontend) |
| PDF y documentos de un tema | **20 MB** por archivo |
| Entrega de tarea | **10 MB** por archivo, hasta **3 archivos** por entrega |
| Video propio (futuro, solo planes pagos) | según el plan (§7) |
| Almacenamiento total por espacio | según la prueba (§4.1) o el plan pago |

- **Doble validación**: los límites se validan en el frontend (aviso inmediato) **y** en el backend (enlace firmado con tamaño y tipo máximos).
- **Cuota por espacio**: el backend guarda cuánto usa cada espacio y rechaza las subidas que excedan su cuota.

## 5. Arquitectura

### 5.1 Principios

- **Monolito modular**: un solo backend dividido en módulos (auth, academico, asistencia, calificaciones, aulas, tareas…), sin microservicios. Si crece, se escala horizontalmente: más copias del mismo backend detrás de un balanceador.
- **Backend sin estado**: la sesión va en un token JWT, no en la memoria del servidor. Así se pueden agregar servidores sin reescribir nada.
- **Multi-tenant con esquema compartido**: una sola base de datos y una columna `espacio_id` en cada tabla de datos del espacio. Ver §5.3.
- **Archivos fuera del servidor**: van a un almacenamiento de objetos (Cloudflare R2). Se suben directo desde el navegador con **enlaces firmados**.

### 5.2 Infraestructura — Etapa 0 (elegida: ~US$50 al mes)

| Pieza | Servicio | Costo aprox. (USD al mes) |
|---|---|---|
| Frontend Angular | Cloudflare Pages | 0 |
| DNS, SSL y protección contra ataques | Cloudflare (gratis) | 0 |
| Backend (Docker) | Droplet de DigitalOcean de 2 vCPU y 4 GB, región EE. UU. Este | 24 |
| Respaldo del droplet | DigitalOcean Backups | ~5 |
| Base de datos | PostgreSQL administrado de DigitalOcean (1 GB) | 15 |
| Archivos | Cloudflare R2 | 0 a 2 |
| Correos (SMTP) | SMTP de Amazon SES (o Brevo gratis al inicio) | 0 a 1 |
| Entorno de pruebas | Droplet chico | 6 |
| Dominio `.com` | — | ~1 |
| Monitoreo | UptimeRobot + Sentry (planes gratis) | 0 |
| **Total** | | **~50** |

Presupuesto disponible: hasta **500 Bs al mes**.

> **Tipo de cambio**: en Bolivia es dinámico; el 20 de octubre de 2026 estaba en **11,70 Bs por dólar**. Todos los costos de infraestructura se pagan en **USD**, así que hay que convertirlos con el tipo de cambio del día y revisarlo cada mes.
> - A 11,70: 500 Bs son **~US$43**. La etapa 0 completa (~US$50) cuesta **~585 Bs**.
> - Para quedar dentro de 500 Bs al inicio, el entorno de pruebas (US$6) puede ser un contenedor más en el mismo droplet, o encenderse solo cuando se use. Así la etapa 0 queda en **~US$44 (~515 Bs)**.
> - En el estudio comercial, los precios en Bs deben cubrir esta variación (precios en USD de referencia o revisión periódica).

**Despliegue**: GitHub Actions construye la imagen Docker, la publica en GHCR y la despliega en el droplet con docker compose. El frontend se publica solo en Cloudflare Pages con cada `git push`.

### 5.3 Multi-tenant: esquema compartido + `espacio_id`

Multi-tenant y multicliente son lo mismo: una sola instalación del sistema sirve a muchos clientes (los espacios). Las tres formas habituales de separarlos son:

| Estrategia | Cómo | ¿Para QuizWiz? |
|---|---|---|
| Base de datos por cliente | una base por colegio o academia | **No**: miles de academias son miles de bases que migrar y respaldar |
| Esquema por cliente | un esquema de PostgreSQL por espacio | **No**: un usuario pertenece a varios espacios (p. ej. docente en un colegio y dueño de su academia), las migraciones se repiten por cada esquema y el panel admin necesita consultas entre todos |
| **Esquema compartido** | una columna `espacio_id` en cada tabla | **Sí** |

Reglas:

- **Tablas globales** (sin `espacio_id`): `usuario`, `espacio`, `membresia (usuario_id, espacio_id, rol)`, `plan`, `suscripcion`, `solicitud_colegio`.
- **Tablas del espacio** (con `espacio_id`): todas las demás.
- **Índices**: van por `(espacio_id, …)`.
- **Contexto en cada petición**: el backend obtiene el `espacio_id` de la URL o el token, verifica que el usuario tenga membresía y filtra **siempre** por él.
- **Red de seguridad**: **Row Level Security (RLS)** de PostgreSQL. Aunque una consulta olvide el filtro, la base no devuelve datos de otro espacio.
- **Futuro**: si un colegio grande exige aislamiento físico, se le puede ofrecer una base dedicada como plan especial. No se diseña para eso ahora.

### 5.4 Etapas de crecimiento (USD al mes)

| Etapa | Usuarios activos | Infraestructura | Costo |
|---|---|---|---|
| 0 | hasta ~2.000 | 1 droplet de 4 GB + PostgreSQL de 1 GB | ~50 |
| 1 | ~5.000 a 10.000 | droplet de 8 GB + PostgreSQL de 4 GB | ~140 |
| 2 | ~30.000 | 2 droplets + balanceador + PostgreSQL con alta disponibilidad + Redis | ~300 a 420 |

- **Costo marginal**: una academia en prueba cuesta ~US$0,02 a 0,05 al mes y un colegio en prueba ~US$0,30 a 0,50. El límite real de la prueba gratis es la capacidad del servidor, no el dinero.
- **Cuándo pasar a la etapa 1**: con la CPU sostenida por encima del 70 %, la memoria por encima del 80 % o la base sin espacio.

### 5.5 Backend: framework

**Decidido (20 de octubre de 2026)**: **NestJS 12 (TypeScript) + PostgreSQL 17 + Drizzle ORM**, con validación de DTO por **class-validator**. El repositorio es `plaxi-backend`, al lado de `plaxi-frontend`. Comparación de frameworks en §9.

### 5.6 Arquitectura del backend

**Módulos** (monolito modular; ningún módulo toca las tablas de otro):
`comun` (base de datos, contexto del espacio, errores), `auth`, `espacios`, `personas`, `academico`, `horarios`, `asistencia`, `marcacion`, `calificaciones`, `aulas`, `quiz`, `tareas`, `academia`, `comunicados`, `perfil`, `archivos`, `admin`, `notificaciones`.

**Organización del código** (refactor del 24 de octubre de 2026; detalle en el README del backend):
- Un módulo por dominio y una carpeta por subdominio, cada una con su controlador, servicio, DTO (lo que entra) y tipos de respuesta (lo que sale).
- Cada error de negocio es una clase, declarada una sola vez en el `errores.ts` de su módulo.
- Constantes y reglas puras en sus propios archivos. Ningún GET escribe en la base.

**Revisión de código limpio** (25 de octubre de 2026, con el skill `clean-code`; las reglas quedaron en el README del backend):
- Nombres completos (sin variables de una letra), funciones de hasta ~30 líneas y hasta 3 parámetros además de `tx` y `ctx`.
- Sin flags ni booleanos ambiguos, y sin números sueltos: tiempos, vigencias y rangos en `comun/tiempo.ts`, `comun/limites.ts` y `comun/rangos.ts`.
- Formato automático con Prettier, verificado en `npm run lint`.
- Las reglas puras que salieron de los servicios tienen su prueba unitaria, y las pruebas contra la base prueban una idea cada una.

**Base de datos y multi-cliente**:
- **Nombres**: tablas y columnas en `snake_case`; en TypeScript, `camelCase` (opción `casing` de Drizzle).
- **Dos roles de PostgreSQL**:
  - `plaxi`: dueño de las tablas; ejecuta las migraciones (`DATABASE_URL_MIGRACIONES`).
  - `plaxi_app`: la API; sin privilegios de dueño, así que RLS siempre se le aplica (`DATABASE_URL`).
- **Políticas RLS**: cada tabla del espacio tiene `espacio_id = current_setting('app.espacio_id')` para leer y para escribir.
- **Contexto en cada petición**: todo acceso a datos del espacio pasa por `bd.enEspacio(espacioId, tx => …)`. Abre una transacción, fija `app.espacio_id` con `set_config(..., true)` y ejecuta la consulta. Sin contexto, las tablas del espacio no devuelven nada.
- **Panel `/admin`**: usa una conexión aparte con permiso para leer todos los espacios.
- **Pruebas de aislamiento**: corren contra un PostgreSQL real (Testcontainers) y verifican que un espacio nunca lea ni escriba datos de otro.

**Autenticación**:
- **Contraseñas** con argon2.
- **JWT de acceso** de 15 minutos + **refresh token** en cookie `httpOnly` de 30 días. Cada refresh token es una fila de `sesion_dispositivo`, que alimenta "Dónde iniciaste sesión" del perfil.
- **Dos niveles de rol**:
  - Roles por espacio, con un guard y la membresía.
  - El administrador de la plataforma (`usuario.es_admin`, `RolPlataforma 'admin'`), con `@SoloAdmin()`. Se verifica en la base en cada petición.
- **Límite de intentos** en login, registro y recuperación (`@nestjs/throttler`).

**API**:
- REST bajo `/api`: rutas globales (`/api/auth`, `/api/perfil`, `/api/admin`) y del espacio (`/api/espacios/:slug/...`).
- **Errores** siempre como `{ codigo, mensaje, campos? }`, con mensajes en español listos para mostrar.
- **Documentación OpenAPI** en `/api/docs`, solo en desarrollo.
- **Forma de los endpoints**: sigue los servicios del frontend, así que conectar es cambiar el mock por `HttpClient`.

**Correos por SMTP**:
- Se envían con **nodemailer por SMTP**, sin atarse a la API de un proveedor. Se cambia de proveedor solo cambiando las variables `SMTP_*`.
- **Producción**: el SMTP de Amazon SES (el más barato) o el de Brevo o Zoho. No usar un Gmail personal: tiene un límite diario bajo y los correos caen en spam.
- **Desarrollo**: **Mailpit** en docker compose atrapa todos los correos y los muestra en el navegador.

**Tareas programadas** (`@nestjs/schedule`): vencer pruebas y pasar el espacio a solo lectura, avisar antes del fin de la prueba, borrar archivos de pruebas no convertidas y limpiar sesiones.

**Datos de ejemplo**: el script de semilla carga los mismos datos que hoy usan los mocks del frontend (Colegio San José, Academia de María, Luis, Carla…). Crece en cada fase.

**Estrategia (decidida el 20 de octubre de 2026)**: **primero se termina TODO el backend** (todos los módulos y endpoints, con sus pruebas contra PostgreSQL real). **Después** se conecta el frontend, reemplazando los mocks módulo por módulo. Mientras tanto, el frontend sigue funcionando con sus mocks.

**Orden de construcción del backend**:
1. ✅ **Base**: Drizzle, migraciones, roles, RLS, `enEspacio`, formato de errores, semilla y pruebas de aislamiento.
2. ✅ **Auth, espacios, perfil y correos (SMTP)**. Detalle en §5.7.
3. ✅ **Académico y personas**. Detalle en §5.8.
4. ✅ **Horarios, asistencia y marcación**. Detalle en §5.9.
5. ✅ **Calificaciones**. Detalle en §5.10.
6. ✅ **Aulas, quiz y tareas**. Detalle en §5.11.
7. ✅ **Academia: cursos, invitaciones, inscripciones y sesiones**. Detalle en §5.12.
8. ✅ **Comunicados, reportes e indicadores del perfil**. Detalle en §5.13.
9. Archivos (R2) y tareas programadas. Pasa las fotos de la base a R2.
10. Panel de administración.

**Después del backend**:
11. Conectar el frontend: `HttpClient` + interceptor de token, servicios reales y e2e contra la API.
12. Despliegue a producción. Requiere el nombre y el dominio (ver §3).

### 5.7 Fase 2: autenticación, espacios, perfil y correos

- **Tablas globales**:
  - `usuario`, ampliada con los datos del perfil y las preferencias.
  - `sesion_dispositivo`: un refresh token por sesión, guardado como hash.
  - `token_recuperacion`: 1 hora, un solo uso.
  - `solicitud_colegio`.
- **Seguridad**:
  - Contraseñas con argon2id.
  - JWT de acceso de 15 minutos, guardado solo en memoria en el frontend.
  - Refresh token en cookie `httpOnly` de 30 días, con rotación. Reutilizar uno viejo cierra todas las sesiones del usuario.
  - Límite de intentos: login 5 por minuto, recuperar 3 cada 15 minutos, registro 5 por hora.
- **Guards**:
  - Sesión obligatoria, salvo `@Publico()`.
  - Guard de espacio: `:slug` → membresía → `{ usuarioId, espacioId, rol }`.
  - `@Roles(...)` por rol.
  - Un espacio en `solo_lectura` o `suspendido` no acepta escrituras: así se aplica el límite de la prueba.
- **Endpoints**:
  - `auth`: login, refresh, logout, registro, disponible, recuperar y restablecer, solicitudes-colegio.
  - `espacios`: mis espacios, crear academia, salir.
  - `perfil`: ver; editar personales, contacto, usuario, docente y emergencia; foto; clave; dispositivos; notificaciones; baja.
- **Correos**: nodemailer por SMTP (Mailpit en desarrollo), con plantillas de recuperar contraseña, bienvenida y solicitud de colegio recibida.
- **Cookie y CORS**: configurables por variables de entorno (`COOKIE_DOMINIO`, `COOKIE_SEGURA`, `FRONTEND_URL`) hasta tener dominio.
- **Contraseña de demostración**: los usuarios de la semilla usan `Demo2026!`, solo en desarrollo.
- **Pendiente para otras fases**: foto en R2 (9) e indicadores del perfil (8). El código de curso y el primer curso quedaron en la fase 7.

### 5.8 Fase 3: académico y personas (decisiones del 21 de octubre de 2026)

- **Ficha y cuenta**:
  - Cada persona del colegio tiene una **ficha** (`persona`, dentro del colegio, con RLS) y **siempre una cuenta** (`usuario`).
  - La dirección crea ambas juntas al registrarla en Personas. La cuenta nace **pendiente de activación**: tiene usuario, pero no contraseña.
  - Usuario automático `nombre.apellido` (con un número si ya existe).
  - Si la persona ya tiene cuenta (mismo correo), se vincula la existente: nunca hay cuentas duplicadas.
- **Dos formas de activar la cuenta**:
  1. **Correo**: invitación con un enlace para crear la contraseña (vence en 7 días).
  2. **Carnet**: "Activar mi cuenta" con usuario + CI + fecha de nacimiento. Pensado para que los padres activen la cuenta de sus hijos pequeños. Sirve solo para la primera activación y tiene límite de intentos.
  - Si alguien olvida la contraseña y no tiene correo, la **dirección reinicia el acceso** desde su ficha y se vuelve a activar con el carnet.
- **Correo opcional en la cuenta**: muchos estudiantes no tienen. Sigue siendo único cuando existe. Se entra con el usuario o con el correo.
- **Nombres y apellidos separados** (`nombres`, `primer_apellido`, `segundo_apellido`), para ordenar listas y boletines por apellido. La API devuelve también el nombre completo.
- **Varios roles por persona en el mismo espacio**, por ejemplo una docente que también es madre. La membresía pasa a ser única por usuario + espacio + rol.
- **Tablas del colegio**: `aula_fisica`, `paralelo`, `materia`, `asignacion`, `persona`, `inscripcion` (estudiante → paralelo por gestión, con control de cupo) y `vinculo` (padre → estudiante).
- **Permisos**:
  - La dirección escribe todo.
  - El docente solo lee lo que necesita: los estudiantes de sus paralelos.
  - El estudiante y el padre solo ven `yo` (su ficha, su paralelo y sus hijos).
- **Semilla del colegio**: se exporta desde los mocks del frontend con los mismos IDs.

### 5.9 Fase 4: horarios, asistencia y marcación (decisiones del 23 de octubre de 2026)

- **Tablas del colegio**: `jornada`, `clase_horario` (sin choques de docente ni de aula), `registro_asistencia`, `config_asistencia` (tolerancia de cada docente), `licencia`, `punto_marcacion` (con el secreto del QR, que nunca sale del servidor), `horario_laboral` y `marcacion`.
- **Pantalla del QR**: se abre con un **enlace secreto de pantalla** por punto, que la dirección genera y puede revocar. Así no queda abierta una sesión de la dirección en la PC o tablet del punto.
- **Corregir asistencia**: el docente puede editar la asistencia hasta **7 días atrás**; después, solo la dirección. Nunca se toma de fechas futuras.
- **Licencia aprobada**: los registros de esas fechas pasan solos a "licencia", y las clases que se tomen después dentro de esas fechas ya aparecen marcadas así.
- **Cambiar la jornada**: las clases que ya no caben se quitan, mostrando antes cuántas serán (`POST /jornada/previsualizar`).
- **Marcación** (ver abajo).

### 5.10 Fase 5: calificaciones (decisiones del 23 de octubre de 2026)

- **Cálculo** (igual que el frontend):
  - Promedio de las actividades de cada criterio, luego promedio ponderado entre criterios.
  - Si un criterio aún no tiene notas, su peso se reparte entre los demás (nota parcial).
  - Nota anual = promedio de los periodos. Una casilla vacía no cuenta.
- **Tablas**: `config_calificacion`, `criterio`, `actividad` (tareas y quiz crean la suya desde la fase 6), `nota`, `cierre_periodo`, `nota_final` (copia congelada) e `historial_nota`.
- **Notas congeladas al cerrar**: al cerrar un periodo se guarda una copia de la nota final de cada estudiante. El boletín de un periodo cerrado nunca cambia, aunque se modifiquen los pesos. Si la dirección reabre el periodo, la copia se vuelve a calcular al cerrarlo de nuevo.
- **Historial de cambios**: cada cambio de nota guarda quién la cambió, cuándo y de cuánto a cuánto. La dirección lo puede consultar.
- **Visibilidad**: el estudiante y el padre ven sus notas **apenas se cargan** (sin esperar el cierre).
- **Permisos**:
  - El docente solo carga en sus materias y con el periodo abierto.
  - La dirección cierra y reabre los periodos.
  - Con el periodo cerrado, nadie modifica notas.
- **Endpoints**: config, planilla, actividades, notas (en lote), progreso, cierres, notas por estudiante, boletín y centralizador por paralelo.

### 5.11 Fase 6: aulas, quiz y tareas (decisiones del 23 de octubre de 2026)

- **Aula virtual**:
  - **Colegio**: nace sola, una por clase (paralelo + materia de la gestión activa). Es de la clase, no del docente: si cambia el docente, el contenido queda.
  - **Academia**: cada curso es un aula. La fase 7 agrega los endpoints de cursos, catálogo e invitaciones; la tabla `aula` ya tiene sus campos.
  - **Quién puede qué**: el docente del aula edita, la dirección supervisa (solo lectura), y el estudiante y el padre ven lo publicado.
- **Estudiante = usuario**: en aulas, quiz y tareas el estudiante se identifica por su `usuarioId`, que sirve igual en el colegio y en la academia. En el colegio cada fila trae también su `personaId`, el id de la ficha que usa la planilla.
- **Contenido**:
  - Unidades y temas (lectura, video, PDF o enlace), ambos con borrador.
  - El estudiante no ve los borradores.
  - Una unidad con candado se abre cuando el estudiante completa todos los temas de la anterior. Mientras está bloqueada, solo se ven los títulos de sus temas.
  - Se puede copiar unidades a otros paralelos de la misma materia: llegan como borrador.
- **Quiz**:
  - **Intentos**: el docente elige cuántos (1 a 20, o 0 = ilimitados). **Cuenta el mejor intento.**
  - **Corrección**: las respuestas correctas nunca salen del servidor mientras el estudiante responde. Corrige el servidor; en la respuesta corta no importan las tildes ni las mayúsculas.
  - **Tiempo**: el servidor controla el tiempo, con 2 minutos de margen para la conexión. Un envío fuera de tiempo, o un intento abandonado, cuenta como enviado en blanco.
  - **Respuestas correctas al terminar**: el estudiante las ve recién cuando ya no le quedan intentos o el quiz cerró, y solo si el docente lo permite.
  - **Edición con respuestas**: si ya hay respuestas, no se agregan ni quitan preguntas. Si el docente corrige la respuesta correcta o el puntaje, todos los intentos se vuelven a corregir y la nota se actualiza.
- **Tareas**:
  - Estados: pendiente, entregada, **tarde**, revisada y no entregó.
  - Se aceptan entregas tardías, marcadas como "entregada tarde". Cada tarea puede desactivarlas con "no aceptar entregas tardías".
  - Una entrega revisada ya no se modifica.
  - Archivos: hasta 3 de 10 MB por entrega. Las entregas nuevas ya requieren archivos confirmados en R2/MinIO.
- **Notas**:
  - **Colegio**: un quiz o una tarea que "cuenta para la nota" crea su actividad en la planilla, con el criterio elegido. La nota del quiz (el mejor intento llevado a la escala) pasa al enviarlo. La de la tarea pasa al revisarla. Con el periodo cerrado, la nota no cambia.
  - **Academia**: la nota del curso sale de los quiz. Las tareas se revisan con un comentario.

### 5.12 Fase 7: academia (decisiones del 24 de octubre de 2026)

- **Cursos**: los crea el docente de la academia, cada uno con un código de invitación único en toda la plataforma (`ANG-7K2Q`). Regenerar el código invalida el link anterior. Las categorías son una lista fija por ahora.
- **Cómo entra un estudiante**:
  - Por el **link de invitación** (`/unirse/CODIGO`): la vista previa no pide sesión y sirve aunque el curso sea privado. Se resuelve con una función segura en la base (`curso_por_codigo`) sin abrir el aislamiento entre espacios.
  - Por el **catálogo**: solo los cursos públicos.
  - Con el **código al registrarse**: queda inscrito al crear su cuenta.
- **Inscripción**: si el curso pide aprobación, queda pendiente. Si no, queda activa al instante. El estudiante se suma a la academia si todavía no era miembro.
- **Primer curso**: el docente que crea su academia al registrarse ya sale con su primer curso.
- **Bajas**:
  - Si el docente quita a un estudiante, o el estudiante deja la academia, la inscripción queda de **baja**.
  - Sus datos (avance, quiz y entregas) se guardan **90 días**. Si vuelve antes, recupera todo. Pasado ese plazo los purga una tarea programada.
  - Quien fue rechazado puede volver a pedir.
- **Borrar un curso**: solo si no tiene estudiantes activos. Si los tiene, el docente los quita primero o pasa el curso a privado.
- **Avisos**:
  - Nueva tabla `notificacion` (la base de la campanita), con `/api/notificaciones` para listar los avisos y marcarlos como leídos.
  - Al aprobar una solicitud, el estudiante recibe un **aviso en la plataforma y un correo**.
  - Al rechazarla, recibe solo el aviso.
  - El docente recibe un aviso por cada solicitud nueva.
- **Límites de la prueba** (§4.1): hasta **3 cursos** y **30 estudiantes activos** por academia. Una solicitud pendiente cuenta recién cuando se aprueba. Quien ya es estudiante activo puede sumarse a otro curso sin ocupar un cupo nuevo.
- **Sesiones en vivo**:
  - Se entra desde 10 minutos antes hasta la hora de fin.
  - El enlace de la reunión solo se entrega al estudiante cuando pulsa "Unirme": así su asistencia siempre queda registrada.
  - El docente puede corregir la asistencia y agregar el enlace de la grabación, que el estudiante ve cuando la sesión terminó.

### 5.13 Fase 8: comunicados, reportes e indicadores (decisiones del 25 de octubre de 2026)

- **Comunicados** (solo colegios):
  - Los publican la dirección y los docentes. El docente solo escribe a padres y estudiantes, y solo de sus paralelos.
  - **Los destinatarios se guardan al publicar**: quien entra después a un paralelo no recibe los comunicados anteriores, y el alcance (leídos y confirmados) queda estable.
  - Cada destinatario lo marca como leído y, si se pidió, confirma "Enterado". La dirección y el autor ven quiénes faltan.
  - **Avisos**: todos llegan como aviso en la plataforma; **solo los importantes** llegan también por correo. Los dos respetan las preferencias de notificación de cada persona.
- **Reportes de la dirección**: se calculan en el servidor, para no mandar al navegador miles de registros.
  - Asistencia y puntualidad docente por rango de fechas (sin fechas, la última semana; máximo un año).
  - Rendimiento por periodo o anual, con las notas congeladas de los periodos cerrados. Un periodo abierto da notas provisionales.
- **Indicadores del perfil**: el backend da los números de cada rol; los textos los pone el frontend. Usan los mismos servicios que las pantallas, así siempre coinciden.

### 5.14 Fase 9: archivos, institución, tareas programadas y avisos (25 de octubre de 2026)

- **Archivos**: subida directa y descarga firmada con Cloudflare R2 en producción y MinIO en desarrollo. Fotos, logos, portadas, PDF de temas y entregas nuevas usan archivos confirmados. La cuota incluye reservas pendientes; una subida pendiente se puede cancelar. La descarga comprueba la relación con el recurso.
- **Datos históricos**: `bd:migrar-imagenes` convierte fotos y portadas guardadas como `data URL`. En la base local, tras aplicar las migraciones hasta `0020`, encontró 0 imágenes por convertir. Las URL externas se conservan.
- **Limpieza**: reservas pendientes vencen a las 24 horas; las canceladas liberan la cuota al instante y se limpian tras 24 horas para cubrir subidas tardías con URL firmada. Un archivo confirmado de un espacio se marca tras siete días sin referencia y se borra físicamente después de otros siete días si la segunda comprobación confirma que sigue libre. Las fotos de perfil confirmadas están excluidas. `bd:auditar-archivos` genera un informe de solo lectura; la base local informó 0 candidatos.
- **Institución y reportes**: nombre, SIE, niveles, contacto y logo; boletín y centralizador incluyen el encabezado institucional.
- **Programadas y avisos**: vencimiento y purga de pruebas, purga de bajas, limpieza, recordatorios de sesiones y resumen semanal. Avisos de tareas, revisiones, notas manuales y de quiz, asistencia, licencias, comunicados y solicitudes de academia respetan las preferencias.
- **Verificación**: los cambios de la fase se prueban con PostgreSQL y MinIO efímeros. La integración del frontend sigue en la fase 11 y la configuración de R2 de producción en la fase 12.

### 5.15 Fase 10: panel de administración (avance del 28 de octubre de 2026)

> Antes de la fase 11 se corrige la convención de idioma del código: identificadores, archivos, contratos nuevos y comentarios técnicos en inglés; textos destinados al usuario en español. El alcance de rutas y esquema persistido se resuelve en la sección «Corrección de idioma» de `sdd-fases-pendientes.md`.

- Se eligieron **límites por espacio** para cursos, estudiantes y almacenamiento, sin planes con nombre hasta el estudio comercial.
- El backend dispone de resumen, colegios y academias, solicitudes con alta, usuarios y registro de acciones. Los cambios administrativos se auditan; la desactivación corta el acceso de la cuenta incluso con un token vigente. Las cuentas de plataforma no pueden pertenecer a un espacio.
- Los límites personalizados se aplican a cursos y estudiantes de academias, estudiantes inscritos del colegio y archivos del espacio.
- El frontend incluye `/admin` con el mismo kit visual de la app: resumen, colegios, academias, solicitudes, usuarios, almacenamiento y registro. En esta fase usa datos mock, como el resto del frontend. Su conexión a la API real se hará en la fase 11.
- Se reservan para después del estudio comercial y del despliegue las áreas de planes/cobros y operación técnica. No se muestran cifras de consumo inventadas: la vista de almacenamiento indica que el consumo real está pendiente de conexión.

### Marcación (fase 4, detalle)

- **Marcación**: el servidor valida el punto, la distancia GPS, el código QR (cambia cada 30 s; se acepta el actual o el anterior), la secuencia (una entrada y una salida por día) y el estado según el horario laboral. La hora la pone siempre el servidor, en la zona horaria de Bolivia.

## 6. Almacenamiento: Cloudflare R2

- **Qué es**: almacenamiento de objetos **compatible con S3**. Se usa con el mismo SDK de AWS S3: buckets, objetos y enlaces firmados.
- **Qué se guarda**: imágenes, PDF, entregas de tareas, respaldos de la base y, en el futuro, videos.
- **Escala**: sin límite práctico. Se paga por GB guardado (~US$0,015 por GB al mes) y por operaciones. Las descargas no se cobran.
- **Plan gratis**: 10 GB, 1 millón de escrituras y 10 millones de lecturas al mes.

## 7. Video

- **Ahora**: los temas usan enlaces de YouTube (no listado) o Drive embebidos en el aula. El avance, los candados por unidad, los quiz y las notas solo cuentan dentro de QuizWiz. Ver el video fuera no aprueba nada.
- **Problema**: para los docentes independientes, un enlace de YouTube se puede compartir y el contenido pagado se filtra.
- **Futuro**: **video protegido** como función de los **planes pagos de academia**, con un servicio de streaming (Cloudflare Stream o Bunny Stream). El video solo se reproduce dentro de QuizWiz, con enlaces firmados que vencen y una marca de agua con el nombre del estudiante. El costo se traslada al plan: minutos almacenados y minutos vistos. Hay que cotizarlo en el estudio comercial.

## 8. Hoja de ruta

1. Panel de administración `/admin` (con estado de prueba y límites).
2. Páginas de términos de uso y política de privacidad. El texto legal final lo revisa un profesional.
3. Centro de notificaciones (campanita).
4. Revisión en celular: e2e a 390 px.
5. **Backend completo primero** (fases 1 a 10 de §5.6), después la conexión del frontend (fase 11) y el despliegue (fase 12). Fases 1 a 9 implementadas y migradas en desarrollo. La fase 10 está en desarrollo: rutas administrativas y pantallas mock; la conexión real del frontend sigue en la fase 11. El estado detallado y las fases 10 a 12 están en `docs/sdd-fases-pendientes.md`.
6. Proyecto de marketing (§10).
7. Estudio comercial: costos reales, precios de planes y márgenes.
8. Más adelante: quiz en vivo (WebSockets), video protegido, modo oscuro y pruebas unitarias.

## 9. Resumen de la recomendación de framework

| Opción | A favor | En contra |
|---|---|---|
| **NestJS** (elegido) | TypeScript como el frontend: se comparten tipos y DTO. Arquitectura con módulos, inyección de dependencias y decoradores **igual que Angular**. Poca memoria. WebSockets integrados para el quiz en vivo. Mucha gente en Bolivia sabe JavaScript/TypeScript. | Hay que cuidar la disciplina de tipos y las validaciones |
| Spring Boot (Java/Kotlin) | Muy robusto, con un ecosistema maduro | Consume más memoria (~400 a 700 MB por instancia), es más verboso y el arranque es más lento |
| Go | Rapidísimo, con muy poca memoria | Más lento para desarrollar una app con muchas pantallas de CRUD y menos herramientas listas |
| FastAPI | Muy productivo | Otro lenguaje; el ORM asíncrono y los tipos son menos sólidos en un dominio grande |
| Express | Simple | Sin estructura: en un monolito grande termina desordenado |

## 10. Proyecto de marketing (pendiente de plan)

Se hace con Claude, sin contratar a nadie. Alcance previsto:

- **Propuesta de valor** y mensajes por público: dirección de colegio, docente independiente, padres y estudiantes.
- **Landing page** con planes y llamadas a la acción.
- **Material de venta**: deck de presentación para colegios, PDF de una página y guion de la demo.
- **Videos**: guiones, storyboards y guías de grabación de pantalla. Claude escribe y planifica; la grabación y la edición las hace el equipo con herramientas simples.
- **Redes sociales**: calendario de contenido y textos para Facebook, Instagram, TikTok y LinkedIn.
- **Estrategia de lanzamiento**: colegios piloto, docentes embajadores y referidos.
