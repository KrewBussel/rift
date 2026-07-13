/**
 * Verifies the paperwork-QA scanner's Bedrock setup end to end.
 *
 * Run:  npx tsx scripts/check-bedrock.ts
 *
 * Makes one tiny test request (no client data) using the same credentials,
 * region, and model ID the scanner uses (src/lib/documentReview.ts), and
 * prints exactly what's wrong if anything is.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";

const MODEL = process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-opus-4-8";
const REGION = process.env.BEDROCK_REGION ?? process.env.AWS_REGION;

async function main() {
  console.log(`Model:  ${MODEL}`);
  console.log(`Region: ${REGION}`);

  if (!REGION) {
    console.log("\n❌ No region set. Add AWS_REGION (or BEDROCK_REGION) to .env.local.");
    process.exit(1);
  }

  const client = new AnthropicBedrockMantle({
    awsRegion: REGION,
    awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 32,
      messages: [{ role: "user", content: "Reply with the single word: ready" }],
    });
    if (!res || !Array.isArray(res.content)) {
      console.log("\n⚠️ Unexpected response shape from Bedrock:");
      console.log(JSON.stringify(res, null, 2).slice(0, 2000));
      process.exit(1);
    }
    const text = res.content.find((b) => b.type === "text");
    console.log(`\n✅ Bedrock is working. Model replied: "${text && "text" in text ? text.text.trim() : "(no text)"}"`);
    console.log("The paperwork QA scanner is fully unblocked.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("\n❌ Bedrock call failed:");
    console.log(`   ${message}\n`);
    if (/don't have access|model access|not authorized to invoke|AccessDeniedException.*model/i.test(message)) {
      console.log("→ Looks like model access isn't granted yet (or is still pending).");
      console.log("  Check AWS Console → Bedrock → Model access. Anthropic models should say 'Access granted'.");
    }
    if (/is not authorized to perform/i.test(message)) {
      console.log("→ IAM permission problem: the AWS user in .env.local needs the");
      console.log("  'bedrock-mantle:CreateInference' action (plus 'bedrock:InvokeModel' for good measure).");
      console.log("  IAM → Users → your user → Add permissions → Create inline policy.");
    }
    if (/model identifier|ValidationException.*model/i.test(message)) {
      console.log("→ The model ID may need the region-prefixed inference-profile form.");
      console.log("  Try setting BEDROCK_MODEL_ID=us.anthropic.claude-opus-4-8 in .env.local.");
    }
    process.exit(1);
  }
}

void main();
