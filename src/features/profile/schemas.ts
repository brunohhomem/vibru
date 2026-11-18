import { z } from 'zod';

// O bundle de produção do browser reescreve o global `Buffer` do Node e a
// validação passa a lançar. TextEncoder existe nos dois lados.
function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export const passwordSchema = z
  .string()
  .min(10, 'A senha deve ter pelo menos 10 bytes')
  .max(72, 'A senha deve ter no máximo 72 bytes')
  .refine((value) => /[A-Za-z]/.test(value), 'A senha deve conter pelo menos uma letra')
  .refine((value) => /[0-9]/.test(value), 'A senha deve conter pelo menos um dígito')
  .refine((value) => utf8ByteLength(value) <= 72, 'A senha excede 72 bytes UTF-8');

export const fullNameSchema = z.string().trim().min(2).max(120);

export const phoneSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length === 10 || value.length === 11, 'Telefone inválido');

const CPF_LENGTH = 11;

function verifierDigit(digits: string, length: number): number {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += Number(digits.charAt(index)) * (length + 1 - index);
  }
  const rest = (sum * 10) % 11;
  return rest >= 10 ? 0 : rest;
}

function isValidCpf(cpf: string): boolean {
  return (
    verifierDigit(cpf, 9) === Number(cpf.charAt(9)) &&
    verifierDigit(cpf, 10) === Number(cpf.charAt(10))
  );
}

export const cpfSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length === CPF_LENGTH, 'CPF inválido')
  .refine((value) => !/^(.)\1+$/.test(value), 'CPF inválido')
  .refine(isValidCpf, 'CPF inválido');

export const updateProfileSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    cpf: cpfSchema.optional(),
    phone: phoneSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Pelo menos um campo deve ser fornecido',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual').max(72),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const resetPartnerPasswordSchema = z.object({ newPassword: passwordSchema });

// Campos opcionais do formulário: em branco passa; preenchido, valida como o servidor.
function blankable(schema: typeof cpfSchema) {
  return z.string().superRefine((value, context) => {
    if (value.replace(/\D/g, '').length === 0) return;
    const parsed = schema.safeParse(value);
    if (parsed.success) return;
    context.addIssue({
      code: 'custom',
      message: parsed.error.issues[0]?.message ?? 'Valor inválido',
    });
  });
}

export const optionalCpf = blankable(cpfSchema);
export const optionalPhone = blankable(phoneSchema);

export function contactPayload(cpf: string, phone: string): { cpf?: string; phone?: string } {
  const payload: { cpf?: string; phone?: string } = {};
  if (cpf.replace(/\D/g, '').length > 0) payload.cpf = cpf;
  if (phone.replace(/\D/g, '').length > 0) payload.phone = phone;
  return payload;
}
