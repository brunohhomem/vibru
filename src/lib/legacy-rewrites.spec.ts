import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

type RewriteRule = { source: string; destination: string };
type RewriteGroups = {
  beforeFiles?: RewriteRule[];
  afterFiles?: RewriteRule[];
  fallback?: RewriteRule[];
};

async function loadRewrites(): Promise<RewriteGroups> {
  const rewrites = await nextConfig.rewrites?.();
  if (!rewrites || Array.isArray(rewrites)) {
    throw new Error('rewrites deve ser um objeto com grupos explícitos (fallback)');
  }
  return rewrites;
}

describe('rewrites para a API legada', () => {
  it('só valem como fallback: rota do Next (inclusive dinâmica) sempre vence', async () => {
    const { beforeFiles = [], afterFiles = [], fallback = [] } = await loadRewrites();

    // `afterFiles` roda antes das rotas dinâmicas, então `/api/ics/[feedFile]` seria capturada.
    expect(beforeFiles).toEqual([]);
    expect(afterFiles).toEqual([]);
    expect(fallback).toHaveLength(1);
    expect(fallback[0]?.source).toMatch(/^\/api\//);
  });
});
