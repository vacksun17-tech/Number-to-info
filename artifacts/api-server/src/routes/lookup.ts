import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, apiKeysTable } from "@workspace/db";

const router = Router();

const UPSTREAM_URL = "https://num-to-info.sauravsingh2111.workers.dev/lookup";

const REMOVE_FIELDS = new Set([
  "credit", "credits", "channel", "source", "author",
  "powered_by", "by", "dev", "developer",
]);

function stripCreditFields(data: Record<string, unknown>) {
  for (const field of REMOVE_FIELDS) {
    delete data[field];
    delete data[field.toUpperCase()];
    delete data[field.charAt(0).toUpperCase() + field.slice(1)];
  }
}

async function validateKey(keyName: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(apiKeysTable)
    .where(eq(apiKeysTable.name, keyName));

  if (!row) return false;
  if (row.status === "revoked") return false;
  if (row.expiresAt && row.expiresAt < new Date()) return false;
  return true;
}

// Format: GET /lookup?key=NAME&q=NUMBER
router.get("/lookup", async (req, res) => {
  const keyName = req.query["key"] as string | undefined;
  const number = req.query["q"] as string | undefined;

  if (!keyName) {
    res.status(401).json({ error: "Missing key. Use ?key=YOUR_KEY&q=NUMBER" });
    return;
  }

  if (!number || !/^\d{10,15}$/.test(number)) {
    res.status(400).json({ error: "Missing or invalid number. Use ?q=NUMBER (10-15 digits)" });
    return;
  }

  const valid = await validateKey(keyName);
  if (!valid) {
    res.status(403).json({ error: "Invalid or revoked key." });
    return;
  }

  try {
    const response = await fetch(`${UPSTREAM_URL}/${number}`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      res.status(response.status).json({ error: "Upstream lookup failed." });
      return;
    }

    const data = await response.json() as Record<string, unknown>;

    if (typeof data === "object" && data !== null) {
      stripCreditFields(data);
      data["owner"] = "@kihoerack";
      data["admin"] = "@YeuIin";
    }

    res.json(data);
  } catch {
    res.status(500).json({ error: "Service unavailable. Try again later." });
  }
});

export default router;
