/**
 * Rift logo mark — three offset rounded forms stepping through a blue →
 * violet → cyan gradient. Used in the landing nav/footer, dashboard sidebar,
 * and auth pages. Wrap in a Link with the "Rift" wordmark for a full lockup.
 */
export default function LogoMark({
  size = 22,
  id = "rift-logo",
}: {
  size?: number;
  /** SVG <defs> are id-scoped — pass a unique id if rendering multiple marks on one page. */
  id?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect x="0"  y="2"  width="10" height="24" rx="2.5" fill={`url(#${id}-a)`} />
      <rect x="6"  y="6"  width="14" height="16" rx="2.5" fill={`url(#${id}-b)`} opacity="0.92" />
      <rect x="14" y="10" width="14" height="12" rx="2.5" fill={`url(#${id}-c)`} opacity="0.85" />
      <rect x="0"  y="2"  width="10" height="24" rx="2.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
    </svg>
  );
}
