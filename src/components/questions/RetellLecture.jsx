// src/components/RetellLecture.jsx (Simplified and Reusable)

"use client";
import { useEffect, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { useExamStore } from "@/store";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useMediaPlayback } from "../hooks/useMediaPlayback";
import { useSequentialTimer, PHASES } from "../hooks/useSequentialTimer";

export default function RetellLecture({
  audioUrl,
  videoUrl,
  prepSeconds = 10,
  // 1. SUGGESTION: Set recordPrepSeconds to 0 to remove the 5-second pause
  recordPrepSeconds = 0, // <--- Set to 0
  recordSeconds = 40,
  questionId,
  audioSum,
}) {
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const globalPhase = useExamStore((s) => s.setPhase);
  const isVideo = Boolean(videoUrl && videoUrl.trim().length > 0);
  const mediaSrc = isVideo ? videoUrl : audioUrl;

  // --- 1. I/O Hooks ---
  const {
    startRecording: startAudio,
    stopRecording: stopAudio,
    cleanupStream: cleanupAudio,
    error: recorderError,
  } = useAudioRecorder(setAnswerKey, recordSeconds);

  // Placeholder for setPhase, will be destructured from useSequentialTimer later
  let setPhase;

  // Media Playback End Handler: Transition flow (Playing -> Recording)
  const handleMediaPlaybackEnd = useCallback(
    (wasBlocked) => {
      // 2. SUGGESTION: Transition from Playing/Prep to Recording
      if (wasBlocked) {
        // Media failed/blocked: Go straight to recording/start audio
        setPhase(PHASES.RECORDING);
        startAudio();
      } else {
        // Media finished successfully: Go straight to recording/start audio
        setPhase(PHASES.RECORDING);
        startAudio();
      }
    },
    [setPhase, startAudio]
  );

  const {
    mediaRef,
    mediaProgress,
    mediaTime,
    startMediaPlayback,
    formatTime,
  } = useMediaPlayback(mediaSrc, handleMediaPlaybackEnd, (p) => setPhase(p));

  // --- 2. Timer Hook Definition ---
  const timerHook = useSequentialTimer(
    prepSeconds,
    recordPrepSeconds, // Will be 0, skipping the middle phase countdown
    recordSeconds,
    questionId, // Reset key

    // onPrepEnd: Prep ends -> Start Media/Recording
    // (This is the critical transition point)
    (hasMiddlePhase) => {
      // Since hasMiddlePhase will be false (recordPrepSeconds = 0), this logic is cleaner:
      if (mediaSrc) {
        // Prep ends, start media. Successful playback will trigger handleMediaPlaybackEnd -> startAudio.
        // We set the phase here to ACTIVE_MIDDLE to signify the start of the next process (Playing).
        startMediaPlayback(PHASES.ACTIVE_MIDDLE);
      } else {
        // No media, skip straight to recording
        timerHook.setPhase(PHASES.RECORDING);
        startAudio();
      }
    },

    // onMiddleEnd: Middle ends -> Start Recording (Skipped because recordPrepSeconds = 0)
    () => {
      // This is here for compatibility but won't be called if middleSeconds=0
      timerHook.setPhase(PHASES.RECORDING);
      startAudio();
    },

    // onRecordEnd: Recording ends -> Stop Recording
    () => {
      stopAudio();
      // The timer hook already sets PHASES.FINISHED
    }
  );

  // Destructure timer properties, including the actual setPhase
  ({ setPhase } = timerHook);
  const {
    phase,
    prepLeft,
    middleLeft,
    recLeft,
    prepProgress,
    middleProgress,
    recProgress,
    isMiddlePhaseActive,
  } = timerHook;

  // --- 3. Effects ---

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. SUGGESTION: Update global phase state for the parent ExamShell
  // The logic is: Next button disabled during Prep/Playing/Recording, enabled during Finished.
  useEffect(() => {
    // We want the parent modal to disable the Next button until recording is done.
    if (phase === PHASES.PREP || phase === PHASES.ACTIVE_MIDDLE) {
      // Set global phase to "prep" or "active" to keep the Next button disabled.
      globalPhase("prep"); 
    } else if (phase === PHASES.RECORDING) {
      // Set global phase to "recording" to keep the Next button disabled.
      globalPhase("recording");
    } else if (phase === PHASES.FINISHED) {
      // Set global phase to "finished" to enable the Next button.
      globalPhase("finished");
    } else if (phase === PHASES.ERROR) {
       // Enable Next button if there's an error, allowing user to advance
       globalPhase("finished"); 
    }
  }, [phase, globalPhase]);

  const currentError = recorderError;

  // --- UI Render ---
  return (
    <div className="space-y-6">
      {currentError && (
        <div className="text-red-600 text-sm">{currentError}</div>
      )}
      {audioSum && <h2>{audioSum}</h2>}

      {/* Media Element (Hidden) */}
      {isVideo ? (
        <video
          ref={mediaRef}
          src={videoUrl || ""}
          style={{ display: "none" }}
        />
      ) : (
        <audio
          ref={mediaRef}
          src={audioUrl || ""}
          style={{ display: "none" }}
        />
      )}

      {/* Display Logic - Unified PHASES */}

      {/* Prep UI (PHASES.PREP) */}
      {phase === PHASES.PREP && (
        <div className="space-y-2">
          <div className="font-medium text-gray-800">
            **Preparing…** ({prepLeft}s)
          </div>
          <Progress value={prepProgress} />
          <div className="text-xs text-gray-600">
            Media will play automatically.
          </div>
        </div>
      )}

      {/* Active Middle UI (PHASES.ACTIVE_MIDDLE) - Used here only for "Playing Media" */}
      {phase === PHASES.ACTIVE_MIDDLE && (
        <div className="space-y-2">
          <div className="font-medium text-gray-800">
            **Playing media…**
          </div>
          <div className="text-xs text-gray-600">
            {`${formatTime(mediaTime.current)} / ${formatTime(mediaTime.total)}`}
          </div>
          <Progress value={Math.round(mediaProgress)} />
        </div>
      )}

      {/* Recording UI (PHASES.RECORDING) */}
      {phase === PHASES.RECORDING && (
        <div className="space-y-2">
          <div className="font-medium text-gray-800">
            🔴 **Recording…** ({recLeft}s)
          </div>
          <Progress value={recProgress} />
          <div className="text-xs text-gray-600">
            Your response is being recorded. It will stop automatically.
          </div>
        </div>
      )}

      {/* Finished UI (PHASES.FINISHED) */}
      {phase === PHASES.FINISHED && (
        <div className="space-y-2">
          <div className="font-medium text-gray-800">
            ✅ **Recording finished.** Click Next to proceed.
          </div>
        </div>
      )}

      {/* Error UI (PHASES.ERROR) */}
      {phase === PHASES.ERROR && (
        <div className="space-y-2">
          <div className="font-medium text-red-600">
            ❌ **An unexpected error occurred.**
          </div>
        </div>
      )}
    </div>
  );
}