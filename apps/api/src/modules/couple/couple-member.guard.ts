import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { COUPLE_ERROR_CODES, type MemberColor } from '@vibru/shared';
import { CoupleRepository } from './couple.repository';
import { REQUIRES_COUPLE_KEY } from './decorators/requires-couple.decorator';

type AuthenticatedRequest = Request & {
  user: { userId: string };
  coupleMember?: { memberId: string; coupleId: string; color: MemberColor };
};

/**
 * Resolve o vínculo do usuário com o casal e o deixa disponível para
 * `@CurrentMember()`. É o padrão de acesso de todos os módulos de domínio.
 */
@Injectable()
export class CoupleMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly coupleRepository: CoupleRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresCouple = this.reflector.getAllAndOverride<boolean>(REQUIRES_COUPLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresCouple) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const member = await this.coupleRepository.findMembershipByUserId(request.user.userId);

    if (!member) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Sua conta não está ligada a um casal',
        code: COUPLE_ERROR_CODES.COUPLE_REQUIRED,
        requestId: '',
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    }

    request.coupleMember = {
      memberId: member.id,
      coupleId: member.coupleId,
      color: member.color,
    };

    return true;
  }
}
