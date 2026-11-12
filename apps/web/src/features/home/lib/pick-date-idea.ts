import type { Wish } from '@vibru/shared';

/**
 * Ideia de rolê da home: a aberta, sem plano, mais antiga. A escolha é fixa
 * para o bloco não trocar a cada render; concluir ou planejar abre a vez da próxima.
 */
export function pickDateIdea(wishes: Wish[]): Wish | undefined {
  return wishes
    .filter((wish) => wish.category === 'date_idea' && !wish.doneAt && !wish.plannedOn)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
}
