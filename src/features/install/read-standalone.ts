/** Verdadeiro quando o Vibru roda como app instalado (e não numa aba do navegador). */
export function readStandalone(): boolean {
  // `navigator.standalone` só existe no Safari do iOS, que não expõe `display-mode`.
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}
