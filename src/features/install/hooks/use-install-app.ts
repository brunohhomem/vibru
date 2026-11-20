import { useCallback, useSyncExternalStore } from 'react';
import { decideInstallMode, type InstallMode } from '../install-environment';

// O tipo do evento ainda não está no lib.dom do TypeScript (só Chromium dispara).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

// O navegador dispara o evento uma vez, às vezes antes de qualquer componente montar:
// o módulo escuta desde o carregamento e guarda o convite para o botão usar depois.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyListeners();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

// useSyncExternalStore exige um valor estável entre leituras: devolver texto
// (e não um objeto novo a cada chamada) evita renderizar em loop.
function readMode(): InstallMode {
  return decideInstallMode({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    isStandalone: readStandalone(),
    hasNativePrompt: deferredPrompt !== null,
  });
}

// No servidor não há aparelho para consultar; o botão só aparece depois da hidratação.
function readServerMode(): InstallMode {
  return 'unavailable';
}

export function useInstallApp() {
  const mode = useSyncExternalStore(subscribe, readMode, readServerMode);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    // O convite só pode ser usado uma vez, aceito ou não.
    deferredPrompt = null;
    notifyListeners();
    await prompt.prompt();
  }, []);

  return { mode, promptInstall };
}
