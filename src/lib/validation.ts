import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";

/**
 * Parse a JSON request body against a Zod schema.
 * On failure, returns a 400 NextResponse with field-level error details.
 * On success, returns { data } with the parsed, typed value.
 *
 * Usage:
 *   const parsed = await parseBody(req, MySchema);
 *   if (parsed instanceof NextResponse) return parsed;
 *   const { data } = parsed;
 */
export async function parseBody<T extends ZodType>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  return { data: result.data };
}

/**
 * Parse URL search params against a Zod schema. Accepts a Request or a URLSearchParams.
 */
export function parseQuery<T extends ZodType>(
  input: Request | URLSearchParams,
  schema: T,
): { data: z.infer<T> } | NextResponse {
  const params = input instanceof URLSearchParams ? input : new URL(input.url).searchParams;
  const obj = Object.fromEntries(params.entries());

  const result = schema.safeParse(obj);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        issues: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }
  return { data: result.data };
}

// Common reusable schemas
export const emailSchema = z.string().trim().toLowerCase().email();
export const nonEmptyString = z.string().trim().min(1);
export const cuidSchema = z.string().regex(/^c[a-z0-9]{24,}$/i, "Invalid id");
export const roleSchema = z.enum(["ADMIN", "ADVISOR", "OPS"]);
