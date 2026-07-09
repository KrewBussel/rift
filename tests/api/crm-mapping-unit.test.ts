import { describe, expect, it } from "vitest";
import { mapAccountType, suggestBookendStages } from "@/lib/crmSync";

describe("mapAccountType", () => {
  it("maps traditional / roth / 403b / other", () => {
    expect(mapAccountType("Traditional IRA")).toBe("TRADITIONAL_IRA_401K");
    expect(mapAccountType("Roth IRA")).toBe("ROTH_IRA_401K");
    expect(mapAccountType("403(b)")).toBe("IRA_403B");
    expect(mapAccountType("Other")).toBe("OTHER");
  });

  it("classifies Roth/Traditional 403(b) as 403b, not roth/traditional (regression)", () => {
    // "403" is checked before "roth"/"traditional" so these don't fall through
    // to the broader substring matches.
    expect(mapAccountType("Roth 403(b)")).toBe("IRA_403B");
    expect(mapAccountType("Traditional 403(b)")).toBe("IRA_403B");
  });

  it("returns null for unknown / empty", () => {
    expect(mapAccountType("")).toBeNull();
    expect(mapAccountType(null)).toBeNull();
    expect(mapAccountType("SEP")).toBeNull();
  });
});

describe("suggestBookendStages", () => {
  const stages = [
    { id: "1", name: "Lead" },
    { id: "2", name: "Proposal Accepted" },
    { id: "3", name: "In Progress" },
    { id: "4", name: "Closed Won" },
    { id: "5", name: "Closed Lost" },
  ];

  it("detects Proposal Accepted as trigger and Won as close", () => {
    const { trigger, won } = suggestBookendStages(stages);
    expect(trigger?.id).toBe("2");
    expect(won?.id).toBe("4");
  });

  it("falls back gracefully when names don't match", () => {
    const { trigger, won } = suggestBookendStages([
      { id: "a", name: "Stage One" },
      { id: "b", name: "Stage Two" },
    ]);
    expect(trigger).toBeNull();
    expect(won).toBeNull();
  });

  it("never suggests the same stage for both bookends", () => {
    const { trigger, won } = suggestBookendStages([{ id: "x", name: "Won Proposal Accepted" }]);
    // The single stage matches both heuristics; won is dropped to force a manual pick.
    expect(trigger?.id).toBe("x");
    expect(won).toBeNull();
  });
});
