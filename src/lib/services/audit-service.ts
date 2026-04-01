import { AuditAction, EntityType } from "@/lib/types";
import { restCreate } from "@/lib/firebase/rest-helpers";

export async function writeAuditLog(params: {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  userId: string;
  userName: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}) {
  await restCreate("auditLog", {
    ...params,
    changes: params.changes || {},
    timestamp: new Date(),
  });
}
