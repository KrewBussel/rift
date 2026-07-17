/**
 * Shared shape + option labeling for the CRM stage pickers (onboarding wizard
 * confirm step and Settings → Integrations bookend card). Wealthbox stage
 * names are NOT unique across pipelines — every pipeline has its own "Won" —
 * so as soon as a firm has stages from more than one pipeline, each option is
 * prefixed with its pipeline name to keep the picker unambiguous.
 */
export type CrmStage = {
  id: string;
  name: string;
  pipelineId?: string | null;
  pipelineName?: string | null;
};

export function stageOptions(stages: CrmStage[]): Array<{ value: string; label: string }> {
  const pipelineCount = new Set(stages.map((s) => s.pipelineId).filter(Boolean)).size;
  return stages.map((s) => ({
    value: s.id,
    label: pipelineCount > 1 && s.pipelineName ? `${s.pipelineName} · ${s.name}` : s.name,
  }));
}
