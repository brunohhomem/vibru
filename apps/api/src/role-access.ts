import { Role } from '@vibru/shared';

export function isAdmin(role: Role): boolean {
  return role === Role.admin;
}
