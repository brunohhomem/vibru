import { FilterChip } from '@/features/tasks/components/filter-chip';
import {
  GIFT_PRICE_FILTERS,
  giftPriceFilterLabel,
  type GiftPriceFilter,
} from '../lib/gift-price-filter';

type GiftPriceFiltersProps = {
  value: GiftPriceFilter;
  onChange: (filter: GiftPriceFilter) => void;
};

export function GiftPriceFilters({ value, onChange }: GiftPriceFiltersProps) {
  return (
    <div role="group" aria-label="Filtrar por preço" className="flex flex-wrap gap-2">
      {GIFT_PRICE_FILTERS.map((filter) => (
        <FilterChip key={filter} active={value === filter} onClick={() => onChange(filter)}>
          {giftPriceFilterLabel(filter)}
        </FilterChip>
      ))}
    </div>
  );
}
