// src/components/ReadAloud.jsx

"use client";
import { useEffect, useCallback } from "react";
import { useExamStore } from "@/store";

// UI Components
import RecordingStatusDisplay from "../hooks/RecordingStatusDisplay"; 
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

// Hooks
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { PHASES, useRecordingTimer } from "../hooks/useRecordingTimer";
import { useSectionTimer } from "../hooks/useSectionTimer";

export default function ReadAloud({
  promptText,
  prepSeconds = 30,
  recordSeconds = 45,
  subsection = "Read Aloud",
}) {
  const globalPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const isStopSignalSent = useExamStore((s) => s.isStopSignalSent);
  const setStopSignal = useExamStore((s) => s.setStopSignal);

  // --- 1. Audio Recorder ---
  const {
    startRecording: startAudio,
    stopRecording: stopAudio,
    cleanupStream: cleanupAudio,
    error: recorderError,
  } = useAudioRecorder(setAnswerKey, recordSeconds);

  // --- 2. Section Timer (Global) ---
  const handleSectionTimeExpired = useCallback(() => {
    stopAudio();
    // Logic for ending the whole section is handled via isExpired effect below
  }, [stopAudio]);

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer(handleSectionTimeExpired);

  // --- 3. Local Question Timer (Delta-Time Logic) ---
  const timerHook = useRecordingTimer(
    prepSeconds,
    recordSeconds,
    // onPrepEnd
    async () => {
      if (isSectionExpired) return;

      // Update UI to Recording Phase immediately
      timerHook.setPhase(PHASES.RECORDING);

      // Trigger actual hardware recording
      const success = await startAudio();
      if (!success) {
        timerHook.setPhase(PHASES.FINISHED);
      }
    },
    // onRecordEnd
    () => {
      stopAudio();
      timerHook.setPhase(PHASES.FINISHED);
    },
    promptText // Trigger reset when text changes
  );

  const {
    phase,
    prepLeft,
    recLeft,
    prepProgress,
    recProgress,
  } = timerHook;

  // --- 4. Effects for State Sync ---

  // Handle Section Expiration
  useEffect(() => {
    if (isSectionExpired) {
      stopAudio();
      timerHook.setPhase(PHASES.FINISHED);
    }
  }, [isSectionExpired, stopAudio]);

  // Handle External Next/Stop Signal
  useEffect(() => {
    if (isStopSignalSent && phase === PHASES.RECORDING) {
      stopAudio();
      timerHook.setPhase(PHASES.FINISHED);
      setStopSignal(false);
    }
  }, [isStopSignalSent, phase, stopAudio, setStopSignal]);

  // Sync with Global Store Phase (enables/disables Next button)
  useEffect(() => {
    if (isSectionExpired) {
      globalPhase(PHASES.FINISHED);
    } else {
      globalPhase(phase);
    }
  }, [phase, globalPhase, isSectionExpired]);

  // Cleanup on Unmount
  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  // --- 5. UI Render ---
  return (
    <div className="space-y-6">
      {/* Top Header with Section Timer */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{subsection}</h2>
          <p className="text-sm text-gray-500">Read the text below into the microphone.</p>
        </div>
        <SectionTimerDisplay 
          formattedTime={formattedTime} 
          isExpired={isSectionExpired} 
        />
      </div>

      {/* Main Content: The Text to Read */}
      <div className="rounded-xl border-2 border-blue-50 p-6 bg-white shadow-sm ring-1 ring-gray-200">
        <p className="text-lg leading-relaxed text-gray-800 font-medium">
          {promptText}
        </p>
      </div>

      {/* Recording Logic UI */}
      {isSectionExpired ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center font-medium">
          ⚠️ Section time has expired. Your progress has been saved.
        </div>
      ) : (
        <RecordingStatusDisplay
          phase={phase}
          prepLeft={prepLeft}
          recLeft={recLeft}
          prepProgress={prepProgress}
          recProgress={recProgress}
          error={recorderError}
        />
      )}

      {/* Footer Info */}
      <div className="text-xs text-gray-400 text-center italic">
        {phase === PHASES.PREP && "Preparation phase: Read the text silently."}
        {phase === PHASES.RECORDING && "Recording: Speak clearly now."}
        {phase === PHASES.FINISHED && "Ready: Click next to proceed."}
      </div>
    </div>
  );
}