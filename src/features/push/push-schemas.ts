import { z } from 'zod';

// Chaves em base64url: o navegador as entrega assim e o web-push as exige assim.
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_KEY_LENGTH = 200;
const MAX_ENDPOINT_LENGTH = 1000;

export const subscribePushSchema = z.object({
  // Serviços de push só usam https; recusar o resto barra um endereço apontando para dentro da rede.
  endpoint: z
    .string()
    .max(MAX_ENDPOINT_LENGTH)
    .refine((value) => value.startsWith('https://'), { message: 'Inscrição inválida.' }),
  keys: z.object({
    p256dh: z.string().max(MAX_KEY_LENGTH).regex(BASE64_URL_PATTERN, 'Inscrição inválida.'),
    auth: z.string().max(MAX_KEY_LENGTH).regex(BASE64_URL_PATTERN, 'Inscrição inválida.'),
  }),
});

export const unsubscribePushSchema = z.object({
  endpoint: z.string().max(MAX_ENDPOINT_LENGTH),
});

export type SubscribePushInput = z.infer<typeof subscribePushSchema>;
