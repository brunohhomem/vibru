import { describe, expect, it } from 'vitest';
import { findCoupleDateIssues, mergeCoupleDates } from './couple-dates';

const today = '2026-11-18';

describe('findCoupleDateIssues', () => {
  it('aceita datas passadas com o casamento depois do namoro', () => {
    expect(
      findCoupleDateIssues({ datingStartedOn: '2018-03-10', marriedOn: '2020-06-15' }, today),
    ).toEqual([]);
  });

  it('aceita casal sem nenhuma data', () => {
    expect(findCoupleDateIssues({ datingStartedOn: null, marriedOn: null }, today)).toEqual([]);
  });

  it('recusa início do namoro no futuro', () => {
    expect(findCoupleDateIssues({ datingStartedOn: '2026-11-19', marriedOn: null }, today)).toEqual(
      [{ field: 'datingStartedOn', message: 'O início do namoro não pode estar no futuro' }],
    );
  });

  it('recusa casamento no futuro', () => {
    expect(findCoupleDateIssues({ datingStartedOn: null, marriedOn: '2026-11-19' }, today)).toEqual(
      [{ field: 'marriedOn', message: 'O casamento não pode estar no futuro' }],
    );
  });

  it('aceita hoje como data válida', () => {
    expect(findCoupleDateIssues({ datingStartedOn: today, marriedOn: today }, today)).toEqual([]);
  });

  it('recusa casamento antes do início do namoro', () => {
    expect(
      findCoupleDateIssues({ datingStartedOn: '2020-06-15', marriedOn: '2018-03-10' }, today),
    ).toEqual([
      { field: 'marriedOn', message: 'O casamento não pode ser antes do início do namoro' },
    ]);
  });
});

describe('mergeCoupleDates', () => {
  const current = { datingStartedOn: '2018-03-10', marriedOn: '2020-06-15' };

  it('mantém tudo quando o patch é vazio (undefined não mexe)', () => {
    expect(mergeCoupleDates(current, {})).toEqual(current);
  });

  it('apaga só o casamento quando recebe null', () => {
    expect(mergeCoupleDates(current, { marriedOn: null })).toEqual({
      datingStartedOn: '2018-03-10',
      marriedOn: null,
    });
  });

  it('troca só o namoro quando recebe uma data', () => {
    expect(mergeCoupleDates(current, { datingStartedOn: '2019-01-01' })).toEqual({
      datingStartedOn: '2019-01-01',
      marriedOn: '2020-06-15',
    });
  });
});
