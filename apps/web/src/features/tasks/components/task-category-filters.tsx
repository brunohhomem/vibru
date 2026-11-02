import { TASK_CATEGORIES, TASK_CATEGORY_LABELS, type TaskCategory } from '@vibru/shared';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FilterChip } from './filter-chip';

export const CATEGORY_ALL = 'all';

type TaskCategoryFiltersProps = {
  category: TaskCategory | typeof CATEGORY_ALL;
  showMedications: boolean;
  onCategoryChange: (category: TaskCategory | typeof CATEGORY_ALL) => void;
  onShowMedicationsChange: (show: boolean) => void;
};

export function TaskCategoryFilters({
  category,
  showMedications,
  onCategoryChange,
  onShowMedicationsChange,
}: TaskCategoryFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Categoria" className="flex flex-wrap gap-2">
        <FilterChip
          active={category === CATEGORY_ALL}
          onClick={() => onCategoryChange(CATEGORY_ALL)}
        >
          Todas as categorias
        </FilterChip>
        {TASK_CATEGORIES.map((item) => (
          <FilterChip key={item} active={category === item} onClick={() => onCategoryChange(item)}>
            {TASK_CATEGORY_LABELS[item]}
          </FilterChip>
        ))}
      </div>
      <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-card px-4">
        <Label htmlFor="show-medications">Mostrar remédios</Label>
        <Switch
          id="show-medications"
          checked={showMedications}
          onCheckedChange={onShowMedicationsChange}
        />
      </div>
    </div>
  );
}
