/**
 * Único arquivo que o Drizzle e as migrations conhecem. Cada feature declara
 * a tabela em seu próprio arquivo e a reexporta aqui.
 */
export { systemSettings } from './system-settings';
export type { SystemSetting, NewSystemSetting } from './system-settings';
export * from './auth-schema';
