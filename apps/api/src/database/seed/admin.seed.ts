import { getEnv } from '../../config/load-env';
import type { Env } from '../../config/env.schema';
import { buildDatabaseConfig } from '../database-config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { TablesRelationalConfig } from 'drizzle-orm';
import { Pool } from 'pg';
import { users } from '../../modules/auth/user.entity';
import { people } from '../../modules/people/person.entity';
import { systemSettings } from '../../modules/settings/system-setting.entity';
import { couples } from '../../modules/couple/couple.entity';
import { coupleMembers, type CoupleMemberRow } from '../../modules/couple/couple-member.entity';
import { and, eq } from 'drizzle-orm';
import { PasswordHasher } from '../../modules/auth/password-hasher';
import { randomBytes } from 'node:crypto';
import { daysBetween, todayInSaoPaulo } from '@vibru/shared';

type SeedDatabase = Pick<NodePgDatabase, 'select' | 'insert'>;

type SeedInputs = {
  adminDisplayName: string;
  partnerEmail: string;
  partnerDisplayName: string;
  datingStartedOn: string | null;
  marriedOn: string | null;
};

type PasswordChoice = {
  password: string;
  generated: boolean;
};

interface AdminSeedResult {
  adminCreated: boolean;
  adminEmail: string;
  partnerCreated: boolean;
  partnerEmail: string;
  coupleCreated: boolean;
  passwordGenerated?: string;
  partnerPasswordGenerated?: string;
  registrationEnabledValue: boolean;
}

/**
 * Semeia o casal: admin (azul), parceira (roxa) e o vínculo dos dois.
 * Idempotente: não sobrescreve senha, nome nem datas já gravados. Só roda via
 * CLI, nunca automaticamente em NODE_ENV=test.
 */
export async function seedAdmin<T extends TablesRelationalConfig>(
  db: NodePgDatabase<T>,
): Promise<AdminSeedResult> {
  const env = getEnv();
  const inputs = readSeedInputs(env);
  const isDevelopment = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
  const adminEmail = env.ADMIN_EMAIL.toLowerCase();
  const passwordHasher = new PasswordHasher();

  const result = await db.transaction(async (tx) => {
    const adminUser = await findUserByEmail(tx, adminEmail);
    const partnerUser = await findUserByEmail(tx, inputs.partnerEmail);

    const adminPassword = await resolvePassword(
      isDevelopment,
      passwordHasher,
      env.ADMIN_INITIAL_PASSWORD,
    );
    const partnerPassword = await resolvePassword(
      isDevelopment,
      passwordHasher,
      env.PARTNER_INITIAL_PASSWORD,
    );

    const admin =
      adminUser ??
      (await createSeedUser(tx, {
        email: adminEmail,
        role: 'admin',
        displayName: inputs.adminDisplayName,
        password: adminPassword.password,
        passwordHasher,
        mustChangePassword: !isDevelopment,
      }));

    const partner =
      partnerUser ??
      (await createSeedUser(tx, {
        email: inputs.partnerEmail,
        role: 'user',
        displayName: inputs.partnerDisplayName,
        password: partnerPassword.password,
        passwordHasher,
        mustChangePassword: !isDevelopment,
      }));

    const couple = await ensureCouple(tx, admin.id, partner.id, inputs);

    const adminMember = await ensureMember(tx, couple.id, {
      userId: admin.id,
      displayName: inputs.adminDisplayName,
      color: 'blue',
    });
    const partnerMember = await ensureMember(tx, couple.id, {
      userId: partner.id,
      displayName: inputs.partnerDisplayName,
      color: 'purple',
    });

    await ensureRegistrationDisabled(tx);

    if (!adminMember || !partnerMember) {
      throw new Error('Seed: falha ao criar os vínculos do casal');
    }

    return {
      adminCreated: !adminUser,
      adminEmail,
      partnerCreated: !partnerUser,
      partnerEmail: inputs.partnerEmail,
      coupleCreated: couple.created,
      passwordGenerated: adminPassword.generated ? adminPassword.password : undefined,
      partnerPasswordGenerated: partnerPassword.generated ? partnerPassword.password : undefined,
    };
  });

  const currentSetting = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, 'registration_enabled'))
    .limit(1);

  return {
    ...result,
    registrationEnabledValue: currentSetting[0] ? Boolean(currentSetting[0].value) : false,
  };
}

function readSeedInputs(env: Env): SeedInputs {
  const adminDisplayName = requireValue(env.ADMIN_DISPLAY_NAME, 'ADMIN_DISPLAY_NAME');
  const partnerEmail = requireValue(env.PARTNER_EMAIL, 'PARTNER_EMAIL').toLowerCase();
  const partnerDisplayName = requireValue(env.PARTNER_DISPLAY_NAME, 'PARTNER_DISPLAY_NAME');
  const datingStartedOn = env.COUPLE_DATING_STARTED_ON ?? null;
  const marriedOn = env.COUPLE_MARRIED_ON ?? null;

  if (partnerEmail === env.ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Seed: PARTNER_EMAIL precisa ser diferente de ADMIN_EMAIL');
  }

  if (datingStartedOn && marriedOn && daysBetween(datingStartedOn, marriedOn) < 0) {
    throw new Error('Seed: COUPLE_MARRIED_ON não pode ser antes de COUPLE_DATING_STARTED_ON');
  }

  const today = todayInSaoPaulo(new Date());
  for (const [name, value] of [
    ['COUPLE_DATING_STARTED_ON', datingStartedOn],
    ['COUPLE_MARRIED_ON', marriedOn],
  ] as const) {
    if (value && daysBetween(today, value) > 0) {
      throw new Error(`Seed: ${name} não pode estar no futuro`);
    }
  }

  return { adminDisplayName, partnerEmail, partnerDisplayName, datingStartedOn, marriedOn };
}

