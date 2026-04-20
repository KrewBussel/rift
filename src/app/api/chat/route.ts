import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFirmUsageSummary, logAIUsage } from "@/lib/aiUsage";
import { parseBody } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(50_000),
      }),
    )
    .min(1)
    .max(50),
});

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Rift Intelligence, an expert assistant for retirement rollover advisors and operations staff at a wealth-management firm.

Your job is to answer questions about custodians — the big brokerage and recordkeeping firms (Fidelity, Vanguard, Schwab, Empower, Principal, TIAA, etc.) that hold client retirement assets during a rollover.

You have access to a structured custodian database via the \`search_custodians\` tool. Use it aggressively — do NOT answer custodian-specific factual questions from memory alone. Always call the tool first when the user asks about a specific custodian, even if you think you know the answer.

Firm-specific notes (tribal knowledge authored by colleagues at this firm) are also returned — weight those highly, since they often reflect current conditions that override general industry info.

When you answer:
- Be concise and practical. This is an ops tool, not a chatbot demo.
- Cite the specific custodian fields you're pulling from (e.g., "Medallion threshold: $100K").
- If a fact is NOT in the database, say so — don't fabricate phone numbers, addresses, or thresholds.
- If the \`lastVerifiedAt\` date is older than 90 days, note that the info may be stale.
- Be direct. Short sentences. No filler preambles.

Format responses with markdown: bullet lists, bold for key values, inline code for phone/fax numbers. Do not use headings unless the answer is long enough to warrant them.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured. Add it to your .env." },
      { status: 500 },
    );
  }

  const firmId = session.user.firmId;
  const userId = session.user.id;

  const rateLimited = await enforceRateLimit("chat", `chat:user:${userId}`);
  if (rateLimited) return rateLimited;

  const usageSummary = await getFirmUsageSummary(firmId);
  if (usageSummary.overLimit) {
    return NextResponse.json(
      {
        error: "AI usage limit reached for this billing period.",
        code: "QUOTA_EXCEEDED",
        percentUsed: usageSummary.percentUsed,
      },
      { status: 429 },
    );
  }

  const parsed = await parseBody(req, ChatRequestSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { messages } = parsed.data;

  // ── Monthly limit check ───────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthlyCount, firmSettings] = await Promise.all([
    prisma.aiUsage.count({
      where: { firmId, createdAt: { gte: monthStart } },
    }),
    prisma.firmSettings.findUnique({
      where: { firmId },
      select: { aiMonthlyLimit: true },
    }),
  ]);

  const monthlyLimit = firmSettings?.aiMonthlyLimit ?? 500;

  if (monthlyCount >= monthlyLimit) {
    return NextResponse.json(
      {
        error: `Monthly AI question limit reached (${monthlyCount}/${monthlyLimit}). Contact your administrator to increase the limit.`,
        limitReached: true,
        used: monthlyCount,
        limit: monthlyLimit,
      },
      { status: 429 },
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  const client = new Anthropic();

  const tools: Anthropic.Tool[] = [
    {
      name: "search_custodians",
      description:
        "Search the custodian intelligence database. Returns structured records matching the query by name, alias, tag, or text in overview/quirks/notes. Use an empty query to list all custodians.",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Free-text search. Matches custodian name, aliases, tags, overview, quirks, and firm-specific notes. Examples: 'Fidelity', 'medallion', 'QJSA', '403b', 'TIAA annuity'.",
          },
          includeNotes: {
            type: "boolean",
            description: "Whether to include firm-authored notes for each custodian. Defaults to true.",
          },
        },
        required: ["query"],
      },
      // Cache the tool definition — it never changes between requests
      cache_control: { type: "ephemeral" },
    } as Anthropic.Tool,
  ];

  const conversation: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const MAX_TURNS = 6;
  let finalText = "";
  const toolCalls: Array<{ query: string; resultCount: number }> = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;
  const model = "claude-opus-4-7";

  // Accumulate token usage across all turns
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheHitTokens = 0;
  let turnCount = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response: Anthropic.Message = await client.messages.create({
      model,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools,
      messages: conversation,
    });

    totalInputTokens += response.usage?.input_tokens ?? 0;
    totalOutputTokens += response.usage?.output_tokens ?? 0;
    totalCacheReadTokens += response.usage?.cache_read_input_tokens ?? 0;
    totalCacheWriteTokens += response.usage?.cache_creation_input_tokens ?? 0;

    conversation.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") {
      finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      break;
    }

    if (response.stop_reason !== "tool_use") {
      finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      break;
    }

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      if (use.name === "search_custodians") {
        const input = use.input as { query?: string; includeNotes?: boolean };
        const query = (input.query ?? "").trim();
        const includeNotes = input.includeNotes !== false;

        const result = await searchCustodians(query, firmId, includeNotes);
        toolCalls.push({ query, resultCount: result.count });

        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify(result),
        });
      } else {
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify({ error: `Unknown tool: ${use.name}` }),
          is_error: true,
        });
      }
    }

    conversation.push({ role: "user", content: toolResults });
  }

  if (!finalText) {
    finalText = "Sorry — I wasn't able to generate a response. Try rephrasing.";
  }

  if (totalInputTokens > 0 || totalOutputTokens > 0) {
    await logAIUsage({
      firmId,
      userId,
      model,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cacheReadTokens: totalCacheReadTokens,
      cacheWriteTokens: totalCacheWriteTokens,
    }).catch((err) => console.error("[chat] failed to log AI usage", err));
  }

  return NextResponse.json({
    message: finalText,
    toolCalls,
    usage: {
      used: monthlyCount + 1,
      limit: monthlyLimit,
    },
  });
}

async function searchCustodians(query: string, firmId: string, includeNotes: boolean) {
  const q = query.toLowerCase();

  const whereForText = q
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { legalName: { contains: query, mode: "insensitive" as const } },
          { overview: { contains: query, mode: "insensitive" as const } },
          { signatureRequirements: { contains: query, mode: "insensitive" as const } },
          { aliases: { has: query } },
          { tags: { has: q } },
          { quirks: { hasSome: [query] } },
        ],
      }
    : {};

  const custodians = await prisma.custodian.findMany({
    where: whereForText,
    include: includeNotes
      ? {
          notes: {
            where: { firmId },
            orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
            take: 10,
            include: {
              author: { select: { firstName: true, lastName: true } },
            },
          },
        }
      : undefined,
    take: 10,
  });

  if (custodians.length === 0 && q) {
    const fuzzy = await prisma.custodian.findMany({
      where: {
        OR: [
          { name: { contains: q.split(" ")[0], mode: "insensitive" } },
          { quirks: { hasSome: q.split(" ").filter((t) => t.length > 3) } },
          { tags: { hasSome: q.split(" ").filter((t) => t.length > 2) } },
        ],
      },
      include: includeNotes
        ? {
            notes: {
              where: { firmId },
              orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
              take: 10,
              include: {
                author: { select: { firstName: true, lastName: true } },
              },
            },
          }
        : undefined,
      take: 10,
    });

    return {
      count: fuzzy.length,
      fuzzy: true,
      custodians: fuzzy.map(serialize),
    };
  }

  return {
    count: custodians.length,
    fuzzy: false,
    custodians: custodians.map(serialize),
  };
}

type CustodianWithNotes = Awaited<ReturnType<typeof prisma.custodian.findMany>>[number] & {
  notes?: Array<{
    id: string;
    title: string;
    body: string;
    category: string | null;
    pinned: boolean;
    updatedAt: Date;
    author: { firstName: string; lastName: string };
  }>;
};

function serialize(c: CustodianWithNotes) {
  return {
    name: c.name,
    legalName: c.legalName,
    aliases: c.aliases,
    phone: c.phone,
    fax: c.fax,
    email: c.email,
    website: c.website,
    mailingAddress: c.mailingAddress,
    overnightAddress: c.overnightAddress,
    wireInstructions: c.wireInstructions,
    typicalProcessingDays: c.typicalProcessingDays,
    minProcessingDays: c.minProcessingDays,
    maxProcessingDays: c.maxProcessingDays,
    signatureRequirements: c.signatureRequirements,
    medallionRequired: c.medallionRequired,
    medallionThreshold: c.medallionThreshold,
    notarizationRequired: c.notarizationRequired,
    acceptsElectronic: c.acceptsElectronic,
    acceptsDigitalSignature: c.acceptsDigitalSignature,
    supportsACATS: c.supportsACATS,
    overview: c.overview,
    quirks: c.quirks,
    commonForms: c.commonForms,
    tags: c.tags,
    lastVerifiedAt: c.lastVerifiedAt?.toISOString() ?? null,
    firmNotes:
      c.notes?.map((n) => ({
        title: n.title,
        body: n.body,
        category: n.category,
        pinned: n.pinned,
        author: `${n.author.firstName} ${n.author.lastName}`,
        updatedAt: n.updatedAt.toISOString(),
      })) ?? [],
  };
}
