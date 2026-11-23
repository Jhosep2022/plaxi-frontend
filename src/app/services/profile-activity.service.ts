import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type {
  Membership,
  SpaceRole,
  SpaceType,
} from '../core/models/space.model';
import type {
  ProfileIndicator,
  ProfileSpace,
} from '../core/models/profile.model';
import { environment } from '../../environments/environment';
import { fechaBolivia } from '../core/utils/bolivia-time';

interface ApiMembership {
  espacio: { id: number; slug: string; nombre: string; tipo: SpaceType };
  rol: SpaceRole;
  desde: string;
  puedeSalir: boolean;
  motivo: string;
}

// Numbers of the profile header, by role (the texts are set here)
type ApiIndicators =
  | {
      rol: 'docente';
      tipo: 'colegio';
      clases: number;
      estudiantes: number;
      porRevisar: number;
      puntualidad: number | null;
    }
  | {
      rol: 'docente';
      tipo: 'academia';
      cursos: number;
      estudiantes: number;
      sesionesDictadas: number;
      porRevisar: number;
    }
  | {
      rol: 'estudiante';
      aulas: number;
      progreso: number | null;
      asistencia: number | null;
      tareasPorEntregar: number;
    }
  | { rol: 'padre'; hijos: number; tareasPendientes: number; espacios: number }
  | {
      rol: 'direccion';
      estudiantes: number;
      docentesActivos: number;
      paralelos: number;
      materias: number;
    };

// Activity shown only on "Mi perfil": the header indicators of each role and "Mis espacios", from the API.
// It is separate from AccountProfileService so the side menu does not load it when the app opens.
@Injectable({ providedIn: 'root' })
export class ProfileActivityService {
  private http = inject(HttpClient);
  private readonly api = environment.API_URL;

  // ---------- Spaces ----------
  espacios(): Observable<ProfileSpace[]> {
    return this.http.get<ApiMembership[]>(`${this.api}/espacios`).pipe(
      map((lista) =>
        lista.map((m): ProfileSpace => ({
          espacioId: m.espacio.id,
          slug: m.espacio.slug,
          nombre: m.espacio.nombre,
          tipo: m.espacio.tipo,
          rol: m.rol,
          desde: fechaBolivia(m.desde),
          puedeSalir: m.puedeSalir,
          motivo: m.motivo,
        })),
      ),
    );
  }

