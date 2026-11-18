import type { WishCategory } from '@vibru/shared';

// Função em vez de Record: a categoria `date_idea` não passa na regra de nomes
// do ESLint como chave de objeto (mesmo caminho do `bloodTypeLabel` na F4).
export function wishCategoryLabel(category: WishCategory): string {
  switch (category) {
    case 'movie':
      return 'Filme';
    case 'music':
      return 'Música';
    case 'travel':
      return 'Viagem';
    case 'together':
      return 'Fazer a dois';
    case 'date_idea':
      return 'Ideia de rolê';
    case 'other':
      return 'Outro';
  }
}
