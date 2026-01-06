"use client";
import { useEffect, useCallback } from "react";
import { useExamStore } from "@/store";
import { ImageIcon } from "lucide-react";

// Import reusable hooks and constants
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useSequentialTimer, PHASES } from "../hooks/useSequentialTimer";
import { useSectionTimer } from "../hooks/useSectionTimer";
import RecordingStatusDisplay from "../hooks/RecordingStatusDisplay";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function DescribeImage({
  imageUrl,
  prepSeconds = 25,
  recordSeconds = 40,
  questionId,
  subsection = "Describe Image",
}) {
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const globalPhase = useExamStore((s) => s.setPhase);
  const stopSignal = useExamStore((s) => s.stopSignal);

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
  }, [stopAudio]);

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer(
    handleSectionTimeExpired
  );

  // --- 3. Sequential Timer Hook (Local) ---
  const timerHook = useSequentialTimer(
    prepSeconds,
    0, 
    recordSeconds,
    questionId,
    () => {
      if (isSectionExpired) return;
      timerHook.setPhase(PHASES.RECORDING);
      startAudio();
    },
    () => {},
    () => {
      stopAudio();
      timerHook.setPhase(PHASES.FINISHED);
    }
  );

  const { phase, prepLeft, recLeft, prepProgress, recProgress } = timerHook;

  // --- 4. Effects ---

  // Handle ExamShell Stop Signal
  useEffect(() => {
    if (stopSignal && phase === PHASES.RECORDING) {
      stopAudio();
      timerHook.setPhase(PHASES.FINISHED);
    }
  }, [stopSignal, stopAudio, phase, timerHook]);

  // Handle Section Expiration
  useEffect(() => {
    if (isSectionExpired) {
      stopAudio();
      timerHook.setPhase(PHASES.FINISHED);
    }
  }, [isSectionExpired, stopAudio, timerHook]);

  // Sync Global Phase
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

  // ---------------- UI ----------------
  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {/* HEADER: Stacks on mobile */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 md:pb-4 gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-sky-600 shrink-0" />
          <h2 className="text-lg md:text-xl font-bold text-gray-800 uppercase tracking-tight truncate">
            {subsection}
          </h2>
        </div>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isSectionExpired}
        />
      </div>

      {/* IMAGE DISPLAY: Responsive sizing */}
      <div className="border-2 border-gray-100 rounded-xl overflow-hidden shadow-sm flex justify-center bg-white p-2 md:p-4">
        <div className="relative w-full flex justify-center">
          <img
            src={imageUrl}
            alt="Describe visual content"
            className="h-auto max-h-[250px] sm:max-h-[350px] md:max-h-[450px] w-full object-contain transition-transform duration-500 hover:scale-[1.02]"
          />
        </div>
      </div>

      {/* STATUS DISPLAY */}
      <div className="w-full">
        {isSectionExpired ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center font-medium text-xs md:text-sm animate-pulse">
            ⚠️ Section time expired. Your recording was saved.
          </div>
        ) : (
          <div className="bg-slate-50/50 rounded-xl p-3 md:p-6 border border-slate-100">
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

      {/* HELP TEXT */}
      <div className="text-center px-4">
        <p className="text-[10px] md:text-xs text-gray-400 italic font-medium">
          {phase === PHASES.PREP && "Analyze the chart/image and prepare your response."}
          {phase === PHASES.RECORDING && "Microphone active: Describe the image details now."}
          {phase === PHASES.FINISHED && "Recording completed."}
        </p>
      </div>
    </div>
  );
}