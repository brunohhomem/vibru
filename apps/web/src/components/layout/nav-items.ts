import { CalendarDays, Gift, Home, ListChecks, ListTodo, type LucideIcon } from 'lucide-react';

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { href: '/app', label: 'Início', icon: Home },
  { href: '/app/tasks', label: 'Tarefas', icon: ListChecks },
  { href: '/app/lists', label: 'Listas', icon: ListTodo },
  { href: '/app/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/app/wishes', label: 'Desejos', icon: Gift },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
}
