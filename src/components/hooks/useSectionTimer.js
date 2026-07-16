import { useState, useEffect, useRef } from "react";
import { useExamStore } from "@/store";
import { mocktestStore } from "@/app/mock-test/mocktestStore";

// Primary responsibility: Provides a section-level countdown timer with persistence and exam lifecycle integration.
// Architecture role: Central timer used across the exam flow to manage section expiry and trigger auto-advance behavior.

/**
 * @description Hook that manages the section countdown and persists it for refresh survival.
 *
 * Persistence strategy:
 * - Uses `localStorage.section_time_left` as the primary refresh-safe source.
 * - Syncs to `useExamStore.remainingTime` on significant changes and on unmount.
 *
 * Why refs are used:
 * - `timeLeftRef` holds the latest value inside the interval without re-subscribing the interval each tick.
 * - This prevents stale closures and keeps cleanup synchronization accurate.
 *
 * @param {(() => void)|undefined} onTimeExpired - Optional callback fired when the timer reaches zero.
 * @returns {{ timeLeft: number, formattedTime: string, isExpired: boolean }} Countdown state for UI rendering.
 */
export function useSectionTimer(onTimeExpired) {
  const isMockTest = mocktestStore((state) => state.isMockTest);

  // Get actions and state directly from Zustand
  const setGlobalRemainingTime = useExamStore((s) => s.setRemainingTime);
  const storeRemainingTime = useExamStore((s) => s.remainingTime);
  const setIsTimeExpired = useExamStore((s) => s.setIsTimeExpired);
  const isSectionTimerPaused = useExamStore((s) => s.isSectionTimerPaused);

  // Determine starting point: priority is LocalStorage (for refreshes), then Store, then Default
  /**
   * @description Determines the initial timer start value (seconds) with refresh survival.
   * @returns {number} Initial section time in seconds.
   */
  const getStartTime = () => {
    const saved = localStorage.getItem("section_time_left");
    if (saved !== null && saved !== "0") return parseInt(saved, 10);

    if (isMockTest) return 1800;
    return storeRemainingTime > 0 ? storeRemainingTime : 1800;
  };

  const [timeLeft, setTimeLeft] = useState(getStartTime);
  const timeLeftRef = useRef(getStartTime());

  // --- 1. SYNC WITH STORE CHANGES ---
  // Removed: syncing with storeRemainingTime here causes a race condition when components unmount/remount
  // rapidly. Instead, ExamShell will clear `section_time_left` from localStorage when a true section change occurs.

  // --- 2. THE COUNTDOWN ENGINE ---
  useEffect(() => {
    if (isSectionTimerPaused) {
      // Keep refresh recovery current without notifying React during cleanup.
      return () => {
        localStorage.setItem("section_time_left", String(timeLeftRef.current));
      };
    }
    // Interval-driven countdown; stores the latest value in both local state and persistence layers.
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        const nextValue = prev - 1;

        if (nextValue <= 0) {
          clearInterval(intervalId);
          handleExpiry();
          return 0;
        }

        // Update persistence layers
        timeLeftRef.current = nextValue;
        localStorage.setItem("section_time_left", nextValue.toString());
        return nextValue;
      });
    }, 1000);

    // Helper for cleanup and expiry logic
    const handleExpiry = () => {
      localStorage.setItem("section_time_left", "0");
      setGlobalRemainingTime(0);
      setIsTimeExpired(true);
      if (onTimeExpired) {
        onTimeExpired();
      }
    };

    return () => {
      clearInterval(intervalId);
      // Persist only to browser storage during cleanup. Updating Zustand here can
      // notify ExamShell while React is still rendering the next question.
      localStorage.setItem("section_time_left", String(timeLeftRef.current));
    };
  }, [setGlobalRemainingTime, setIsTimeExpired, onTimeExpired, isSectionTimerPaused]);

  const formatTime = (seconds) => {
    const total = Math.max(0, seconds);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return {
    timeLeft,
    formattedTime: formatTime(timeLeft),
    isExpired: timeLeft <= 0,
  };
}
