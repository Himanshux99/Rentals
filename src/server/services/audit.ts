import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";

type Tx = Prisma.TransactionClient | typeof db;

export function audit(
  tx: Tx,
  e: { actorId: string; action: string; entity: string; entityId: string; before?: unknown; after?: unknown },
) {
  return tx.auditLog.create({
    data: {
      actorId: e.actorId,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId,
      before: (e.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (e.after ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
