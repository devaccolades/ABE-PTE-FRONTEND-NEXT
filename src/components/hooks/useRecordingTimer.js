// src/hooks/useRecordingTimer.js

import { useState, useEffect, useRef } from 'react';

export const PHASES = {
  PREP: 'prep',
  RECORDING: 'recording',
  FINISHED: 'finished',
};

export function useRecordingTimer(
  prepDuration,
  recDuration,
  onPrepEnd,
  onRecordEnd,
  triggerReset
) {
  const [phase, setPhase] = useState(PHASES.PREP);
  const [timeLeft, setTimeLeft] = useState(prepDuration);
  
  const phaseEndTimeRef = useRef(0);
  const hasTriggeredEndRef = useRef(false);

  // Updates the absolute timestamp for the countdown
  const startPhaseTimer = (duration) => {
    phaseEndTimeRef.current = Date.now() + duration * 1000;
    setTimeLeft(duration);
    hasTriggeredEndRef.current = false;
  };

  // Reset when question changes
  useEffect(() => {
    setPhase(PHASES.PREP);
    startPhaseTimer(prepDuration);
  }, [triggerReset, prepDuration]);

  // High-precision loop
  useEffect(() => {
    if (phase === PHASES.FINISHED) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const msRemaining = phaseEndTimeRef.current - now;
      const secondsRemaining = Math.ceil(msRemaining / 1000);

      setTimeLeft(secondsRemaining > 0 ? secondsRemaining : 0);

      if (msRemaining <= 0 && !hasTriggeredEndRef.current) {
        hasTriggeredEndRef.current = true;
        
        if (phase === PHASES.PREP) {
          // Notify component that prep is over
          onPrepEnd(); 
        } else if (phase === PHASES.RECORDING) {
          setPhase(PHASES.FINISHED);
          onRecordEnd();
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [phase, onPrepEnd, onRecordEnd]);

  // Wrapper used by the component to trigger the RECORDING phase
  const handleSetPhase = (newPhase) => {
    if (newPhase === PHASES.RECORDING) {
      startPhaseTimer(recDuration);
    } else if (newPhase === PHASES.FINISHED) {
      setTimeLeft(0);
    }
    setPhase(newPhase);
  };

  const getProgress = (total, current) => 
    Math.min(100, Math.max(0, ((total - current) / total) * 100));

  return {
    phase,
    setPhase: handleSetPhase,
    timeLeft,
    prepLeft: phase === PHASES.PREP ? timeLeft : 0,
    recLeft: phase === PHASES.RECORDING ? timeLeft : 0,
    prepProgress: phase === PHASES.PREP ? getProgress(prepDuration, timeLeft) : 100,
    recProgress: phase === PHASES.RECORDING ? getProgress(recDuration, timeLeft) : 0,
  };
}