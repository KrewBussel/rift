/**
 * Read-only probe: what does the Wealthbox API return for opportunity
 * pipelines and stages? Uses the stored (encrypted) connection token.
 * Makes only GET requests — no writes to DB or Wealthbox.
 */
import { prisma } from "../src/lib/prisma";
import { openSecret } from "../src/lib/crypto";

const BASE = "https://api.crmworkspace.com/v1";

async function get(token: string, path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ACCESS_TOKEN: token, Accept: "application/json" },
  });
  if (!res.ok) return { __error: `${res.status} ${res.statusText}` };
  return res.json();
}

async function main() {
  const conn = await prisma.crmConnection.findFirst();
  if (!conn) {
    console.log("No CrmConnection row found.");
    return;
  }
  const token = openSecret({
    ciphertext: conn.encryptedToken,
    iv: conn.tokenIv,
    tag: conn.tokenTag,
  });

  const pipelines = await get(token, "/categories/opportunity_pipelines");
  console.log("=== /categories/opportunity_pipelines ===");
  console.log(JSON.stringify(pipelines, null, 2));

  const stages = await get(token, "/categories/opportunity_stages");
  console.log("\n=== /categories/opportunity_stages ===");
  console.log(JSON.stringify(stages, null, 2));

  const opps = (await get(token, "/opportunities?per_page=3")) as {
    opportunities?: unknown[];
  };
  console.log("\n=== /opportunities?per_page=3 (first opp, full shape) ===");
  console.log(JSON.stringify(opps.opportunities?.[0] ?? opps, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
