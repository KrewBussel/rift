"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  userId: string;
  name: string;
  size?: "sm" | "xs";
}

export default function UserAvatar({ userId, name, size = "sm" }: Props) {
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const dim = size === "sm" ? 24 : 20;
  const fontSize = size === "sm" ? 9 : 8;

  const parts = name.trim().split(/\s+/);
  const initials = (
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : name.slice(0, 2)
  ).toUpperCase();

  // Catch the race where the image 404'd before React attached onError
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setError(true);
    }
  }, []);

  if (error) {
    return (
      <div
        className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
        style={{ width: dim, height: dim, fontSize, background: "#2d333b", color: "#8b949e" }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={`/api/users/${userId}/avatar`}
      alt={name}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: dim, height: dim }}
      onError={() => setError(true)}
    />
  );
}
