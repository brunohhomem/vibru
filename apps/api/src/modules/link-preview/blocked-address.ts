import { BlockList, isIP } from 'node:net';

const IPV4_BLOCKED: readonly [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const IPV6_BLOCKED: readonly [string, number][] = [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
];

const blockedRanges = new BlockList();
for (const [network, prefix] of IPV4_BLOCKED) blockedRanges.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of IPV6_BLOCKED) blockedRanges.addSubnet(network, prefix, 'ipv6');

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * Endereços que o servidor nunca busca ao ler o `og:image`: rede privada,
 * loopback, link-local (inclusive o metadata da nuvem) e multicast. Fecha o
 * SSRF do ADR 0003, seção 4.2. Endereço que nem é IP também é recusado.
 */
export function isBlockedAddress(address: string): boolean {
  const mapped = IPV4_MAPPED.exec(address)?.[1];
  if (mapped) return isBlockedAddress(mapped);

  const family = isIP(address);
  if (family === 4) return blockedRanges.check(address, 'ipv4');
  if (family === 6) return blockedRanges.check(address, 'ipv6');
  return true;
}
