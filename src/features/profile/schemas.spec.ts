import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  contactPayload,
  cpfSchema,
  optionalCpf,
  passwordSchema,
  phoneSchema,
  resetPartnerPasswordSchema,
  updateProfileSchema,
} from './schemas';

describe('cpfSchema', () => {
  it('aceita CPF válido, com ou sem máscara, e devolve só os dígitos', () => {
    expect(cpfSchema.parse('529.982.247-25')).toBe('52998224725');
    expect(cpfSchema.parse('52998224725')).toBe('52998224725');
  });

  it('recusa dígito verificador errado, tamanho errado e dígitos repetidos', () => {
    expect(cpfSchema.safeParse('529.982.247-24').success).toBe(false);
    expect(cpfSchema.safeParse('1234').success).toBe(false);
    expect(cpfSchema.safeParse('111.111.111-11').success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('aceita 10 e 11 dígitos e recusa o resto', () => {
    expect(phoneSchema.parse('(11) 98765-4321')).toBe('11987654321');
    expect(phoneSchema.parse('(11) 3456-7890')).toBe('1134567890');
    expect(phoneSchema.safeParse('12345').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('recusa senha curta, sem letra, sem dígito ou acima de 72 bytes', () => {
    expect(passwordSchema.safeParse('abc123').success).toBe(false);
    expect(passwordSchema.safeParse('1234567890123').success).toBe(false);
    expect(passwordSchema.safeParse('abcdefghijklm').success).toBe(false);
    expect(passwordSchema.safeParse(`a1${'x'.repeat(71)}`).success).toBe(false);
  });

  it('aceita senha com letra, dígito e pelo menos 10 caracteres', () => {
    expect(passwordSchema.safeParse('senha-forte-1').success).toBe(true);
  });
});

describe('updateProfileSchema', () => {
  it('exige pelo menos um campo', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });

  it('aceita só o telefone', () => {
    expect(updateProfileSchema.parse({ phone: '(11) 98765-4321' })).toEqual({
      phone: '11987654321',
    });
  });
});

describe('changePasswordSchema', () => {
  it('valida a nova senha e exige a atual', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'senha-forte-1' }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'curta1' }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'senha-forte-1' })
        .success,
    ).toBe(true);
  });
});

describe('resetPartnerPasswordSchema', () => {
  it('exige a senha atual de quem redefine e valida a nova', () => {
    expect(resetPartnerPasswordSchema.safeParse({ newPassword: 'senha-forte-1' }).success).toBe(
      false,
    );
    expect(
      resetPartnerPasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'curta1' }).success,
    ).toBe(false);
    expect(
      resetPartnerPasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'senha-forte-1' })
        .success,
    ).toBe(true);
  });
});

describe('campos opcionais do formulário', () => {
  it('CPF em branco passa; CPF preenchido inválido não', () => {
    expect(optionalCpf.safeParse('').success).toBe(true);
    expect(optionalCpf.safeParse('123').success).toBe(false);
  });

  it('contactPayload omite o que está em branco', () => {
    expect(contactPayload('', '')).toEqual({});
    expect(contactPayload('529.982.247-25', '')).toEqual({ cpf: '529.982.247-25' });
  });
});
