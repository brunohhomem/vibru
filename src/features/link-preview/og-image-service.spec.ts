import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { LookupFunction } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OgImageService } from './og-image-service';

type Handler = (request: IncomingMessage, response: ServerResponse) => void;

const PUBLIC_ADDRESS = '93.184.216.34';
const PAGE_WITH_IMAGE =
  '<html><head><meta property="og:image" content="https://cdn.example.com/a.png"></head><body></body></html>';

function lookupTo(address: string): LookupFunction {
  return (_hostname, _options, callback) => {
    callback(
      null,
      [{ address, family: address.includes(':') ? 6 : 4 }] as never,
      undefined as never,
    );
  };
}

describe('OgImageService', () => {
  let server: http.Server;
  let handler: Handler;
  let port: number;

  beforeEach(async () => {
    handler = (_request, response) => response.end(PAGE_WITH_IMAGE);
    server = http.createServer((request, response) => handler(request, response));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function serviceResolvingTo(address: string): OgImageService {
    return new OgImageService({
      lookup: lookupTo(address),
      connectOverride: () => '127.0.0.1',
      timeoutMs: 1500,
    });
  }

  it('devolve o og:image de uma página pública', async () => {
    const service = serviceResolvingTo(PUBLIC_ADDRESS);
    expect(await service.findImageUrl(`http://site.example:${port}/`)).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('devolve null quando o host resolve para endereço bloqueado', async () => {
    const service = serviceResolvingTo('10.0.0.5');
    expect(await service.findImageUrl(`http://site.example:${port}/`)).toBeNull();
  });

  it('devolve null para esquema que não é http nem https', async () => {
    const service = serviceResolvingTo(PUBLIC_ADDRESS);
    expect(await service.findImageUrl('file:///etc/passwd')).toBeNull();
    expect(await service.findImageUrl('ftp://site.example/')).toBeNull();
  });

  it('segue um redirect e devolve a imagem da página final', async () => {
    handler = (request, response) => {
      if (request.url === '/start') {
        response.writeHead(302, { location: '/final' }).end();
        return;
      }
      response.end(PAGE_WITH_IMAGE);
    };
    const service = serviceResolvingTo(PUBLIC_ADDRESS);
    expect(await service.findImageUrl(`http://site.example:${port}/start`)).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('desiste depois de 3 redirects', async () => {
    handler = (_request, response) => {
      response.writeHead(302, { location: '/again' }).end();
    };
    const service = serviceResolvingTo(PUBLIC_ADDRESS);
    expect(await service.findImageUrl(`http://site.example:${port}/`)).toBeNull();
  });

  it('desiste quando o corpo passa de 1 MB sem fechar o head', async () => {
    handler = (_request, response) => {
      response.write('<html><head>');
      response.end('a'.repeat(1024 * 1024 + 10));
    };
    const service = serviceResolvingTo(PUBLIC_ADDRESS);
    expect(await service.findImageUrl(`http://site.example:${port}/`)).toBeNull();
  });
});
