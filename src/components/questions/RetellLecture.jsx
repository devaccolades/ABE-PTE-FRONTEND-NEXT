// src/components/RetellLecture.jsx

"use client";
import { useEffect, useCallback, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { useExamStore } from "@/store";

// Hooks & Components
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useMediaPlayback } from "../hooks/useMediaPlayback";
import { useSequentialTimer, PHASES } from "../hooks/useSequentialTimer";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function RetellLecture({
  audioUrl,
  videoUrl,
  prepSeconds = 10,
  recordSeconds = 40,
  questionId,
  audioSum,
  subsection,
}) {
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const globalPhase = useExamStore((s) => s.setPhase);

  // --- 1. Dynamic Prep Logic (10s for specific types) ---
  const recordPrepSeconds = useMemo(() => {
    const specialTypes = ["summarise_group_discussion", "respond_to_a_situation"];
    return specialTypes.includes(subsection) ? 10 : 0;
  }, [subsection]);

  // --- 2. Section Timer ---
  const handleSectionTimeExpired = useCallback(() => {
    stopAudio();
    if (pauseMedia) pauseMedia();
  }, []);

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer(handleSectionTimeExpired);

  // --- 3. Audio Recorder ---
  const {
    startRecording: startAudio,
    stopRecording: stopAudio,
    cleanupStream: cleanupAudio,
    error: recorderError,
  } = useAudioRecorder(setAnswerKey, recordSeconds);

  // --- 4. High-Precision Sequential Timer ---
  const timerHook = useSequentialTimer(
    prepSeconds,
    recordPrepSeconds,
    recordSeconds,
    questionId,
    // onPrepEnd: Initial Prep Done -> Play Media
    (hasMiddlePhase) => {
      if (isSectionExpired) return;
      if (mediaSrc) {
        startMediaPlayback(PHASES.ACTIVE_MIDDLE);
      } else {
        // Fallback if no file exists
        timerHook.setPhase(hasMiddlePhase ? PHASES.ACTIVE_MIDDLE : PHASES.RECORDING);
        if (!hasMiddlePhase) startAudio();
      }
    },
    // onMiddleEnd: 10s Prep Done -> Start Recording
    () => {
      if (isSectionExpired) return;
      timerHook.setPhase(PHASES.RECORDING);
      startAudio();
    },
    // onRecordEnd
    () => stopAudio()
  );

  const {
    phase,
    setPhase,
    prepLeft,
    middleLeft,
    recLeft,
    prepProgress,
    middleProgress,
    recProgress,
  } = timerHook;

  // --- 5. Media Playback Logic ---
  const handleMediaPlaybackEnd = useCallback(
    (wasBlocked) => {
      if (isSectionExpired) return;
      // After media ends, either go to 10s Prep or straight to Recording
      if (wasBlocked || recordPrepSeconds === 0) {
        setPhase(PHASES.RECORDING);
        startAudio();
      } else {
        setPhase(PHASES.ACTIVE_MIDDLE);
      }
    },
    [setPhase, startAudio, recordPrepSeconds, isSectionExpired]
  );
  
  const isVideo = Boolean(videoUrl && videoUrl.trim().length > 0);
  const mediaSrc = isVideo ? videoUrl : audioUrl;
  const {
    mediaRef,
    mediaProgress,
    mediaTime,
    startMediaPlayback,
    formatTime,
    pauseMedia,
  } = useMediaPlayback(mediaSrc, handleMediaPlaybackEnd, (p) => setPhase(p));


  // --- 6. NEXT BUTTON & STYLE LOGIC ---
  
  const isMediaPlaying = phase === PHASES.ACTIVE_MIDDLE && mediaProgress < 100;
  const isPostMediaPrep = phase === PHASES.ACTIVE_MIDDLE && mediaProgress >= 100;

  useEffect(() => {
    // Logic: Enable "Next" button ONLY if recording has started or finished
    if (isSectionExpired || phase === PHASES.RECORDING || phase === PHASES.FINISHED) {
      globalPhase("finished"); // This ENABLES the Next button
    } else {
      globalPhase("active"); // This DISABLES the Next button
    }
  }, [phase, globalPhase, isSectionExpired]);

  useEffect(() => {
    if (isSectionExpired) {
      pauseMedia();
      stopAudio();
      setPhase(PHASES.FINISHED);
    }
  }, [isSectionExpired, pauseMedia, stopAudio, setPhase]);

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase">
          {subsection?.replace(/_/g, " ")}
        </h2>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[160px] flex flex-col justify-center">
        {isSectionExpired ? (
          <p className="text-red-600 text-center font-bold">Section Time Expired</p>
        ) : (
          <>
            {/* 1. INITIAL PREP STYLE (Grey) */}
            {phase === PHASES.PREP && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-semibold text-gray-500">
                  <span>Preparation</span>
                  <span>{prepLeft}s</span>
                </div>
                <Progress value={prepProgress} className="h-2 bg-gray-100" />
              </div>
            )}

            {/* 2. MEDIA PLAYING STYLE (Blue) */}
            {isMediaPlaying && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-semibold text-blue-600">
                  <span>Playing Audio...</span>
                  <span>{formatTime(mediaTime.current)} / {formatTime(mediaTime.total)}</span>
                </div>
                <Progress value={Math.round(mediaProgress)} className="h-2 bg-blue-50" />
              </div>
            )}

            {/* 3. POST-MEDIA 10S PREP STYLE (Orange) */}
            {isPostMediaPrep && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-semibold text-orange-600">
                  <span>Preparation (Post-Media)</span>
                  <span>{middleLeft}s</span>
                </div>
                <Progress value={middleProgress} className="h-2 bg-orange-50" />
              </div>
            )}

            {/* 4. RECORDING STYLE (Red) */}
            {phase === PHASES.RECORDING && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-semibold text-red-600">
                  <span>🔴 Recording...</span>
                  <span>{recLeft}s</span>
                </div>
                {/* Red recording bar */}
                <div className="h-2 w-full bg-red-100 rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-red-600 transition-all duration-300" 
                    style={{ width: `${recProgress}%` }}
                   />
                </div>
              </div>
            )}

            {/* 5. FINISHED STYLE */}
            {phase === PHASES.FINISHED && (
              <div className="text-center text-green-600 font-bold animate-in fade-in">
                ✅ Completed. You may click Next.
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden Audio/Video Elements */}
      {isVideo ? (
        <video ref={mediaRef} src={videoUrl} className="hidden" />
      ) : (
        <audio ref={mediaRef} src={audioUrl} className="hidden" />
      )}
    </div>
  );
}