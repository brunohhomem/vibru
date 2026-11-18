import type { NextConfig } from 'next';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

function readApiOrigin(): string {
  if (process.env.API_ORIGIN) return process.env.API_ORIGIN;

  const envFile = path.resolve(projectDirectory, '.env');
  if (!existsSync(envFile)) return 'http://localhost:3101';

  const match = /^API_ORIGIN=(.*)$/m.exec(readFileSync(envFile, 'utf8'));
  const value = match?.[1]?.trim();
  if (!value) return 'http://localhost:3101';
  return value;
}

const apiOrigin = readApiOrigin();

const nextConfig: NextConfig = {
  agentRules: false,
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      // Fallback: só o que nenhuma rota do Next atende vai para a API legada. Rewrite comum
      // (`afterFiles`) roda antes das rotas dinâmicas e engoliria `/api/ics/[feedFile]`.
      fallback: [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }],
    };
  },
};

export default nextConfig;
