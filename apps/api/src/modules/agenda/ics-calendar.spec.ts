import { describe, expect, it } from 'vitest';
import { buildIcsCalendar } from './ics-calendar';

const NOW = new Date('2026-11-06T12:30:45.123Z');

describe('buildIcsCalendar', () => {
  it('Título com caractere especial sai escapado', () => {
    const calendar = buildIcsCalendar(
      [{ uid: 'a@vibru', title: 'Jantar; bar, e\nvinho', date: '2026-12-10', time: null }],
      NOW,
    );

    expect(calendar).toContain('SUMMARY:Jantar\\; bar\\, e\\nvinho\r\n');
    expect(calendar).toContain('DTSTAMP:20261106T123045Z\r\n');
    expect(calendar).toContain('DTSTART;VALUE=DATE:20261210\r\n');
  });

  it('Linha longa é dobrada em até 75 octetos sem partir caractere', () => {
    const calendar = buildIcsCalendar(
      [{ uid: 'a@vibru', title: 'Aniversário '.repeat(20), date: '2026-12-10', time: '08:00' }],
      NOW,
    );

    const lines = calendar.split('\r\n');
    expect(lines.every((line) => Buffer.byteLength(line) <= 75)).toBe(true);
    expect(calendar.replace(/\r\n /g, '')).toContain('Aniversário '.repeat(20).trimEnd());
    expect(calendar).not.toContain('�');
  });
});
