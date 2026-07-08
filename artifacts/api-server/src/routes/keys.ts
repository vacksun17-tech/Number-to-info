import { Router } from "express";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, apiKeysTable } from "@workspace/db";
import {
  CreateKeyBody,
  GetKeyParams,
  DeleteKeyParams,
  RevokeKeyParams,
  RestoreKeyParams,
} from "@workspace/api-zod";

const router = Router();

function formatKey(row: typeof apiKeysTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.ownerId ?? null,
    prefix: row.name, // prefix = name for display
    status: row.status,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

function computeStatus(row: typeof apiKeysTable.$inferSelect): "active" | "revoked" | "expired" {
  if (row.status === "revoked") return "revoked";
  if (row.expiresAt && row.expiresAt < new Date()) return "expired";
  return "active";
}

router.get("/keys", async (req, res) => {
  const rows = await db.select().from(apiKeysTable).orderBy(apiKeysTable.createdAt);
  res.json(rows.map((r) => ({ ...formatKey(r), status: computeStatus(r) })));
});

router.get("/keys/stats", async (req, res) => {
  const rows = await db.select().from(apiKeysTable);
  const now = new Date();
  let active = 0, revoked = 0, expired = 0;
  for (const r of rows) {
    if (r.status === "revoked") revoked++;
    else if (r.expiresAt && r.expiresAt < now) expired++;
    else active++;
  }
  res.json({ total: rows.length, active, revoked, expired });
});

router.post("/keys", async (req, res) => {
  const parsed = CreateKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { name, ownerId, expiresInDays } = parsed.data;
  const id = randomUUID();

  let expiresAt: Date | null = null;
  if (expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  // Check if name already exists
  const [existing] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.name, name));
  if (existing) {
    res.status(400).json({ error: `Key with name "${name}" already exists` });
    return;
  }

  const [row] = await db
    .insert(apiKeysTable)
    .values({ id, name, ownerId: ownerId ?? null, status: "active", expiresAt })
    .returning();

  // key = name itself
  res.status(201).json({ ...formatKey(row), status: computeStatus(row), key: row.name });
});

router.get("/keys/:id", async (req, res) => {
  const parsed = GetKeyParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, parsed.data.id));
  if (!row) { res.status(404).json({ error: "Key not found" }); return; }
  res.json({ ...formatKey(row), status: computeStatus(row) });
});

router.delete("/keys/:id", async (req, res) => {
  const parsed = DeleteKeyParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, parsed.data.id));
  if (!row) { res.status(404).json({ error: "Key not found" }); return; }

  await db.delete(apiKeysTable).where(eq(apiKeysTable.id, parsed.data.id));
  res.json({ success: true, message: "Key deleted" });
});

router.post("/keys/:id/revoke", async (req, res) => {
  const parsed = RevokeKeyParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, parsed.data.id));
  if (!existing) { res.status(404).json({ error: "Key not found" }); return; }

  const [row] = await db
    .update(apiKeysTable)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(apiKeysTable.id, parsed.data.id))
    .returning();
  res.json({ ...formatKey(row), status: computeStatus(row) });
});

router.post("/keys/:id/restore", async (req, res) => {
  const parsed = RestoreKeyParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, parsed.data.id));
  if (!existing) { res.status(404).json({ error: "Key not found" }); return; }

  const [row] = await db
    .update(apiKeysTable)
    .set({ status: "active", revokedAt: null })
    .where(eq(apiKeysTable.id, parsed.data.id))
    .returning();
  res.json({ ...formatKey(row), status: computeStatus(row) });
});

export default router;
