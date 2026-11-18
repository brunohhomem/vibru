import { auth } from '@/lib/auth';

// Lazy: o módulo é importado no next build, que não tem BETTER_AUTH_SECRET.
export function GET(request: Request): Promise<Response> {
  return auth.handler(request);
}

export function POST(request: Request): Promise<Response> {
  return auth.handler(request);
}
