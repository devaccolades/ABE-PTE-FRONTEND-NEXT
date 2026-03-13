// "use client";

// import { useEffect, useState, useRef } from "react";

// export default function IndividualQuestionTimer({
//   initialSeconds = 600,
//   onExpired,
// }) {
//   const [timeLeft, setTimeLeft] = useState(initialSeconds);
//   const hasExpiredRef = useRef(false);

//   useEffect(() => {
//     if (timeLeft <= 0) return;

//     const id = setInterval(() => {
//       setTimeLeft((prev) => {
//         const next = prev - 1;
//         if (next <= 0) {
//           clearInterval(id);
//           if (!hasExpiredRef.current) {
//             hasExpiredRef.current = true;
//             if (onExpired) onExpired();
//           }
//           return 0;
//         }
//         return next;
//       });
//     }, 1000);

//     return () => clearInterval(id);
//   }, [timeLeft, onExpired]);

//   const formatTime = (seconds) => {
//     const total = Math.max(0, seconds);
//     const m = Math.floor(total / 60);
//     const s = Math.floor(total % 60);
//     return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
//   };

//   return (
//     <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-rose-700">
//       <span className="uppercase tracking-wide">Question Timer</span>
//       <span className="px-2 py-1 rounded-md bg-rose-50 border border-rose-200">
//         {formatTime(timeLeft)}
//       </span>
//     </div>
//   );
// }

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function formatTime(seconds) {
  const total = Math.max(0, seconds);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Independent per-question timer (default 10 minutes).
 * Persists independently from the global section timer using its own key.
 */
export default function IndividualQuestionTimer({
  durationSeconds = 600,
  storageKey,
  onExpired,
  label = "Question Time",
}) {
  const resolvedKey = useMemo(() => {
    if (!storageKey) return null;
    return storageKey;
  }, [storageKey]);

  const getStart = () => {
    if (!resolvedKey) return durationSeconds;
    const saved = localStorage.getItem(resolvedKey);
    if (saved !== null && saved !== "0") {
      const parsed = parseInt(saved, 10);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
    return durationSeconds;
  };

  const [timeLeft, setTimeLeft] = useState(getStart);
  const timeLeftRef = useRef(timeLeft);
  const expiredRef = useRef(false);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;

        if (next <= 0) {
          clearInterval(intervalId);
          if (resolvedKey) localStorage.setItem(resolvedKey, "0");
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpired?.();
          }
          return 0;
        }

        if (resolvedKey) localStorage.setItem(resolvedKey, String(next));
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
      // Avoid stale timers if user navigates away; the caller can decide whether to keep it.
    };
  }, [onExpired, resolvedKey]);

  const formatted = useMemo(() => formatTime(timeLeft), [timeLeft]);

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-md border shadow-sm w-fit ml-auto bg-white border-gray-200 text-gray-700">
      <span className="font-mono font-medium text-sm">
        {timeLeft <= 0 ? "Time's Up" : `${label}: ${formatted}`}
      </span>
    </div>
  );
}

