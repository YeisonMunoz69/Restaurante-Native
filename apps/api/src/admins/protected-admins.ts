import type { Prisma } from '@prisma/client';

export function protectedAdminEmails(value?: string): Set<string> {
  return new Set((value ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean));
}

// Es el mismo bloqueo del mínimo de administradores en PostgreSQL.
export async function lockAdminRoleChanges(db: Prisma.TransactionClient) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(722022103)`;
}
