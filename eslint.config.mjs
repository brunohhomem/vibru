import nextConfig from './config/eslint/next.mjs';

// error.tsx e global-error.tsx são Client Components por exigência do Next.
// O nome do arquivo é fixo, então a fronteira de *.client.tsx não cabe aqui.
const nextErrorBoundaries = {
  files: ['src/app/error.tsx', 'src/app/global-error.tsx'],
  rules: {
    'no-restricted-syntax': 'off',
  },
};

export default [...nextConfig, nextErrorBoundaries];
