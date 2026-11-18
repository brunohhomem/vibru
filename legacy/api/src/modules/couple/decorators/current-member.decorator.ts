import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { MemberColor } from '@vibru/shared';

export type CurrentMemberContext = {
  memberId: string;
  coupleId: string;
  color: MemberColor;
};

export const CurrentMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentMemberContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.coupleMember;
  },
);
