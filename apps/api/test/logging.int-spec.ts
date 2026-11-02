import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from './integration-setup';
import { redactPaths, REDACTED_FIELDS } from '../src/common/logging/logger-options';

describe('Logging', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('campos sensíveis são redigidos no log — password, token e cookie', () => {
    expect(redactPaths).toContain('req.headers.authorization');
    expect(redactPaths).toContain('req.headers.cookie');
    expect(redactPaths).toContain('res.headers["set-cookie"]');
    expect(redactPaths).toContain('req.body.password');
    expect(redactPaths).toContain('req.body.token');
    expect(redactPaths).toContain('req.body.refreshToken');
    expect(redactPaths).toContain('req.body.secret');
    expect(REDACTED_FIELDS).toBeDefined();
  });

  it('Corpo e resposta de /health/* não aparecem no log', () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const logger = pino({ redact: { paths: redactPaths, censor: REDACTED_FIELDS } }, stream);

    logger.info({
      req: {
        method: 'POST',
        url: '/api/health/members/1/medications',
        body: { name: 'Losartana', dosage: '50 mg' },
      },
      res: { statusCode: 201, body: { substance: 'Amendoim', title: 'Tomar Losartana 50 mg' } },
    });
    logger.info({ req: { url: '/api/tasks', body: { title: 'Tomar Losartana 50 mg' } } });

    const output = lines.join('');
    expect(output).not.toContain('Losartana');
    expect(output).not.toContain('Amendoim');
    expect(output).toContain(REDACTED_FIELDS);
  });
});
