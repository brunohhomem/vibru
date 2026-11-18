import { describe, expect, it } from 'vitest';
import { bodasName } from './bodas';

describe('bodasName', () => {
  it('retorna papel no primeiro ano', () => {
    expect(bodasName(1)).toBe('Papel');
  });

  it('retorna couro no terceiro ano', () => {
    expect(bodasName(3)).toBe('Couro');
  });

  it('retorna prata nos 25 anos', () => {
    expect(bodasName(25)).toBe('Prata');
  });

  it('retorna ouro nos 50 anos', () => {
    expect(bodasName(50)).toBe('Ouro');
  });

  it('retorna diamante nos 60 anos', () => {
    expect(bodasName(60)).toBe('Diamante');
  });

  it('retorna null depois dos 60 anos', () => {
    expect(bodasName(61)).toBeNull();
  });

  it('retorna null para zero ou negativo', () => {
    expect(bodasName(0)).toBeNull();
    expect(bodasName(-1)).toBeNull();
  });
});
