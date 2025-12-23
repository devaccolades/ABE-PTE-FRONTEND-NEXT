"use client";
import { useEffect } from "react";

export function Progress({
  value = 0,
  className = "",
  onComplete,
  bg = "bg-sky-600",
}) {
  const clamped = Math.max(0, Math.min(100, value));

  // Trigger callback when progress reaches 100%
  useEffect(() => {
    if (clamped === 100 && typeof onComplete === "function") {
      onComplete();
    }
  }, [clamped, onComplete]);

  return (
    <div
      className={`h-2 w-full rounded-full bg-gray-200 overflow-hidden ${className}`}
    >
      <div
        className={`h-full transition-all ${bg}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
