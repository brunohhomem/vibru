type AppIconArtProps = {
  dimension: number;
};

/**
 * Desenho do ícone do app (ADR 0003, seção 6): quadrado arredondado roxo-escuro
 * com os dois círculos fortes, azul e roxo, se sobrepondo.
 */
export function AppIconArt({ dimension }: AppIconArtProps) {
  const circleSize = Math.round(dimension * 0.46);
  const sideOffset = Math.round(dimension * 0.15);
  const topOffset = Math.round(dimension * 0.27);

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#3B2F5C',
        borderRadius: Math.round(dimension * 0.22),
      }}
    >
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          left: sideOffset,
          top: topOffset,
          width: circleSize,
          height: circleSize,
          borderRadius: '50%',
          background: '#2F5FD0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          right: sideOffset,
          top: topOffset,
          width: circleSize,
          height: circleSize,
          borderRadius: '50%',
          background: '#7C3AED',
          opacity: 0.9,
        }}
      />
    </div>
  );
}
