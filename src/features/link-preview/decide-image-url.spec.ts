import { describe, expect, it } from 'vitest';
import { decideImageUrl } from './decide-image-url';

describe('decideImageUrl', () => {
  const current = { url: 'https://loja.example/produto' };

  it('a imagem informada à mão vence, inclusive apagar', () => {
    expect(decideImageUrl(current, { imageUrl: 'https://cdn.example/a.png' })).toEqual({
      kind: 'set',
      value: 'https://cdn.example/a.png',
    });
    expect(decideImageUrl(current, { imageUrl: null })).toEqual({ kind: 'set', value: null });
    expect(
      decideImageUrl(current, {
        imageUrl: 'https://cdn.example/a.png',
        url: 'https://outra.example',
      }),
    ).toEqual({ kind: 'set', value: 'https://cdn.example/a.png' });
  });

  it('só uma URL nova dispara a busca da imagem', () => {
    expect(decideImageUrl(current, { url: 'https://outra.example/produto' })).toEqual({
      kind: 'lookup',
      url: 'https://outra.example/produto',
    });
  });

  it('a mesma URL, ou nenhuma, mantém a imagem', () => {
    expect(decideImageUrl(current, { url: 'https://loja.example/produto' })).toEqual({
      kind: 'keep',
    });
    expect(decideImageUrl(current, {})).toEqual({ kind: 'keep' });
  });

  it('apagar a URL apaga a imagem', () => {
    expect(decideImageUrl(current, { url: null })).toEqual({ kind: 'set', value: null });
  });

  it('tarefa sem URL antes e URL agora busca a imagem', () => {
    expect(decideImageUrl({ url: null }, { url: 'https://loja.example/x' })).toEqual({
      kind: 'lookup',
      url: 'https://loja.example/x',
    });
  });
});
