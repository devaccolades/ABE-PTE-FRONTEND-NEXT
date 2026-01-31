import { useState, useEffect, useRef } from "react";
import { useExamStore } from "@/store";
import { mocktestStore } from "@/app/mock-test/mocktestStore";

export function useSectionTimer(onTimeExpired) {
  const isMockTest = mocktestStore((state) => state.isMockTest);

  // Get actions and state directly from Zustand
  const setGlobalRemainingTime = useExamStore((s) => s.setRemainingTime);
  const storeRemainingTime = useExamStore((s) => s.remainingTime);
  const setIsTimeExpired = useExamStore((s) => s.setIsTimeExpired);

  // Determine starting point: priority is LocalStorage (for refreshes), then Store, then Default
  const getStartTime = () => {
    const saved = localStorage.getItem("section_time_left");
    // console.log("local host time ", saved);
    if (saved !== null && saved !== "0") return parseInt(saved, 10);

    if (isMockTest) return 1800;
    return storeRemainingTime > 0 ? storeRemainingTime : 1800;
  };

  const [timeLeft, setTimeLeft] = useState(getStartTime);
  const timeLeftRef = useRef(getStartTime());

  // --- 1. SYNC WITH STORE CHANGES ---
  // If the store changes significantly (e.g., a new section loads), update local timer
  useEffect(() => {
    const startTime = isMockTest ? 1800 : storeRemainingTime;

    // Only force update if the store has a value and it differs from our current ref
    if (startTime > 0 && Math.abs(startTime - timeLeftRef.current) > 5) {
      setTimeLeft(startTime);
      timeLeftRef.current = startTime;
    }
  }, [storeRemainingTime, isMockTest]);

  // --- 2. THE COUNTDOWN ENGINE ---
  useEffect(() => {
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
      console.log("time expires");
      setIsTimeExpired(true);
      if (onTimeExpired) {
        onTimeExpired();
      }
    };

    return () => {
      clearInterval(intervalId);
      // --- 3. SAVE TO GLOBAL STORE ON UNMOUNT ---
      // This is the "Real World" sync point when switching questions
      setGlobalRemainingTime(timeLeftRef.current);
    };
  }, [setGlobalRemainingTime, setIsTimeExpired, onTimeExpired]);

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
