/** O outro usuário do casal; nunca o próprio, mesmo que a lista traga duplicatas. */
export function findPartnerUserId(
  members: ReadonlyArray<{ userId: string }>,
  myUserId: string,
): string | null {
  const partner = members.find((member) => member.userId !== myUserId);
  return partner?.userId ?? null;
}
