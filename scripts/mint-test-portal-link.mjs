// Dev utility: mint a client portal magic link for a case without sending
// any email. Usage: node scripts/mint-test-portal-link.mjs <caseId>
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import crypto from "node:crypto";
const { default: pg } = await import("pg");

const caseId = process.argv[2];
if (!caseId) { console.error("Usage: node scripts/mint-test-portal-link.mjs <caseId>"); process.exit(1); }

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const c = await pool.query(`SELECT id, "firmId" FROM "RolloverCase" WHERE id = $1`, [caseId]);
if (!c.rows[0]) { console.error("Case not found"); process.exit(1); }
const u = await pool.query(`SELECT id FROM "User" WHERE "firmId" = $1 AND role = 'ADMIN' LIMIT 1`, [c.rows[0].firmId]);

const raw = crypto.randomBytes(32).toString("base64url");
const hash = crypto.createHash("sha256").update(raw).digest("hex");
const id = "cat_" + crypto.randomBytes(12).toString("hex");
const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000);
await pool.query(
  `INSERT INTO "ClientAccessToken" (id, "caseId", "firmId", "tokenHash", scope, "expiresAt", "issuedByUserId") VALUES ($1,$2,$3,$4,'FULL',$5,$6)`,
  [id, c.rows[0].id, c.rows[0].firmId, hash, expires, u.rows[0].id],
);
console.log(`http://localhost:3000/client/enter?token=${raw}`);
await pool.end();
