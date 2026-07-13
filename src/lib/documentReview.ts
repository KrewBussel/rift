import { GetObjectCommand } from "@aws-sdk/client-s3";
import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import { prisma } from "./prisma";
import { s3, S3_BUCKET } from "./s3";

/**
 * Paperwork QA scanner.
 *
 * Reads an uploaded rollover document from S3 and has Claude — running on
 * Amazon Bedrock, so the document NEVER leaves AWS or reaches Anthropic —
 * check it for missed signatures/initials/dates, blank fields, and mismatches
 * against the case (client name, account type, destination custodian's
 * signature/medallion/notary requirements from the Custodian directory).
 *
 * Design rules (same philosophy as crmSync.ts):
 *  - Non-throwing: failures land on the DocumentReview row, never on the
 *    upload that triggered the scan.
 *  - Human-in-the-loop: the scanner only reports findings; it never advances
 *    checklist status. Ops decides.
 *  - PII minimization: the model is instructed — and the output schema only
 *    permits — field NAMES and issue types. SSNs/account values are never
 *    transcribed into our database.
 *
 * Config (env):
 *  - BEDROCK_REGION    optional; defaults to AWS_REGION (same as S3)
 *  - BEDROCK_MODEL_ID  optional; defaults to Claude Opus on Bedrock. If your
 *    AWS account exposes the model via an inference profile, set this to that
 *    profile id (e.g. "us.anthropic.claude-opus-4-8").
 */

const BEDROCK_MODEL = process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-opus-4-8";

/** Types Claude can read natively. Anything else (e.g. .docx) is skipped. */
const REVIEWABLE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isReviewableType(fileType: string): boolean {
  return REVIEWABLE_TYPES.has(fileType);
}

export interface ReviewFinding {
  page: number | null;
  field: string;
  issue:
    | "missing_signature"
    | "missing_initials"
    | "missing_date"
    | "blank_field"
    | "incorrect_field"
    | "name_mismatch"
    | "wrong_form"
    | "illegible"
    | "other";
  detail: string;
  confidence: "high" | "medium" | "low";
}

export type ReviewResult =
  | { ok: true; verdict: "PASS" | "ISSUES_FOUND" | "UNREADABLE"; findings: ReviewFinding[] }
  | { ok: false; reason: "not_found" | "unsupported_type" | "error"; error?: string };

/** The forced tool schema — the ONLY shape the model can answer in. */
const REVIEW_TOOL = {
  name: "report_document_review",
  description:
    "Report the QA review result for the document. This is the only way to respond.",
  input_schema: {
    type: "object" as const,
    properties: {
      verdict: {
        type: "string",
        enum: ["PASS", "ISSUES_FOUND", "UNREADABLE"],
        description:
          "PASS if the document appears fully and correctly completed; ISSUES_FOUND if anything needs correction; UNREADABLE if quality is too poor to review.",
      },
      summary: {
        type: "string",
        description:
          "One or two plain-English sentences for the ops team. Never include SSNs, account numbers, or other sensitive values.",
      },
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            page: { type: ["integer", "null"], description: "1-indexed page, null if unknown" },
            field: {
              type: "string",
              description: "The NAME of the field or section (e.g. 'Account Holder Signature'). Never the value.",
            },
            issue: {
              type: "string",
              enum: [
                "missing_signature",
                "missing_initials",
                "missing_date",
                "blank_field",
                "incorrect_field",
                "name_mismatch",
                "wrong_form",
                "illegible",
                "other",
              ],
            },
            detail: {
              type: "string",
              description: "What is wrong and what the client must do to fix it. No sensitive values.",
            },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["field", "issue", "detail", "confidence"],
        },
      },
    },
    required: ["verdict", "summary", "findings"],
  },
};

/**
 * Review one document. Safe to call fire-and-forget; safe to re-run (the
 * review row is upserted). Returns a result object, never throws.
 */
