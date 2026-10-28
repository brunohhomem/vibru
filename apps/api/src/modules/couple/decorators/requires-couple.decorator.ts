import { SetMetadata } from '@nestjs/common';

export const REQUIRES_COUPLE_KEY = 'requiresCouple';

/**
 * Exige que o usuário autenticado tenha vínculo em `couple_members`.
 * O `CoupleMemberGuard` responde 403 `COUPLE_REQUIRED` quando não houver.
 */
export const RequiresCouple = () => SetMetadata(REQUIRES_COUPLE_KEY, true);
