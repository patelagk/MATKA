import { db } from '../db/mongo';
import { AuditEntityType, AuditLogDoc } from '../db/models';

export async function logAudit(
  actorId: string,
  action: string,
  entityType: AuditEntityType,
  entityId: string,
  metadata: Record<string, any> = {},
  actorEmail?: string
): Promise<AuditLogDoc> {
  const audit = await db.auditLogs.insertOne({
    actorId,
    actorEmail,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: new Date().toISOString()
  });

  return audit;
}
