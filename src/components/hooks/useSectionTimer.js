// src/hooks/useSectionTimer.js
import { useState, useEffect, useRef } from "react";
import { useExamStore } from "@/store";

export function useSectionTimer(onTimeExpired) {
  // 1. Get Global State
  const remainingTime = useExamStore((s) => s.remainingTime);
  const setRemainingTime = useExamStore((s) => s.setRemainingTime);

  // 2. Local State for smooth rendering
  const [timeLeft, setTimeLeft] = useState(remainingTime);

  // 3. Ref to track time for cleanup (avoids stale closures)
  const timeLeftRef = useRef(remainingTime);

  useEffect(() => {
    // If time is already 0, expire immediately
    if (remainingTime <= 0) {
      if (onTimeExpired) onTimeExpired();
      return;
    }

    // Update ref and local state
    timeLeftRef.current = remainingTime;
    setTimeLeft(remainingTime);

    // Start Interval
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        const newValue = prev - 1;
        timeLeftRef.current = newValue; // Update ref for cleanup logic

        // CHECK FOR TIMEOUT
        if (newValue <= 0) {
          clearInterval(intervalId);
          setRemainingTime(0); // Sync global 0
          if (onTimeExpired) onTimeExpired(); // Trigger Force Stop
          return 0;
        }
        return newValue;
      });
    }, 1000);

    // CLEANUP: Runs when component unmounts (e.g., User clicks "Next")
    return () => {
      clearInterval(intervalId);
      // Save the exact time left back to global store for the next component
      setRemainingTime(timeLeftRef.current);
    };
  }, []); // Run once on mount

  // Helper to format MM:SS
  const formatTime = (seconds) => {
    if (seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return {
    timeLeft,
    formattedTime: formatTime(timeLeft),
    isExpired: timeLeft <= 0,
  };
}
