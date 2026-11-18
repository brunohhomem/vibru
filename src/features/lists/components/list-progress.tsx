type ListProgressProps = {
  total: number;
  checked: number;
};

export function ListProgress({ total, checked }: ListProgressProps) {
  const percent = total === 0 ? 0 : Math.round((checked / total) * 100);

  return (
    <div
      role="progressbar"
      aria-label="Progresso da lista"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={checked}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
    </div>
  );
}
