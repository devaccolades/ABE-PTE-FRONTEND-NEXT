// src/components/DescribeImage.jsx

"use client";
import { useEffect } from "react";
import { useExamStore } from "@/store";
import Image from "next/image";

// Import reusable hooks and constants
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useSequentialTimer, PHASES } from "../hooks/useSequentialTimer";
import RecordingStatusDisplay from "../hooks/RecordingStatusDisplay";

export default function DescribeImage({
  imageUrl,
  prepSeconds = 30,
  recordSeconds = 40,
  questionId,
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

  // --- 2. Sequential Timer Hook ---
  
  // We need to assign the hook to a variable first so we can access 'setPhase' inside the callbacks
  const timerHook = useSequentialTimer(
    prepSeconds,
    0, 
    recordSeconds,
    questionId, 

    // onPrepEnd: Prep ends -> Start Recording
    () => {
      // 🔴 FIX: Explicitly tell the timer to switch phase
      timerHook.setPhase(PHASES.RECORDING); 
      startAudio();
    },

    // onMiddleEnd: Skipped
    () => {},

    // onRecordEnd: Recording ends -> Stop Recording
    () => {
      stopAudio();
      // The timer hook usually handles setting FINISHED automatically when time runs out,
      // but explicitly setting it here ensures safety if manual stop is triggered.
      timerHook.setPhase(PHASES.FINISHED);
    }
  );

  // Destructure values from the hook instance
  const {
    phase,
    prepLeft,
    recLeft,
    prepProgress,
    recProgress,
  } = timerHook;

  // --- 3. Effects ---

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  // Global Phase Logic
  useEffect(() => {
    if (phase === PHASES.PREP || phase === PHASES.ACTIVE_MIDDLE) {
      globalPhase("prep");
    } else if (phase === PHASES.RECORDING) {
      globalPhase("recording");
    } else if (phase === PHASES.FINISHED || phase === PHASES.ERROR) {
      globalPhase("finished");
    }
  }, [phase, globalPhase]);

  const currentError = recorderError;

  // ---------------- UI ----------------
  return (
    <div className="space-y-4">
      <div className="border rounded overflow-hidden shadow-sm flex justify-center bg-white">
        <Image
          src={imageUrl}
          alt="Describe visual"
          width={600}
          height={400}
          className="max-h-96 w-auto object-contain"
        />
      </div>

      <RecordingStatusDisplay
          phase={phase}
          prepLeft={prepLeft}
          recLeft={recLeft}
          prepProgress={prepProgress}
          recProgress={recProgress}
          error={currentError}
      />
    </div>
  );
}