  // Leaves an academy: the server removes the membership and its course enrollments
  salirDeEspacio(slug: string): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/espacios/${encodeURIComponent(slug)}/membresia`,
    );
  }

  // ---------- Header indicators (by the role in the active space) ----------
  indicadores(membresia: Membership): Observable<ProfileIndicator[]> {
    const url = `${this.api}/espacios/${encodeURIComponent(membresia.espacio.slug)}/indicadores`;
    return this.http
      .get<ApiIndicators>(url, { params: { rol: membresia.rol } })
      .pipe(map((i) => toIndicators(i, membresia.espacio.tipo === 'colegio')));
  }
}

const pct = (valor: number | null): string =>
  valor === null ? '—' : `${valor}%`;

function toIndicators(i: ApiIndicators, colegio: boolean): ProfileIndicator[] {
  switch (i.rol) {
    case 'docente':
      return i.tipo === 'colegio'
        ? [
            {
              label: 'Clases',
              valor: String(i.clases),
              detalle: 'asignadas esta gestión',
              tono: 'lima',
              ayuda: 'Materias y paralelos que dictas en la gestión activa.',
            },
            {
              label: 'Estudiantes',
              valor: String(i.estudiantes),
              detalle: 'en todas tus clases',
              tono: 'azul',
              ayuda: 'Suma de los estudiantes de cada una de tus clases.',
            },
            {
              label: 'Por revisar',
              valor: String(i.porRevisar),
              detalle: 'entregas de tareas',
              tono: 'crema',
              ayuda: 'Tareas entregadas que todavía no calificaste.',
            },
            {
              label: 'Puntualidad',
              valor: pct(i.puntualidad),
              detalle: 'entradas a tiempo',
              tono: 'lima',
              ayuda:
                'De tus marcaciones de entrada, cuántas fueron a tiempo. "—" si todavía no marcaste.',
            },
          ]
        : [
            {
              label: 'Cursos',
              valor: String(i.cursos),
              detalle: 'publicados y privados',
              tono: 'lima',
              ayuda: 'Todos los cursos de tu academia, publicados o no.',
            },
            {
              label: 'Estudiantes',
              valor: String(i.estudiantes),
              detalle: 'inscritos activos',
              tono: 'azul',
              ayuda:
                'Estudiantes con inscripción activa; cada uno cuenta una vez aunque esté en varios cursos.',
            },
            {
              label: 'Sesiones',
              valor: String(i.sesionesDictadas),
              detalle: 'en vivo dictadas',
              tono: 'crema',
              ayuda: 'Sesiones en vivo que ya terminaron.',
            },
            {
              label: 'Por revisar',
              valor: String(i.porRevisar),
              detalle: 'entregas de tareas',
              tono: 'lima',
              ayuda: 'Tareas entregadas que todavía no calificaste.',
            },
          ];
    case 'estudiante':
      return [
        colegio
          ? {
              label: 'Materias',
              valor: String(i.aulas),
              detalle: 'en tu paralelo',
              tono: 'lima',
              ayuda: 'Materias de tu paralelo en la gestión activa.',
            }
          : {
              label: 'Cursos',
              valor: String(i.aulas),
              detalle: 'inscritos',
              tono: 'lima',
              ayuda: 'Cursos de la academia en los que estás inscrito.',
            },
        {
          label: 'Mi progreso',
          valor: pct(i.progreso),
          detalle: 'del contenido visto',
          tono: 'azul',
          ayuda:
            'Promedio de lo que viste del contenido de cada materia o curso.',
        },
        {
          label: 'Asistencia',
          valor: pct(i.asistencia),
          detalle: colegio ? 'de tus clases' : 'de las sesiones en vivo',
          tono: 'lima',
          ayuda: colegio
            ? 'Clases a las que asististe. Las licencias no cuentan. "—" si todavía no hay registros.'
            : 'Sesiones en vivo terminadas a las que asististe. "—" si todavía no hubo ninguna.',
        },
        {
          label: 'Tareas',
          valor: String(i.tareasPorEntregar),
          detalle: 'por entregar',
          tono: 'crema',
          ayuda: 'Tareas abiertas que todavía no entregaste.',
        },
      ];
    case 'padre':
      return [
        {
          label: 'Hijos',
          valor: String(i.hijos),
          detalle: 'vinculados a tu cuenta',
          tono: 'lima',
          ayuda: 'Estudiantes de este colegio vinculados a ti.',
        },
        {
          label: 'Tareas',
          valor: String(i.tareasPendientes),
          detalle: 'pendientes de tus hijos',
          tono: 'crema',
          ayuda: 'Suma de las tareas que tus hijos todavía no entregaron.',
        },
        {
          label: 'Espacios',
          valor: String(i.espacios),
          detalle: 'a los que perteneces',
          tono: 'azul',
          ayuda: 'Colegios y academias donde tienes una cuenta.',
        },
      ];
    case 'direccion':
      return [
        {
          label: 'Estudiantes',
          valor: String(i.estudiantes),
          detalle: 'en la institución',
          tono: 'lima',
          ayuda: 'Fichas de estudiante registradas en el colegio.',
        },
        {
          label: 'Docentes',
          valor: String(i.docentesActivos),
          detalle: 'activos',
          tono: 'azul',
          ayuda: 'Docentes con ficha activa.',
        },
        {
          label: 'Paralelos',
          valor: String(i.paralelos),
          detalle: 'esta gestión',
          tono: 'crema',
          ayuda: 'Paralelos de la gestión activa.',
        },
        {
          label: 'Materias',
          valor: String(i.materias),
          detalle: 'en el plan',
          tono: 'lima',
          ayuda: 'Materias del plan de estudios.',
        },
      ];
  }
}
