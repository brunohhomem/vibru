import type { MemberColor } from '@vibru/shared';

export type MemberColorClasses = {
  tile: string;
  onTile: string;
  strong: string;
};

/**
 * Único lugar que traduz a cor do membro em classes de token.
 * Componentes nunca escolhem cor por nome de pessoa (ADR 0003, seção 6).
 */
const MEMBER_COLOR_CLASSES: Record<MemberColor, MemberColorClasses> = {
  blue: {
    tile: 'bg-blue-tile',
    onTile: 'text-blue-on-tile',
    strong: 'bg-blue-strong',
  },
  purple: {
    tile: 'bg-purple-tile',
    onTile: 'text-purple-on-tile',
    strong: 'bg-purple-strong',
  },
};

export function memberColorClasses(color: MemberColor): MemberColorClasses {
  return MEMBER_COLOR_CLASSES[color];
}
