import type { AdminRequestStatus, AdminSpaceStatus } from './admin.service';

// Badge classes per status, shared by the admin pages
export function spaceStatusTone(status: AdminSpaceStatus): string {
  return { trial: 'ui-badge tono-azul', active: 'ui-badge tono-lima', read_only: 'ui-badge tono-crema', suspended: 'ui-badge tono-rojo' }[status];
}

export function requestStatusTone(status: AdminRequestStatus): string {
  return { new: 'ui-badge tono-crema', contacted: 'ui-badge tono-azul', converted: 'ui-badge tono-lima', discarded: 'ui-badge' }[status];
}

export function initialsOf(...parts: string[]): string {
  return parts.map((part) => part.trim().charAt(0)).join('').slice(0, 2).toUpperCase() || '?';
}
