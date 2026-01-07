import { useState, useEffect, useRef } from "react";
import { useExamStore } from "@/store";

export function useSectionTimer(onTimeExpired) {
  const setGlobalRemainingTime = useExamStore((s) => s.setRemainingTime);
  // 1. Listen to the global remainingTime from Zustand
  const globalRemainingTime = useExamStore((s) => s.remainingTime);
  
  const getInitialTime = () => {
    const saved = localStorage.getItem("section_time_left");
    if (saved !== null) return parseInt(saved, 10);
    return globalRemainingTime || 1800;
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTime);
  const timeLeftRef = useRef(getInitialTime());

  // --- SYNC LOGIC: If Global State changes (New Section), Reset Local Timer ---
  useEffect(() => {
    // If global time is different from our local ref by more than a second,
    // it means the ExamShell has loaded a new section.
    if (Math.abs(globalRemainingTime - timeLeftRef.current) > 1) {
      setTimeLeft(globalRemainingTime);
      timeLeftRef.current = globalRemainingTime;
      localStorage.setItem("section_time_left", globalRemainingTime.toString());
    }
  }, [globalRemainingTime]);

  useEffect(() => {
    // 2. Continuous Countdown
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        const nextValue = prev - 1;
        
        if (nextValue <= 0) {
          clearInterval(intervalId);
          localStorage.setItem("section_time_left", "0");
          setGlobalRemainingTime(0);
          if (onTimeExpired) onTimeExpired();
          return 0;
        }

        // 3. Update Ref and LocalStorage
        timeLeftRef.current = nextValue;
        localStorage.setItem("section_time_left", nextValue.toString());
        return nextValue;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
      // 4. Save to global store on unmount
      setGlobalRemainingTime(timeLeftRef.current);
    };
  }, [setGlobalRemainingTime, onTimeExpired]);

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