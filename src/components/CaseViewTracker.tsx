"use client";

import { useEffect } from "react";
import { recordCaseView } from "@/app/actions/recordCaseView";

export default function CaseViewTracker({ caseId }: { caseId: string }) {
  useEffect(() => {
    recordCaseView(caseId);
  }, [caseId]);
  return null;
}
