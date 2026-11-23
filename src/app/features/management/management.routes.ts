import { Routes } from '@angular/router';
import { notSecretaryGuard } from '../../core/guards/session.guards';

// /:espacio/direccion/... y /:espacio/secretaria/... (solo en colegios). La secretaría no entra a lo marcado con soloDireccion.
const soloDireccion = { canActivate: [notSecretaryGuard] };
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', title: 'Resumen', loadComponent: () => import('../overview/overview.component').then((m) => m.OverviewComponent) },

  // Académico
  { path: 'academico/gestion', title: 'Gestión y periodos', loadComponent: () => import('./academics/academic-years/academic-year.component').then((m) => m.AcademicYearComponent) },
  { ...soloDireccion, path: 'academico/continuidad', title: 'Paso a la siguiente gestión', loadComponent: () => import('./academics/continuity/continuity.component').then((m) => m.ContinuityComponent) },
  { path: 'academico/paralelos', title: 'Grados y paralelos', loadComponent: () => import('./academics/class-groups/class-groups.component').then((m) => m.ClassGroupsComponent) },
  { path: 'academico/materias', title: 'Materias', loadComponent: () => import('./academics/subjects/subjects.component').then((m) => m.SubjectsComponent) },
  { path: 'academico/aulas', title: 'Aulas', loadComponent: () => import('./academics/classrooms/classrooms.component').then((m) => m.ClassroomsComponent) },
  { path: 'academico/asignaciones', title: 'Asignación docente', loadComponent: () => import('./academics/allocations/allocations.component').then((m) => m.AllocationsComponent) },
  { path: 'academico/horarios', title: 'Horarios', loadComponent: () => import('./academics/schedules/schedules.component').then((m) => m.SchedulesComponent) },

  // Personas
  { path: 'personas/carga-excel', title: 'Carga desde Excel', loadComponent: () => import('./people/imports/people-import.component').then((m) => m.PeopleImportComponent) },
  { path: 'personas/docentes', title: 'Docentes', loadComponent: () => import('./people/teachers.component').then((m) => m.TeachersComponent) },
  { path: 'personas/estudiantes', title: 'Estudiantes', loadComponent: () => import('./people/students.component').then((m) => m.StudentsComponent) },
  { path: 'personas/padres', title: 'Padres y tutores legales', loadComponent: () => import('./people/parents.component').then((m) => m.ParentsComponent) },
  { ...soloDireccion, path: 'personas/secretaria', title: 'Secretaría', loadComponent: () => import('./people/secretaries.component').then((m) => m.SecretariesComponent) },
  { path: 'personas/tarjetas', title: 'Tarjetas de acceso', loadComponent: () => import('./people/access-cards.component').then((m) => m.AccessCardsComponent) },
  { path: 'personas/inscripciones', title: 'Inscripciones', loadComponent: () => import('./people/enrollments.component').then((m) => m.EnrollmentsComponent) },

  // Asistencia
  { path: 'asistencia/estudiantes', title: 'Asistencia de estudiantes', loadComponent: () => import('./attendance/student-attendance.component').then((m) => m.StudentAttendanceComponent) },
  { path: 'asistencia/licencias', title: 'Licencias', loadComponent: () => import('./attendance/leave-requests.component').then((m) => m.LeaveRequestsComponent) },
  { ...soloDireccion, path: 'asistencia/personal', title: 'Asistencia del personal', loadComponent: () => import('./attendance/staff-attendance.component').then((m) => m.StaffAttendanceComponent) },
  { ...soloDireccion, path: 'asistencia/puntos-marcacion', title: 'Puntos de marcación', loadComponent: () => import('./attendance/time-clock-locations.component').then((m) => m.TimeClockLocationsComponent) },

  // Calificaciones
  { ...soloDireccion, path: 'calificaciones/escala', title: 'Escala y ponderación', loadComponent: () => import('./grades/grading-scale.component').then((m) => m.GradingScaleComponent) },
  { ...soloDireccion, path: 'calificaciones/periodos', title: 'Cierre de periodos', loadComponent: () => import('./grades/period-closing.component').then((m) => m.PeriodClosingComponent) },
  // A mark of a closed period, with its reason (direction and secretary)
  { path: 'calificaciones/correcciones', title: 'Corregir notas', loadComponent: () => import('./grades/grade-corrections.component').then((m) => m.GradeCorrectionsComponent) },
  { path: 'calificaciones/boletines', title: 'Boletines', loadComponent: () => import('./grades/report-cards.component').then((m) => m.ReportCardsComponent) },

  { path: 'reportes', pathMatch: 'full', redirectTo: 'reportes/rendimiento' },
  { path: 'reportes/rendimiento', title: 'Rendimiento académico', loadComponent: () => import('./reports/academic-performance.component').then((m) => m.AcademicPerformanceComponent) },
  { path: 'reportes/asistencia', title: 'Reporte de asistencia', loadComponent: () => import('./reports/attendance-report.component').then((m) => m.AttendanceReportComponent) },
  { ...soloDireccion, path: 'reportes/puntualidad', title: 'Puntualidad del personal', loadComponent: () => import('./reports/punctuality.component').then((m) => m.PunctualityComponent) },
  { path: 'comunicados', title: 'Comunicados', loadComponent: () => import('../announcements/announcements.component').then((m) => m.AnnouncementsComponent) },
  { ...soloDireccion, path: 'institucion', title: 'Datos de la institución', loadComponent: () => import('./institution/data/institution-details.component').then((m) => m.InstitutionDetailsComponent) },
  { ...soloDireccion, path: 'pagos', title: 'Pagos e historial', loadComponent: () => import('../payments/payments.component').then((m) => m.PaymentsComponent) },
  { path: 'institucion/jornada', title: 'Jornada escolar', loadComponent: () => import('./institution/workday/workday.component').then((m) => m.WorkdayComponent) },
  // A copy of all the school's data in one Excel (also during the 30 days of read-only after the contract)
  { ...soloDireccion, path: 'institucion/exportar', title: 'Exportar datos', loadComponent: () => import('./institution/export/export-data.component').then((m) => m.ExportDataComponent) },
  { ...soloDireccion, path: 'institucion/horario-laboral', title: 'Horario laboral', loadComponent: () => import('./institution/work-schedule/work-schedule.component').then((m) => m.WorkScheduleComponent) },
] satisfies Routes;
