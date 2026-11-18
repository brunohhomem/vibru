import type { MemberColor } from '@vibru/shared';
import {
  findCoupleDateIssues,
  type CoupleDates,
  type CoupleDateIssue,
} from '@/features/couple/couple-dates';

type SeedUser = { id: string; displayName: string };

export type CoupleSeedPlan = {
  dates: CoupleDates;
  members: { userId: string; displayName: string; color: MemberColor }[];
};

const MEMBER_COLORS: MemberColor[] = ['blue', 'purple'];

function describeIssues(issues: CoupleDateIssue[]): string {
  return issues.map((issue) => `${issue.field}: ${issue.message}`).join('; ');
}

// Valida tudo antes de gravar: o seed nunca cria o casal pela metade.
export function planCoupleSeed(input: {
  users: SeedUser[];
  datingStartedOn: string | null;
  marriedOn: string | null;
  today: string;
}): CoupleSeedPlan {
  if (input.users.length !== MEMBER_COLORS.length) {
    throw new Error(
      `O seed do casal precisa de exatamente 2 usuários (recebeu ${input.users.length})`,
    );
  }

  const dates = { datingStartedOn: input.datingStartedOn, marriedOn: input.marriedOn };
  const issues = findCoupleDateIssues(dates, input.today);
  if (issues.length > 0)
    throw new Error(`Datas do casal inválidas no seed: ${describeIssues(issues)}`);

  return {
    dates,
    members: input.users.map((seedUser, index) => ({
      userId: seedUser.id,
      displayName: seedUser.displayName,
      color: MEMBER_COLORS[index]!,
    })),
  };
}
