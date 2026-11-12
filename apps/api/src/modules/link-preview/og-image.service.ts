import { lookup as dnsLookup } from 'node:dns';
import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import type { LookupAddress } from 'node:dns';
import type { LookupFunction } from 'node:net';
import { isBlockedAddress } from './blocked-address';
import { extractOgImageUrl } from './og-image';

const MAX_REDIRECTS = 3;
const MAX_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 3000;
const HEAD_END = /<\/head>/i;

export type OgImageOptions = {
  lookup?: LookupFunction;
  /** Só para o teste: troca o IP validado pelo do servidor local. */
  connectOverride?: (address: string) => string;
  timeoutMs?: number;
};

type FetchStep = { kind: 'page'; html: string } | { kind: 'redirect'; location: string } | null;

/** Lê o corpo até o fim do `<head>`; acima de 1 MB desiste (ADR 0003, 4.2). */
function readHead(response: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    response.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BYTES) {
        response.destroy();
        resolve(null);
        return;
      }

      chunks.push(chunk);
      const text = Buffer.concat(chunks).toString('utf8');
      const headEnd = text.search(HEAD_END);
      if (headEnd < 0) return;

      response.destroy();
      resolve(text.slice(0, headEnd));
    });
    response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    response.on('error', reject);
  });
}

/**
 * Busca o `og:image` de uma URL informada pelo membro, com proteção contra
 * SSRF: só `http` e `https`, todo endereço resolvido é conferido (inclusive a
 * cada redirect), a conexão vai ao IP já conferido (sem nova resolução de DNS
 * entre a checagem e a conexão), no máximo 3 redirects, 1 MB e 3 s. Qualquer
 * falha vira "sem imagem".
 */
export class OgImageService {
  private readonly lookup: LookupFunction;
  private readonly connectOverride: (address: string) => string;
  private readonly timeoutMs: number;

  constructor(options: OgImageOptions = {}) {
    this.lookup = options.lookup ?? (dnsLookup as LookupFunction);
    this.connectOverride = options.connectOverride ?? ((address) => address);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async findImageUrl(url: string): Promise<string | null> {
    try {
      return await this.follow(new URL(url), AbortSignal.timeout(this.timeoutMs));
    } catch {
      return null;
    }
  }

  private async follow(start: URL, signal: AbortSignal): Promise<string | null> {
    let current = start;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const step = await this.fetchOnce(current, signal);
      if (!step) return null;
      if (step.kind === 'page') return extractOgImageUrl(step.html, current.href);
      current = new URL(step.location, current);
    }

    return null;
  }

  private async fetchOnce(url: URL, signal: AbortSignal): Promise<FetchStep> {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const target = await this.resolveSafeAddress(url.hostname);
    if (!target) return null;

    return this.request(url, target, signal);
  }

  private async resolveSafeAddress(hostname: string): Promise<LookupAddress | null> {
    const host = hostname.replace(/^\[|\]$/g, '');
    const addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
      this.lookup(host, { all: true }, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result as unknown as LookupAddress[]);
      });
    });

    const first = addresses[0];
    if (!first || addresses.some((entry) => isBlockedAddress(entry.address))) return null;
    return first;
  }

  private request(url: URL, target: LookupAddress, signal: AbortSignal): Promise<FetchStep> {
    const address = this.connectOverride(target.address);
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) {
        callback(null, [{ address, family: target.family }]);
        return;
      }
      callback(null, address, target.family);
    };
    const client = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const request = client.request(
        url,
        { headers: { accept: 'text/html' }, lookup: pinnedLookup, signal },
        (response) => {
          const status = response.statusCode ?? 0;
          const location = response.headers.location;

          if (status >= 300 && status < 400 && location) {
            response.resume();
            resolve({ kind: 'redirect', location });
            return;
          }
          if (status < 200 || status >= 300) {
            response.resume();
            resolve(null);
            return;
          }
          readHead(response).then(
            (html) => resolve(html === null ? null : { kind: 'page', html }),
            reject,
          );
        },
      );
      request.on('error', reject);
      request.end();
    });
  }
}