export async function reviewDocument(documentId: string): Promise<ReviewResult> {
  try {
    return await reviewDocumentImpl(documentId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Best-effort failure record; swallow if even that fails.
    await prisma.documentReview
      .upsert({
        where: { documentId },
        update: { status: "FAILED", error: message },
        create: { documentId, status: "FAILED", error: message },
      })
      .catch(() => undefined);
    return { ok: false, reason: "error", error: message };
  }
}

async function reviewDocumentImpl(documentId: string): Promise<ReviewResult> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      case: {
        select: {
          clientFirstName: true,
          clientLastName: true,
          accountType: true,
          sourceProvider: true,
          destinationCustodian: true,
        },
      },
      checklistItem: { select: { name: true } },
    },
  });
  if (!document) return { ok: false, reason: "not_found" };
  if (!isReviewableType(document.fileType)) return { ok: false, reason: "unsupported_type" };

  await prisma.documentReview.upsert({
    where: { documentId },
    update: { status: "PENDING", verdict: null, findings: undefined, summary: null, error: null },
    create: { documentId, status: "PENDING" },
  });

  // Custodian requirements give the model firm ground truth to check against
  // (signature style, medallion/notary rules). Missing custodian is fine —
  // the generic checks still run.
  const custodian = await prisma.custodian.findFirst({
    where: {
      OR: [
        { name: { equals: document.case.destinationCustodian, mode: "insensitive" } },
        { aliases: { has: document.case.destinationCustodian } },
      ],
    },
    select: {
      name: true,
      signatureRequirements: true,
      medallionRequired: true,
      medallionThreshold: true,
      notarizationRequired: true,
      acceptsDigitalSignature: true,
      commonForms: true,
      quirks: true,
    },
  });

  const object = await s3.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: document.storagePath }),
  );
  const bytes = await object.Body!.transformToByteArray();
  const data = Buffer.from(bytes).toString("base64");

  const fileBlock =
    document.fileType === "application/pdf"
      ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data } }
      : { type: "image" as const, source: { type: "base64" as const, media_type: document.fileType as "image/jpeg" | "image/png" | "image/webp", data } };

  // Explicit SigV4 credentials — the same keys the S3 client uses.
  const client = new AnthropicBedrockMantle({
    awsRegion: process.env.BEDROCK_REGION ?? process.env.AWS_REGION,
    awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  const response = await client.messages.create({
    model: BEDROCK_MODEL,
    max_tokens: 4096,
    system: [
      "You are a paperwork QA reviewer for IRA/401(k) rollover documents at an RIA.",
      "Review the attached document for completeness and correctness. Check for:",
      "- signature lines, initial boxes, and date fields left blank (handwritten marks count as filled)",
      "- required fields left empty or visibly incomplete",
      "- the account holder name on the form not matching the expected client name",
      "- the form not matching the expected custodian or transaction type",
      "- pages that are illegible, cut off, or too low-quality to verify",
      "",
      "PRIVACY — ABSOLUTE RULE: never transcribe or repeat sensitive values.",
      "No SSNs, account numbers, dollar amounts, addresses, or dates of birth in any output field.",
      "Refer to fields by their LABEL only (e.g. 'SSN field on page 1 is blank').",
      "",
      "Only report real problems that need fixing. Do not pad findings. If the document is complete, say PASS.",
      "You must respond using the report_document_review tool.",
    ].join("\n"),
    tools: [REVIEW_TOOL],
    tool_choice: { type: "tool", name: "report_document_review" },
    messages: [
      {
        role: "user",
        content: [
          fileBlock,
          {
            type: "text",
            text: [
              "Case context to check the document against:",
              `- Expected client name: ${document.case.clientFirstName} ${document.case.clientLastName}`,
              `- Transaction: ${document.case.accountType} rollover from ${document.case.sourceProvider} to ${document.case.destinationCustodian}`,
              document.checklistItem ? `- This document should be: ${document.checklistItem.name}` : null,
              custodian
                ? [
                    `Destination custodian requirements (${custodian.name}):`,
                    custodian.signatureRequirements ? `- Signatures: ${custodian.signatureRequirements}` : null,
                    custodian.medallionRequired
                      ? `- Medallion signature guarantee required${custodian.medallionThreshold ? ` above $${custodian.medallionThreshold}` : ""}`
                      : null,
                    custodian.notarizationRequired ? "- Notarization required" : null,
                    `- Digital signatures accepted: ${custodian.acceptsDigitalSignature ? "yes" : "no"}`,
                    custodian.commonForms.length ? `- Common forms: ${custodian.commonForms.join(", ")}` : null,
                    custodian.quirks.length ? `- Known quirks: ${custodian.quirks.join("; ")}` : null,
                  ]
                    .filter(Boolean)
                    .join("\n")
                : "No custodian requirement data on file — run the generic completeness checks only.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a review result");
  }
  const result = toolUse.input as {
    verdict: "PASS" | "ISSUES_FOUND" | "UNREADABLE";
    summary: string;
    findings: ReviewFinding[];
  };

  const findings = Array.isArray(result.findings) ? result.findings.slice(0, 50) : [];
  // Belt-and-suspenders: a PASS with findings (or vice versa) is normalized.
  const verdict = findings.length > 0 && result.verdict === "PASS" ? "ISSUES_FOUND" : result.verdict;

  await prisma.documentReview.update({
    where: { documentId },
    data: {
      status: "COMPLETE",
      verdict,
      summary: typeof result.summary === "string" ? result.summary.slice(0, 2000) : null,
      findings: findings as object[],
      error: null,
      modelUsed: BEDROCK_MODEL,
    },
  });

  return { ok: true, verdict, findings };
}
