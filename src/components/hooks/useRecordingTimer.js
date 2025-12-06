// src/hooks/useRecordingTimer.js (or similar path)

import { useState, useEffect } from "react";

// Defines the component's state phases
export const PHASES = {
  PREP: "prep",
  RECORDING: "recording",
  FINISHED: "finished",
};

/**
 * Custom hook to manage the preparation and recording countdown phases.
 * * @param {number} prepSeconds - Total duration for the preparation phase.
 * @param {number} recordSeconds - Total duration for the recording phase.
 * @param {function} onPrepEnd - Callback to execute when prep phase ends (i.e., start recording).
 * @param {function} onRecordEnd - Callback to execute when recording phase ends (i.e., stop recording).
 * @param {any} resetKey - A dependency that triggers a state reset (e.g., promptText).
 * @returns {object} The current phase, remaining times, progress percentages, and setter functions.
 */
export function useRecordingTimer(prepSeconds, recordSeconds, onPrepEnd, onRecordEnd, resetKey) {
  const [phase, setPhase] = useState(PHASES.PREP);
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [recLeft, setRecLeft] = useState(recordSeconds);

  // Effect to handle state reset when the question changes
  useEffect(() => {
    setPhase(PHASES.PREP);
    setPrepLeft(prepSeconds);
    setRecLeft(recordSeconds);
  }, [resetKey, prepSeconds, recordSeconds]);

  // PREP countdown: automatically start recording when it reaches 0
  useEffect(() => {
    if (phase !== PHASES.PREP) return;
    if (prepLeft <= 0) {
      setPhase(PHASES.RECORDING); // Transition to recording phase
      if (typeof onPrepEnd === 'function') {
        onPrepEnd(); // Execute the startRecording function passed from the component
      }
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepLeft, onPrepEnd]);

  // RECORDING countdown: automatically stop when time is up
  useEffect(() => {
    if (phase !== PHASES.RECORDING) return;
    if (recLeft <= 0) {
      setPhase(PHASES.FINISHED); // Transition to finished phase
      if (typeof onRecordEnd === 'function') {
        onRecordEnd(); // Execute the stopRecording function passed from the component
      }
      return;
    }
    const t = setTimeout(() => setRecLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, recLeft, onRecordEnd]);

  const prepProgress = Math.round(
    ((prepSeconds - prepLeft) / Math.max(prepSeconds, 1)) * 100
  );
  const recProgress = Math.round(
    ((recordSeconds - recLeft) / Math.max(recordSeconds, 1)) * 100
  );

  return {
    phase,
    setPhase, // Exposed setter for external control (like the stop signal)
    prepLeft,
    recLeft,
    prepProgress,
    recProgress,
  };
}