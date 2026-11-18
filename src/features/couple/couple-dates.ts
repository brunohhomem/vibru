import { daysBetween } from '@vibru/shared';

export type CoupleDates = { datingStartedOn: string | null; marriedOn: string | null };
export type CoupleDatesPatch = { datingStartedOn?: string | null; marriedOn?: string | null };
export type CoupleDateIssue = { field: keyof CoupleDates; message: string };

// `null` apaga a data; `undefined` significa "não mexi nesse campo".
export function mergeCoupleDates(current: CoupleDates, patch: CoupleDatesPatch): CoupleDates {
  return {
    datingStartedOn:
      patch.datingStartedOn !== undefined ? patch.datingStartedOn : current.datingStartedOn,
    marriedOn: patch.marriedOn !== undefined ? patch.marriedOn : current.marriedOn,
  };
}

export function findCoupleDateIssues(dates: CoupleDates, today: string): CoupleDateIssue[] {
  const issues: CoupleDateIssue[] = [];

  if (dates.datingStartedOn && daysBetween(today, dates.datingStartedOn) > 0) {
    issues.push({
      field: 'datingStartedOn',
      message: 'O início do namoro não pode estar no futuro',
    });
  }

  if (dates.marriedOn && daysBetween(today, dates.marriedOn) > 0) {
    issues.push({ field: 'marriedOn', message: 'O casamento não pode estar no futuro' });
  }

  const marriedBeforeDating =
    dates.datingStartedOn &&
    dates.marriedOn &&
    daysBetween(dates.datingStartedOn, dates.marriedOn) < 0;
  if (marriedBeforeDating) {
    issues.push({
      field: 'marriedOn',
      message: 'O casamento não pode ser antes do início do namoro',
    });
  }

  return issues;
}
