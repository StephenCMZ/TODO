import crypto from "crypto"
import type { Request } from "express"
import { getDb } from "./db"
import { isEncryptionEnabled, encrypt, decrypt } from "./encryption"

const ENC_PREFIX = "enc:v1:"
const MAX_DETAILS_LENGTH = 500

/**
 * Log an audit entry for the current request.
 * Falls back to "system" when no authenticated user is present (e.g. register/login).
 */
export function audit(req: Request, action: string, details?: string | null, user?: { id: string; username: string } | null) {
  logAudit(
    user?.id ?? req.user?.id ?? null,
    user?.username ?? req.user?.username ?? "system",
    action,
    details ?? null,
    req.ip || ""
  )
}

/**
 * Audit writes are best-effort: a logging failure (e.g. DB locked/full) must
 * never fail the primary operation that produced the entry.
 */
export function logAudit(userId: string | null, username: string, action: string, details: string | null, ip: string) {
  try {
    const id = crypto.randomUUID()
    const now = Date.now()
    let storedDetails: string | null = null
    if (details) {
      const capped = details.length > MAX_DETAILS_LENGTH ? details.slice(0, MAX_DETAILS_LENGTH) + "…" : details
      storedDetails = isEncryptionEnabled() ? ENC_PREFIX + encrypt(capped) : capped
    }
    getDb()
      .prepare(
        "INSERT INTO audit_logs (id, user_id, username, action, details, ip, created) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(id, userId, username, action, storedDetails, ip || "", now)
  } catch (err) {
    console.error("audit log write failed:", err)
  }
}

function rowToAuditLog(row: any) {
  const raw = row.details
  let details: string | null = null
  if (raw) {
    details = isEncryptionEnabled() && raw.startsWith(ENC_PREFIX) ? decrypt(raw.slice(ENC_PREFIX.length)) : raw
  }
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    action: row.action,
    details,
    ip: row.ip,
    created: row.created,
  }
}

export function listAuditLogs(limit = 200, offset = 0, action?: string) {
  const db = getDb()
  const rows = action
    ? (db.prepare("SELECT * FROM audit_logs WHERE action = ? ORDER BY created DESC, rowid DESC LIMIT ? OFFSET ?").all(action, limit, offset) as any[])
    : (db.prepare("SELECT * FROM audit_logs ORDER BY created DESC, rowid DESC LIMIT ? OFFSET ?").all(limit, offset) as any[])
  return rows.map(rowToAuditLog)
}
