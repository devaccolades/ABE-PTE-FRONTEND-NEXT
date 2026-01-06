"use client";
import React, { useEffect, useCallback } from "react";
import { Mic, AlertCircle } from "lucide-react";
import { useExamStore } from "@/store";

// UI Components
import RecordingStatusDisplay from "../hooks/RecordingStatusDisplay";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

// Hooks
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { PHASES, useRecordingTimer } from "../hooks/useRecordingTimer";
import { useSectionTimer } from "../hooks/useSectionTimer";

/**
 * ReadAloud Component
 * Handles the preparation and recording phases for PTE/English Speaking tasks.
 * Syncs with ExamShell via a 'stopSignal' for graceful audio saving.
 */
export default function ReadAloud({
  promptText,
  prepSeconds = 30,
  recordSeconds = 45,
  subsection = "Read Aloud",
  name,
}) {
  const setGlobalPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const isStopSignalSent = useExamStore((s) => s.stopSignal);
  const setStopSignal = useExamStore((s) => s.setStopSignal);

  // --- 1. Audio Recorder Hook ---
  const {
    startRecording: startAudio,
    stopRecording: stopAudio,
    cleanupStream: cleanupAudio,
    error: recorderError,
  } = useAudioRecorder(setAnswerKey, recordSeconds);

  // --- 2. Initial Data Setup ---
  useEffect(() => {
    // Clear previous answers on mount
    setAnswerKey("answer", "");
    setAnswerKey("answer_audio", null);
  }, [setAnswerKey, promptText]);

  // --- 3. Global Section Timer ---
  const handleSectionTimeExpired = useCallback(() => {
    stopAudio();
  }, [stopAudio]);

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer(
    handleSectionTimeExpired
  );

  // --- 4. Recording Timer Logic ---
  const timerHook = useRecordingTimer(
    prepSeconds,
    recordSeconds,
    async () => {
      // Callback: Start Recording after Prep
      if (isSectionExpired) return;
      timerHook.setPhase(PHASES.RECORDING);
      const success = await startAudio();
      if (!success) timerHook.setPhase(PHASES.FINISHED);
    },
    () => {
      // Callback: Stop Recording when time is up
      stopAudio();
      timerHook.setPhase(PHASES.FINISHED);
    },
    promptText
  );

  const { phase, prepLeft, recLeft, prepProgress, recProgress } = timerHook;

  // --- 5. Forced Stop Signal Logic (Safety Buffer) ---
  useEffect(() => {
    if (isStopSignalSent) {
      const handleForcedStop = async () => {
        // Stop recorder immediately so Blob processing starts
        if (phase === PHASES.RECORDING) {
          await stopAudio();
        }
        timerHook.setPhase(PHASES.FINISHED);
        
        // Acknowledge the signal back to ExamShell
        setStopSignal(false);
      };

      handleForcedStop();
    }
  }, [isStopSignalSent, phase, stopAudio, setStopSignal, timerHook]);

  // --- 6. Sync Global Phase and Cleanup ---
  useEffect(() => {
    const currentPhase = isSectionExpired ? PHASES.FINISHED : phase;
    setGlobalPhase(currentPhase);
  }, [phase, setGlobalPhase, isSectionExpired]);

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {/* HEADER: Responsive Title & Global Timer */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 md:pb-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-50 rounded-lg hidden sm:block">
            <Mic className="w-5 h-5 text-sky-600" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800 tracking-tight uppercase truncate">
            {name || subsection}
          </h2>
        </div>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isSectionExpired}
        />
      </div>

      {/* PROMPT AREA */}
      <div className="rounded-xl border border-gray-200 p-5 md:p-8 bg-white shadow-sm ring-1 ring-gray-900/5 transition-all">
        <p className="text-lg md:text-xl leading-relaxed md:leading-loose text-gray-800 font-medium selection:bg-sky-100">
          {promptText}
        </p>
      </div>

      {/* STATUS PANEL */}
      <div className="w-full">
        {isSectionExpired ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-center font-medium text-sm animate-in fade-in zoom-in">
            Time is up. Your recording has been locked and submitted.
          </div>
        ) : (
          <div className="bg-slate-50/50 rounded-xl p-4 md:p-6 border border-slate-100 shadow-inner">
            <RecordingStatusDisplay
              phase={phase}
              prepLeft={prepLeft}
              recLeft={recLeft}
              prepProgress={prepProgress}
              recProgress={recProgress}
              error={recorderError}
            />
          </div>
        )}
      </div>

      {/* ERROR HANDLING */}
      {recorderError && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold uppercase">{recorderError}</span>
        </div>
      )}

      {/* HELP TEXT */}
      {!isSectionExpired && phase === PHASES.PREPARATION && (
        <p className="text-center text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-[0.2em] animate-pulse">
          Recording will start automatically
        </p>
      )}
    </div>
  );
}