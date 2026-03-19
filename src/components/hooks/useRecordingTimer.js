// src/hooks/useRecordingTimer.js

import { useState, useEffect, useRef } from 'react';

// Primary responsibility: Provides a high-precision prep->recording countdown state machine for speaking tasks.
// Architecture role: Shared timing primitive used by question components to coordinate UI phase + audio recording lifecycle.

/**
 * @description Phases used by `useRecordingTimer` to represent the speaking task lifecycle.
 * @type {{ PREP: "prep", RECORDING: "recording", FINISHED: "finished" }}
 */
export const PHASES = {
  PREP: 'prep',
  RECORDING: 'recording',
  FINISHED: 'finished',
};

/**
 * @description Hook that manages a two-stage timer (prep then recording) using an absolute end timestamp.
 *
 * Why this uses an absolute end timestamp + fast interval:
 * - React interval drift can cause visible timer jitter on slower devices.
 * - Anchoring to `Date.now()` keeps the countdown accurate even when renders are delayed.
 * - `hasTriggeredEndRef` ensures callbacks fire once even if the interval ticks multiple times after \(t \le 0\).
 *
 * @param {number} prepDuration - Preparation duration in seconds.
 * @param {number} recDuration - Recording duration in seconds.
 * @param {() => void} onPrepEnd - Callback fired exactly once when prep time completes.
 * @param {() => void} onRecordEnd - Callback fired exactly once when recording time completes.
 * @param {any} triggerReset - Value used to reset the timer when the question changes.
 * @returns {{
 *   phase: string,
 *   setPhase: (newPhase: string) => void,
 *   timeLeft: number,
 *   prepLeft: number,
 *   recLeft: number,
 *   prepProgress: number,
 *   recProgress: number
 * }} Current phase/timing state and progress values for UI components.
 */
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

  // Updates the absolute timestamp for the countdown (keeps the timer accurate even if interval ticks drift).
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

  // High-precision loop: frequent interval keeps UI updates smooth while anchoring to `phaseEndTimeRef`.
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