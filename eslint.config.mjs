import nextConfig from './config/eslint/next.mjs';

// legacy/ é referência temporária até a Fase 3 e não entra no lint.
const ignoredPaths = {
  ignores: ['legacy/**', 'config/eslint/fixtures/**'],
};

// error.tsx e global-error.tsx são Client Components por exigência do Next.
// O nome do arquivo é fixo, então a fronteira de *.client.tsx não cabe aqui.
const nextErrorBoundaries = {
  files: ['src/app/error.tsx', 'src/app/global-error.tsx'],
  rules: {
    'no-restricted-syntax': 'off',
  },
};

export default [ignoredPaths, ...nextConfig, nextErrorBoundaries];
