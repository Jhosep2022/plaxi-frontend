import { Routes } from '@angular/router';

// /:espacio/direccion/... (solo existe en colegios)
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', title: 'Resumen', loadComponent: () => import('../overview/overview.component').then((m) => m.OverviewComponent) },

  // Académico
  { path: 'academico/gestion', title: 'Gestión y periodos', loadComponent: () => import('./academics/academic-years/academic-year.component').then((m) => m.AcademicYearComponent) },
  { path: 'academico/paralelos', title: 'Grados y paralelos', loadComponent: () => import('./academics/class-groups/class-groups.component').then((m) => m.ClassGroupsComponent) },
  { path: 'academico/materias', title: 'Materias', loadComponent: () => import('./academics/subjects/subjects.component').then((m) => m.SubjectsComponent) },
  { path: 'academico/aulas', title: 'Aulas', loadComponent: () => import('./academics/classrooms/classrooms.component').then((m) => m.ClassroomsComponent) },
  { path: 'academico/asignaciones', title: 'Asignación docente', loadComponent: () => import('./academics/allocations/allocations.component').then((m) => m.AllocationsComponent) },
  { path: 'academico/horarios', title: 'Horarios', loadComponent: () => import('./academics/schedules/schedules.component').then((m) => m.SchedulesComponent) },

  // Personas
  { path: 'personas/docentes', title: 'Docentes', loadComponent: () => import('./people/teachers.component').then((m) => m.TeachersComponent) },
  { path: 'personas/estudiantes', title: 'Estudiantes', loadComponent: () => import('./people/students.component').then((m) => m.StudentsComponent) },
  { path: 'personas/padres', title: 'Padres y tutores legales', loadComponent: () => import('./people/parents.component').then((m) => m.ParentsComponent) },
  { path: 'personas/inscripciones', title: 'Inscripciones', loadComponent: () => import('./people/enrollments.component').then((m) => m.EnrollmentsComponent) },

  // Asistencia
  { path: 'asistencia/estudiantes', title: 'Asistencia de estudiantes', loadComponent: () => import('./attendance/student-attendance.component').then((m) => m.StudentAttendanceComponent) },
  { path: 'asistencia/licencias', title: 'Licencias', loadComponent: () => import('./attendance/leave-requests.component').then((m) => m.LeaveRequestsComponent) },
  { path: 'asistencia/personal', title: 'Asistencia del personal', loadComponent: () => import('./attendance/staff-attendance.component').then((m) => m.StaffAttendanceComponent) },
  { path: 'asistencia/puntos-marcacion', title: 'Puntos de marcación', loadComponent: () => import('./attendance/time-clock-locations.component').then((m) => m.TimeClockLocationsComponent) },

  // Calificaciones
  { path: 'calificaciones/escala', title: 'Escala y ponderación', loadComponent: () => import('./grades/grading-scale.component').then((m) => m.GradingScaleComponent) },
  { path: 'calificaciones/periodos', title: 'Cierre de periodos', loadComponent: () => import('./grades/period-closing.component').then((m) => m.PeriodClosingComponent) },
  { path: 'calificaciones/boletines', title: 'Boletines', loadComponent: () => import('./grades/report-cards.component').then((m) => m.ReportCardsComponent) },

  { path: 'reportes', pathMatch: 'full', redirectTo: 'reportes/rendimiento' },
  { path: 'reportes/rendimiento', title: 'Rendimiento académico', loadComponent: () => import('./reports/academic-performance.component').then((m) => m.AcademicPerformanceComponent) },
  { path: 'reportes/asistencia', title: 'Reporte de asistencia', loadComponent: () => import('./reports/attendance-report.component').then((m) => m.AttendanceReportComponent) },
  { path: 'reportes/puntualidad', title: 'Puntualidad del personal', loadComponent: () => import('./reports/punctuality.component').then((m) => m.PunctualityComponent) },
  { path: 'comunicados', title: 'Comunicados', loadComponent: () => import('../announcements/announcements.component').then((m) => m.AnnouncementsComponent) },
  { path: 'institucion', title: 'Datos de la institución', loadComponent: () => import('./institution/data/institution-details.component').then((m) => m.InstitutionDetailsComponent) },
  { path: 'institucion/jornada', title: 'Jornada escolar', loadComponent: () => import('./institution/workday/workday.component').then((m) => m.WorkdayComponent) },
  { path: 'institucion/horario-laboral', title: 'Horario laboral', loadComponent: () => import('./institution/work-schedule/work-schedule.component').then((m) => m.WorkScheduleComponent) },
] satisfies Routes;
