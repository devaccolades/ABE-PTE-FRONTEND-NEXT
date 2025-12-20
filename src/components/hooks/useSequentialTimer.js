// src/hooks/useSequentialTimer.js

import { useState, useEffect, useRef } from 'react';

export const PHASES = {
  PREP: 'prep',
  ACTIVE_MIDDLE: 'active_middle',
  RECORDING: 'recording',
  FINISHED: 'finished',
  ERROR: 'error',
};

export function useSequentialTimer(
  prepDuration,
  middleDuration,
  recDuration,
  triggerReset,
  onPrepEnd,
  onMiddleEnd,
  onRecordEnd
) {
  const [phase, setPhase] = useState(PHASES.PREP);
  const [timeLeft, setTimeLeft] = useState(prepDuration);
  
  const phaseEndTimeRef = useRef(0);
  const hasTriggeredEndRef = useRef(false);

  // Helper to sync the absolute end time when a phase starts
  const startPhaseTimer = (duration) => {
    phaseEndTimeRef.current = Date.now() + duration * 1000;
    setTimeLeft(duration);
    hasTriggeredEndRef.current = false;
  };

  // 1. Initialize/Reset
  useEffect(() => {
    setPhase(PHASES.PREP);
    startPhaseTimer(prepDuration);
  }, [triggerReset, prepDuration]);

  // 2. The Timer Loop
  useEffect(() => {
    if (phase === PHASES.FINISHED || phase === PHASES.ERROR) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const msRemaining = phaseEndTimeRef.current - now;
      const secondsRemaining = Math.ceil(msRemaining / 1000);

      // Force UI update
      const displayTime = secondsRemaining > 0 ? secondsRemaining : 0;
      setTimeLeft(displayTime);

      if (msRemaining <= 0 && !hasTriggeredEndRef.current) {
        hasTriggeredEndRef.current = true;
        
        // Trigger the specific callbacks based on current phase
        if (phase === PHASES.PREP) {
          onPrepEnd(middleDuration > 0);
        } else if (phase === PHASES.ACTIVE_MIDDLE) {
          onMiddleEnd();
        } else if (phase === PHASES.RECORDING) {
          setPhase(PHASES.FINISHED);
          onRecordEnd();
        }
      }
    }, 50); 

    return () => clearInterval(interval);
  }, [phase, middleDuration, onPrepEnd, onMiddleEnd, onRecordEnd]);

  // 3. Manual Phase Setter wrapper
  const handleSetPhase = (newPhase) => {
    // When the component calls setPhase(RECORDING), 
    // we MUST immediately reset the timer anchor to the recording duration
    if (newPhase === PHASES.RECORDING) {
      startPhaseTimer(recDuration);
    } else if (newPhase === PHASES.ACTIVE_MIDDLE) {
      startPhaseTimer(middleDuration);
    } else if (newPhase === PHASES.FINISHED) {
      setTimeLeft(0);
    }
    setPhase(newPhase);
  };

  const getProgress = (total, current) => {
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, ((total - current) / total) * 100));
  };

  return {
    phase, // Current state: 'prep', 'recording', etc.
    setPhase: handleSetPhase,
    timeLeft, 
    prepLeft: phase === PHASES.PREP ? timeLeft : 0,
    middleLeft: phase === PHASES.ACTIVE_MIDDLE ? timeLeft : 0,
    recLeft: phase === PHASES.RECORDING ? timeLeft : 0,
    prepProgress: phase === PHASES.PREP ? getProgress(prepDuration, timeLeft) : (phase === PHASES.PREP ? 0 : 100),
    middleProgress: phase === PHASES.ACTIVE_MIDDLE ? getProgress(middleDuration, timeLeft) : 0,
    recProgress: phase === PHASES.RECORDING ? getProgress(recDuration, timeLeft) : 0,
  };
}