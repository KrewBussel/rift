import { describe, expect, it } from "vitest";
import { parseWealthboxAmount, pickOpportunityAmount } from "@/lib/wealthbox";
import type { WealthboxOpportunity } from "@/lib/wealthbox";

/** Minimal opportunity carrying only the amounts we're testing. */
function opp(amounts: WealthboxOpportunity["amounts"]): WealthboxOpportunity {
  return { id: 1, name: "Test", amounts };
}

describe("parseWealthboxAmount", () => {
  it("passes through finite numbers", () => {
    expect(parseWealthboxAmount(56.76)).toBe(56.76);
    expect(parseWealthboxAmount(0)).toBe(0);
  });

  it("parses formatted strings with symbol and thousands separators", () => {
    // The exact shape a live Wealthbox response returned.
    expect(parseWealthboxAmount("$689,000")).toBe(689000);
    expect(parseWealthboxAmount("$1,234.56")).toBe(1234.56);
    expect(parseWealthboxAmount("-$1,000")).toBe(-1000);
    expect(parseWealthboxAmount("689000")).toBe(689000);
  });

  it("returns 0 for null / undefined / unparseable", () => {
    expect(parseWealthboxAmount(null)).toBe(0);
    expect(parseWealthboxAmount(undefined)).toBe(0);
    expect(parseWealthboxAmount("")).toBe(0);
    expect(parseWealthboxAmount("N/A")).toBe(0);
    expect(parseWealthboxAmount(Number.NaN)).toBe(0);
  });
});

describe("pickOpportunityAmount", () => {
  it("parses a live string amount with no currency field (regression: was $0)", () => {
    const result = pickOpportunityAmount(
      opp([{ id: 3595206, amount: "$689,000", basis_points: null, kind: "Fee" }]),
    );
    expect(result).toEqual({ amount: 689000, currency: "USD" });
  });

  it("handles the documented numeric shape with a symbol currency", () => {
    const result = pickOpportunityAmount(opp([{ amount: 56.76, currency: "$", kind: "Fee" }]));
    // "$" normalizes to the ISO code Intl.NumberFormat needs.
    expect(result).toEqual({ amount: 56.76, currency: "USD" });
  });

  it("sums multiple same-currency rows", () => {
    const result = pickOpportunityAmount(
      opp([
        { amount: "$100,000", kind: "Fee" },
        { amount: "$50,000", kind: "AUM" },
      ]),
    );
    expect(result).toEqual({ amount: 150000, currency: "USD" });
  });

  it("keeps the first row's currency and ignores mismatched-currency rows", () => {
    const result = pickOpportunityAmount(
      opp([
        { amount: "$100,000", kind: "Fee" },
        { amount: "£25,000", kind: "Fee" },
      ]),
    );
    expect(result).toEqual({ amount: 100000, currency: "USD" });
  });

  it("returns null when there are no amounts", () => {
    expect(pickOpportunityAmount(opp([]))).toBeNull();
    expect(pickOpportunityAmount(opp(undefined))).toBeNull();
  });
});
