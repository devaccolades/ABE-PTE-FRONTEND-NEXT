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
  name
}) {
  const globalPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const isStopSignalSent = useExamStore((s) => s.isStopSignalSent);
  const setStopSignal = useExamStore((s) => s.setStopSignal);

  // --- 1. Audio Recorder ---
  // Pass setAnswerKey to save the blob to "answer_audio"
  const {
    startRecording: startAudio,
    stopRecording: stopAudio,
    cleanupStream: cleanupAudio,
    error: recorderError,
  } = useAudioRecorder(setAnswerKey, recordSeconds);

  // --- 2. Initial Data Setup ---
  useEffect(() => {
    // Ensure the 'answer' text field is an empty string for audio-only tasks
    setAnswerKey("answer", ""); 
    // Initialize audio as null until recording finishes
    setAnswerKey("answer_audio", null); 
  }, [setAnswerKey, promptText]);

  // --- 3. Section Timer ---
  const handleSectionTimeExpired = useCallback(() => {
    stopAudio();
  }, [stopAudio]);

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer(handleSectionTimeExpired);

  // --- 4. Recording Timer Logic ---
  const timerHook = useRecordingTimer(
    prepSeconds,
    recordSeconds,
    async () => {
      if (isSectionExpired) return;
      timerHook.setPhase(PHASES.RECORDING);
      const success = await startAudio();
      if (!success) timerHook.setPhase(PHASES.FINISHED);
    },
    () => {
      stopAudio();
      timerHook.setPhase(PHASES.FINISHED);
    },
    promptText
  );

  const { phase, prepLeft, recLeft, prepProgress, recProgress } = timerHook;

  // --- 5. Effects for Sync ---

  // Handle Stop Signal (from Next button)
  useEffect(() => {
    if (isStopSignalSent) {
      if (phase === PHASES.RECORDING) {
        stopAudio();
      }
      timerHook.setPhase(PHASES.FINISHED);
      setStopSignal(false);
    }
  }, [isStopSignalSent, phase, stopAudio, setStopSignal, timerHook]);

  // Sync Global Phase
  useEffect(() => {
    const currentPhase = isSectionExpired ? PHASES.FINISHED : phase;
    globalPhase(currentPhase);
  }, [phase, globalPhase, isSectionExpired]);

  // Cleanup
  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight uppercase">{name}</h2>
          {/* <p className="text-sm text-gray-500">Look at the text below. In {prepSeconds} seconds, you must read this text aloud.</p> */}
        </div>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      <div className="rounded-xl border border-gray-200 p-8 bg-white shadow-sm ring-1 ring-gray-900/5">
        <p className="text-xl leading-relaxed text-gray-800 font-medium selection:bg-sky-100">
          {promptText}
        </p>
      </div>

      {isSectionExpired ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-center font-medium">
          Time is up. Your recording has been submitted.
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
    </div>
  );
}