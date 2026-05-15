"use client";

import { useState } from "react";

/** User avatar. Tries to load the uploaded photo from /api/users/{id}/avatar
 *  and falls back to a colored gradient circle with initials on error. */
export default function Avatar({
  userId,
  firstName,
  lastName,
  size = 28,
  title,
}: {
  userId: string;
  firstName: string;
  lastName: string;
  size?: number;
  title?: string;
}) {
  const [errored, setErrored] = useState(false);
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?";
  const tooltip = title ?? `${firstName} ${lastName}`.trim();

  if (errored) {
    return (
      <span
        className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #1d4ed8 0%, #4f46e5 55%, #0891b2 100%)",
          color: "#fff",
          fontSize: Math.round(size * 0.38),
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
        title={tooltip}
        aria-label={tooltip}
      >
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/users/${userId}/avatar`}
      alt={tooltip}
      title={tooltip}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  );
}