function requireValue(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`Seed: defina ${name} no .env para criar o casal`);
  return trimmed;
}

async function resolvePassword(
  isDevelopment: boolean,
  passwordHasher: PasswordHasher,
  explicitPassword: string | undefined,
): Promise<PasswordChoice> {
  if (isDevelopment) return { password: 'Admin@12345', generated: false };
  if (explicitPassword) return { password: explicitPassword, generated: false };

  const generated = randomBytes(18)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return { password: generated, generated: true };
}

async function findUserByEmail(tx: SeedDatabase, email: string) {
  const result = await tx.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? null;
}

async function createSeedUser(
  tx: SeedDatabase,
  data: {
    email: string;
    role: 'admin' | 'user';
    displayName: string;
    password: string;
    passwordHasher: PasswordHasher;
    mustChangePassword: boolean;
  },
) {
  const passwordHash = await data.passwordHasher.hash(data.password);
  const [user] = await tx
    .insert(users)
    .values({
      email: data.email,
      passwordHash,
      role: data.role,
      isActive: true,
      mustChangePassword: data.mustChangePassword,
      emailVerifiedAt: new Date(),
    })
    .returning();

  if (!user) throw new Error(`Seed: falha ao criar usuário ${data.email}`);

  await tx.insert(people).values({
    userId: user.id,
    fullName: data.displayName,
    cpf: null,
    phone: null,
  });

  return user;
}

async function ensureCouple(
  tx: SeedDatabase,
  adminUserId: string,
  partnerUserId: string,
  inputs: SeedInputs,
): Promise<{ id: string; created: boolean }> {
  const adminMembership = await findMembership(tx, adminUserId);
  const partnerMembership = await findMembership(tx, partnerUserId);

  if (adminMembership && partnerMembership) {
    if (adminMembership.coupleId !== partnerMembership.coupleId) {
      throw new Error('Seed: admin e parceira já pertencem a casais diferentes');
    }
    return { id: adminMembership.coupleId, created: false };
  }

  const existingId = adminMembership?.coupleId ?? partnerMembership?.coupleId;
  if (existingId) return { id: existingId, created: false };

  const [couple] = await tx
    .insert(couples)
    .values({
      datingStartedOn: inputs.datingStartedOn,
      marriedOn: inputs.marriedOn,
    })
    .returning({ id: couples.id });

  if (!couple) throw new Error('Seed: falha ao criar casal');
  return { id: couple.id, created: true };
}

async function findMembership(tx: SeedDatabase, userId: string): Promise<CoupleMemberRow | null> {
  const result = await tx
    .select()
    .from(coupleMembers)
    .where(eq(coupleMembers.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

async function ensureMember(
  tx: SeedDatabase,
  coupleId: string,
  data: { userId: string; displayName: string; color: 'blue' | 'purple' },
): Promise<CoupleMemberRow> {
  const existing = await tx
    .select()
    .from(coupleMembers)
    .where(and(eq(coupleMembers.coupleId, coupleId), eq(coupleMembers.userId, data.userId)))
    .limit(1);

  if (existing[0]) return existing[0];

  const result = await tx
    .insert(coupleMembers)
    .values({ coupleId, ...data })
    .returning();

  if (!result[0]) throw new Error(`Seed: falha ao criar membro ${data.color}`);
  return result[0];
}

async function ensureRegistrationDisabled(tx: SeedDatabase): Promise<void> {
  const existing = await tx
    .select({ key: systemSettings.key })
    .from(systemSettings)
    .where(eq(systemSettings.key, 'registration_enabled'))
    .limit(1);

  if (existing.length > 0) return;

  await tx.insert(systemSettings).values({ key: 'registration_enabled', value: false });
}

/**
 * Executa o seed via CLI (`pnpm db:seed`).
 * Não executa em NODE_ENV=test automaticamente.
 */
export async function runSeedCli(): Promise<void> {
  const env = getEnv();

  if (env.NODE_ENV === 'test') {
    console.log('Seed não roda automaticamente em NODE_ENV=test');
    process.exitCode = 0;
    return;
  }

  const config = buildDatabaseConfig(env);
  const pool = new Pool({
    ...config,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  const db = drizzle(pool);

  try {
    const result = await seedAdmin(db);

    if (result.adminCreated) {
      console.log(`Admin criado: ${result.adminEmail}`);
      if (result.passwordGenerated) {
        console.log(`Senha inicial do admin (apenas exibida uma vez): ${result.passwordGenerated}`);
      }
    }
    if (result.partnerCreated) {
      console.log(`Parceira criada: ${result.partnerEmail}`);
      if (result.partnerPasswordGenerated) {
        console.log(
          `Senha inicial da parceira (apenas exibida uma vez): ${result.partnerPasswordGenerated}`,
        );
      }
    }
    if (result.coupleCreated) console.log('Casal criado com os dois vínculos');
    console.log(`registration_enabled = ${result.registrationEnabledValue}`);
    process.exitCode = 0;
  } catch (error) {
    console.error('Erro no seed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

// O CLI `scripts/db-seed.ts` importa este módulo. Sem o guarda, as duas
// execuções correm juntas e a segunda inserção perde a corrida da unique.
function isDirectExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const normalized = entry.replace(/\\/g, '/');
  return (
    normalized.endsWith('/database/seed/admin.seed.ts') ||
    normalized.endsWith('/database/seed/admin.seed.js')
  );
}

if (isDirectExecution()) {
  void runSeedCli();
}
