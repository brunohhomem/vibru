export type InstallMode = 'installed' | 'native-prompt' | 'ios-manual' | 'unavailable';

type InstallEnvironment = {
  userAgent: string;
  maxTouchPoints: number;
  isStandalone: boolean;
  hasNativePrompt: boolean;
};

// iPadOS 13+ se apresenta como Macintosh; só o toque o distingue de um Mac.
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/**
 * Decide o que o botão "Instalar app" faz neste aparelho:
 * - já instalado: some;
 * - Chrome/Edge/Android: o navegador entrega o convite e o botão o dispara;
 * - iPhone/iPad: o Safari não tem convite, então o botão mostra o passo a passo;
 * - o resto (ex.: Firefox no desktop): não há como instalar, o botão não aparece.
 */
export function decideInstallMode(environment: InstallEnvironment): InstallMode {
  if (environment.isStandalone) return 'installed';
  if (environment.hasNativePrompt) return 'native-prompt';
  if (isIosDevice(environment.userAgent, environment.maxTouchPoints)) return 'ios-manual';
  return 'unavailable';
}
