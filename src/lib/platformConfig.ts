/**
 * Platform-wide policy enforced by Rift across all firms.
 * Change here once; do not expose in tenant-facing settings UI.
 */
export const platformConfig = {
  password: {
    minLength: 12,
    requireNumber: true,
    requireSymbol: true,
    rotationDays: 0,
    reusePrevention: 5,
  },
  session: {
    timeoutMinutes: 60,
  },
  retention: {
    caseDataDays: 2555,
    auditLogDays: 2555,
  },
  network: {
    ipAllowlist: [] as string[],
  },
} as const;

export type PlatformConfig = typeof platformConfig;
