// Tipos y textos del panel de plataforma. Los datos vienen de los servicios *-api de esta carpeta.

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
export interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  active: boolean;
  isAdmin: boolean;
  pending: boolean; // todavía no creó su contraseña
  lastLoginAt: string | null;
  createdAt: string;
  spaces: { id: number; name: string; slug: string; type: 'school' | 'academy'; role: string }[];
}

export interface AdminUserCounts {
  all: number;
  active: number;
  pending: number;
  inactive: number;
  team: number;
}

export interface AdminAuditEntry {
  id: number;
  action: string;
  entity: string;
  entityId: number;
  entityName: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  adminId: number;
  adminUsername: string;
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

export function spaceRoleLabel(role: string): string {
  return { director: 'Dirección', teacher: 'Docente', student: 'Estudiante', parent: 'Padre' }[role as 'director' | 'teacher' | 'student' | 'parent'] ?? role;
}
