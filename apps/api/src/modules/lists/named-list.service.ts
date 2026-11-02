import { Injectable } from '@nestjs/common';
import type { PharmacyResult } from '@vibru/shared';
import { ListsRepository } from './lists.repository';

/**
 * Atalho para outros módulos adicionarem um item a uma lista conhecida pelo
 * nome (ex.: "Farmácia"), criando a lista na primeira vez. O nome casa sem
 * diferenciar maiúsculas e acentos, para reaproveitar a lista que o casal já
 * criou à mão.
 */
@Injectable()
export class NamedListService {
  constructor(private readonly listsRepository: ListsRepository) {}

  async addItem(coupleId: string, listTitle: string, itemTitle: string): Promise<PharmacyResult> {
    const list = await this.findOrCreateList(coupleId, listTitle);

    const items = await this.listsRepository.listItemsByList(coupleId, list.id);
    const existing = items.find(
      (item) => item.checkedAt === null && normalize(item.title) === normalize(itemTitle),
    );
    if (existing) {
      return {
        list: { id: list.id, title: list.title },
        item: { id: existing.id, title: existing.title },
        alreadyListed: true,
      };
    }

    const created = await this.listsRepository.createItem({
      coupleId,
      listId: list.id,
      title: itemTitle,
    });
    await this.listsRepository.touch(coupleId, list.id, new Date());

    return {
      list: { id: list.id, title: list.title },
      item: { id: created.id, title: created.title },
      alreadyListed: false,
    };
  }

  private async findOrCreateList(
    coupleId: string,
    listTitle: string,
  ): Promise<{ id: string; title: string }> {
    const summaries = await this.listsRepository.listSummaries(coupleId);
    const found = summaries.find((summary) => normalize(summary.title) === normalize(listTitle));
    if (found) return { id: found.id, title: found.title };

    const created = await this.listsRepository.create({ coupleId, title: listTitle });
    return { id: created.id, title: created.title };
  }
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}
