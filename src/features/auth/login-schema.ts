import { z } from 'zod';

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 72;

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(MAX_EMAIL_LENGTH),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

/** Formato que as telas consomem para o usuário da sessão (sem papéis: todo usuário é `user`). */
export type AuthResponse = {
  user: {
    id: string;
    email: string;
    role: 'user';
    mustChangePassword: boolean;
    emailVerified: boolean;
  };
};
