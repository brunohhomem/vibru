import { createServer, type Server, type ServerResponse } from 'node:http';
import { lookup as dnsLookup } from 'node:dns';
import type { AddressInfo, LookupFunction } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { OgImageService } from '../src/modules/link-preview/og-image.service';

const PUBLIC_ADDRESS = '93.184.216.34';

/** Resolve `publico.test` para um IP público; o resto vai ao DNS de verdade. */
const fakePublicLookup: LookupFunction = (hostname, options, callback) => {
  if (hostname !== 'publico.test') {
    dnsLookup(hostname, options, callback);
    return;
  }
  if (options.all) {
    callback(null, [{ address: PUBLIC_ADDRESS, family: 4 }]);
    return;
  }
  callback(null, PUBLIC_ADDRESS, 4);
};

describe('Busca do og:image', () => {
  let server: Server;
  let port: number;
  let requests: string[];
  let respond: (path: string, res: ServerResponse) => void;

  beforeAll(async () => {
    server = createServer((req, res) => {
      requests.push(req.url ?? '');
      respond(req.url ?? '', res);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  afterEach(() => {
    requests = [];
  });

  requests = [];

  // Na conexão, o IP público validado é trocado pelo servidor local do teste.
  const viaLocalServer = () =>
    new OgImageService({ lookup: fakePublicLookup, connectOverride: () => '127.0.0.1' });

  it('Busca para IP interno não sai do servidor', async () => {
    respond = (_path, res) => res.end('<head><meta property="og:image" content="/x.jpg"></head>');

    const image = await new OgImageService().findImageUrl(`http://127.0.0.1:${port}/`);

    expect(image).toBeNull();
    expect(requests).toHaveLength(0);
  });

  it('Redirect para IP interno é bloqueado', async () => {
    respond = (_path, res) => {
      res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data' });
      res.end();
    };

    const image = await viaLocalServer().findImageUrl(`http://publico.test:${port}/produto`);

    expect(image).toBeNull();
    expect(requests).toEqual(['/produto']);
  });

  it('Mais de 3 redirects', async () => {
    respond = (path, res) => {
      res.writeHead(302, { location: `${path}x` });
      res.end();
    };

    const image = await viaLocalServer().findImageUrl(`http://publico.test:${port}/r`);

    expect(image).toBeNull();
    expect(requests).toHaveLength(4);
  });

  it('Resposta acima de 1 MB', async () => {
    respond = (_path, res) => {
      res.write('<head>');
      res.end('a'.repeat(1_100_000));
    };

    const image = await viaLocalServer().findImageUrl(`http://publico.test:${port}/grande`);

    expect(image).toBeNull();
  });

  it('Página válida', async () => {
    respond = (_path, res) =>
      res.end(
        '<html><head><title>Tênis</title><meta property="og:image" content="/fotos/tenis.jpg"></head><body></body></html>',
      );

    const image = await viaLocalServer().findImageUrl(`http://publico.test:${port}/tenis`);

    expect(image).toBe(`http://publico.test:${port}/fotos/tenis.jpg`);
  });
});
