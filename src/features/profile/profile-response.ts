import type { UpdateProfileInput } from './schemas';

export type ProfileResponse = {
  email: string;
  fullName: string;
  cpf: string | null;
  phone: string | null;
};

export type ProfileRow = {
  email: string;
  fullName: string | null;
  cpf: string | null;
  phone: string | null;
};

export function buildProfileResponse(row: ProfileRow): ProfileResponse {
  return { email: row.email, fullName: row.fullName ?? '', cpf: row.cpf, phone: row.phone };
}

export type ProfileUpdates = { fullName?: string; cpf?: string; phone?: string };

/** Só o que veio no pedido: campo ausente nunca apaga o que já está gravado. */
export function buildProfileUpdates(input: UpdateProfileInput): ProfileUpdates {
  const updates: ProfileUpdates = {};
  if (input.fullName !== undefined) updates.fullName = input.fullName;
  if (input.cpf !== undefined) updates.cpf = input.cpf;
  if (input.phone !== undefined) updates.phone = input.phone;
  return updates;
}
