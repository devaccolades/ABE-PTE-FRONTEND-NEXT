import { useState, useEffect, useRef } from "react";
import { useExamStore } from "@/store";

export function useSectionTimer(onTimeExpired) {
  const setGlobalRemainingTime = useExamStore((s) => s.setRemainingTime);
  
  // 1. Get initial time: Try LocalStorage first, then Store, then fallback to 1800
  const getInitialTime = () => {
    const saved = localStorage.getItem("section_time_left");
    if (saved !== null) return parseInt(saved, 10);
    return useExamStore.getState().remainingTime || 1800;
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTime);
  const timeLeftRef = useRef(getInitialTime());

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

        // 3. Update Ref and LocalStorage every second for maximum persistence
        timeLeftRef.current = nextValue;
        localStorage.setItem("section_time_left", nextValue.toString());
        return nextValue;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
      // 4. Save to global store on exit
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