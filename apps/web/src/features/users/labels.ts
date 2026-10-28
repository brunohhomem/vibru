import type { UserRole } from '@vibru/shared';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  user: 'Usuário',
};

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}
