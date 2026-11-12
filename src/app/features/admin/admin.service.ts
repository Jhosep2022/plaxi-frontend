import { Injectable, computed, signal } from '@angular/core';
import { MOCK_ESPACIOS as MOCK_SPACES, MOCK_MEMBRESIAS as MOCK_MEMBERSHIPS, MOCK_PERFILES as MOCK_PROFILES } from '../../mocks/mock-data';
import { MOCK_ADMIN, MOCK_SOLICITUDES_COLEGIO as MOCK_SCHOOL_REQUESTS } from '../../mocks/auth.mock';
import type { SchoolRequestStatus as LegacyRequestStatus } from '../../core/models/auth.model';
import type { ProfileDto } from '../../models/profile.dto';

export type AdminSpaceStatus = 'active' | 'read_only' | 'suspended';
export type AdminSpacePlan = 'free' | 'paid'; // academies only; schools are always paid
export type AdminRequestStatus = 'new' | 'contacted' | 'converted' | 'discarded';
export interface AdminSpace {
  id: number;
  slug: string;
  name: string;
  type: 'school' | 'academy';
  status: AdminSpaceStatus;
  plan: AdminSpacePlan;
  limits: { courses: number | null; students: number | null; storageGb: number }; // null = no limit
  memberCount: number;
}
export interface AdminSchoolRequest {
  id: number;
  school: string;
  city: string;
  contact: string;
  role: string;
  email: string;
  phone: string;
  students: number;
  message: string;
  createdAt: string;
  status: AdminRequestStatus;
}
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  isAdmin: boolean;
  pending: boolean;
}
export interface AdminAuditEntry {
  id: number;
  createdAt: string;
  action: string;
  entity: string;
  details: string;
}

const INITIAL_SPACES: AdminSpace[] = MOCK_SPACES.map((space) => ({
  id: space.id,
  slug: space.slug,
  name: space.nombre,
  type: space.tipo === 'colegio' ? 'school' : 'academy',
  status: 'active',
  plan: space.tipo === 'colegio' ? 'paid' : 'free',
  limits: space.tipo === 'academia'
    ? { courses: 3, students: 10, storageGb: 1 }
    : { courses: null, students: 500, storageGb: 5 },
  memberCount: MOCK_MEMBERSHIPS.filter((membership) => membership.espacioId === space.id).length,
}));

const INITIAL_REQUESTS: AdminSchoolRequest[] = MOCK_SCHOOL_REQUESTS.map((request) => ({
  id: request.id,
  school: request.colegio,
  city: request.ciudad,
  contact: request.contacto,
  role: request.cargo,
  email: request.correo,
  phone: request.telefono,
  students: request.estudiantes,
  message: request.mensaje,
  createdAt: request.fecha,
  status: requestStatusFromLegacy(request.estado),
}));

function toAdminUser(profile: ProfileDto): AdminUser {
  return {
    id: profile.idUsuario,
    username: profile.username,
    email: profile.gmail,
    firstName: profile.nombre,
    lastName: profile.primerApellido,
    active: profile.status,
    isAdmin: profile.isAdmin ?? false,
    pending: profile.pending ?? false,
  };
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  readonly spaces = signal<AdminSpace[]>(INITIAL_SPACES);
  readonly requests = signal<AdminSchoolRequest[]>(INITIAL_REQUESTS);
  readonly users = signal<AdminUser[]>([MOCK_ADMIN, ...MOCK_PROFILES].map(toAdminUser));
  readonly auditEntries = signal<AdminAuditEntry[]>([]);
  readonly summary = computed(() => ({
    schools: this.spaces().filter((space) => space.type === 'school').length,
    academies: this.spaces().filter((space) => space.type === 'academy').length,
    newRequests: this.requests().filter((request) => request.status === 'new').length,
    suspendedSpaces: this.spaces().filter((space) => space.status === 'suspended').length,
  }));

  updateSpace(id: number, change: Partial<Pick<AdminSpace, 'status' | 'plan' | 'limits'>>, reason: string): void {
    const current = this.spaces().find((space) => space.id === id);
    if (!current || !reason.trim()) return;
    this.spaces.update((spaces) => spaces.map((space) => space.id === id ? { ...space, ...change } : space));
    this.recordAction('Espacio actualizado', current.name, reason);
  }

  spacesForUser(id: number): { name: string; role: string }[] {
    return MOCK_MEMBERSHIPS.filter((membership) => membership.usuarioId === id).map((membership) => ({
      name: this.spaces().find((space) => space.id === membership.espacioId)?.name ?? 'Espacio',
      role: { direccion: 'director', docente: 'teacher', estudiante: 'student', padre: 'parent' }[membership.rol],
    }));
  }

  resendInvitation(id: number): boolean {
    const user = this.users().find((entry) => entry.id === id);
    if (!user || user.isAdmin || !user.pending || !user.email) return false;
    this.recordAction('Invitación simulada', user.username, 'Pendiente de conexión con la API');
    return true;
  }

  changeUserActive(id: number, active: boolean, reason: string): void {
    const current = this.users().find((user) => user.id === id);
    if (!current || current.isAdmin || !reason.trim()) return;
    this.users.update((users) => users.map((user) => user.id === id ? { ...user, active } : user));
    this.recordAction(active ? 'Cuenta reactivada' : 'Cuenta desactivada', current.username, reason);
  }

  private recordAction(action: string, entity: string, details: string): void {
    this.auditEntries.update((entries) => [{ id: Date.now(), createdAt: new Date().toISOString(), action, entity, details }, ...entries]);
  }
}

export function spaceStatusLabel(status: AdminSpaceStatus): string {
  return { active: 'Activo', read_only: 'Solo lectura', suspended: 'Suspendido' }[status];
}

export function spacePlanLabel(plan: AdminSpacePlan): string {
  return { free: 'Gratis', paid: 'Pagado' }[plan];
}

export function requestStatusLabel(status: AdminRequestStatus): string {
  return { new: 'Nueva', contacted: 'Contactado', converted: 'Convertido', discarded: 'Descartado' }[status];
}

function requestStatusFromLegacy(status: LegacyRequestStatus): AdminRequestStatus {
  return ({ nueva: 'new', contactado: 'contacted', convertido: 'converted', descartado: 'discarded' } as const)[status];
}

export function spaceRoleLabel(role: string): string {
  return { director: 'Dirección', teacher: 'Docente', student: 'Estudiante', parent: 'Padre' }[role as 'director' | 'teacher' | 'student' | 'parent'] ?? role;
}
