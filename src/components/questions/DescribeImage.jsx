// src/components/DescribeImage.jsx

"use client";
import { useEffect, useCallback } from "react";
import { useExamStore } from "@/store";
import Image from "next/image";

// Import reusable hooks and constants
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useSequentialTimer, PHASES } from "../hooks/useSequentialTimer";
import { useSectionTimer } from "../hooks/useSectionTimer";
import RecordingStatusDisplay from "../hooks/RecordingStatusDisplay";
import SectionTimerDisplay from "../ui/SectionTimerDisplay"; // <--- Corrected Path

export default function DescribeImage({
  imageUrl,
  prepSeconds = 25,
  recordSeconds = 40,
  questionId,
  subsection = "Describe Image",
}) {
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const globalPhase = useExamStore((s) => s.setPhase);

  // --- 1. Audio Recorder Hook ---
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

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer(
    handleSectionTimeExpired
  );

  // --- 3. Sequential Timer Hook (Local) ---
  const timerHook = useSequentialTimer(
    prepSeconds,
    0, // No middle phase for Describe Image
    recordSeconds,
    questionId,

    // onPrepEnd: Prep ends -> Start Recording
    () => {
      if (isSectionExpired) return;
      // Tell the timer to switch phase and reset anchor time to recordSeconds
      timerHook.setPhase(PHASES.RECORDING);
      startAudio();
    },

    // onMiddleEnd: Skipped
    () => {},

    // onRecordEnd: Recording ends -> Stop Recording
    () => {
      stopAudio();
      timerHook.setPhase(PHASES.FINISHED);
    }
  );

  const { phase, prepLeft, recLeft, prepProgress, recProgress } = timerHook;

  // --- 4. Effects ---

  // Handle Section Expiration
  useEffect(() => {
    if (isSectionExpired) {
      stopAudio();
      timerHook.setPhase(PHASES.FINISHED);
    }
  }, [isSectionExpired, stopAudio]);

  // Sync Global Phase (Controls "Next" button)
  useEffect(() => {
    if (isSectionExpired) {
      globalPhase(PHASES.FINISHED);
    } else if (phase === PHASES.PREP || phase === PHASES.ACTIVE_MIDDLE) {
      globalPhase("prep");
    } else if (phase === PHASES.RECORDING) {
      globalPhase("recording");
    } else if (phase === PHASES.FINISHED || phase === PHASES.ERROR) {
      globalPhase("finished");
    }
  }, [phase, globalPhase, isSectionExpired]);

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  const currentError = recorderError;

  // ---------------- UI ----------------
  return (
    <div className="space-y-6">
      {/* Header with Global Section Timer */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">
          {subsection}
        </h2>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isSectionExpired}
        />
      </div>

      {/* Image Display */}
      <div className="border-2 border-gray-100 rounded-xl overflow-hidden shadow-sm flex justify-center bg-white p-2">
        <img
          src={imageUrl}
          alt="Describe visual"
          width={600}
          height={400}
          className="max-h-80 w-auto object-contain transition-all hover:scale-[1.01]"
        />
      </div>

      {/* Timer & Recording Status */}
      {isSectionExpired ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center font-medium animate-pulse">
          ⚠️ Section time expired. Your recording was saved.
        </div>
      ) : (
        <RecordingStatusDisplay
          phase={phase}
          prepLeft={prepLeft}
          recLeft={recLeft}
          prepProgress={prepProgress}
          recProgress={recProgress}
          error={currentError}
        />
      )}

      <div className="text-center text-xs text-gray-400 italic">
        {phase === PHASES.PREP &&
          "Look at the image and prepare your description."}
        {phase === PHASES.RECORDING && "Recording... describe the image now."}
      </div>
    </div>
  );
}
