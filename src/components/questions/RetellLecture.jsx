"use client";
import { useEffect, useCallback, useMemo, useState, useRef } from "react";
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
  subsection,
}) {
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const globalPhase = useExamStore((s) => s.setPhase);

  // --- 1. STRICT STAGE CONTROL ---
  const [stage, setStage] = useState("PREP");
  const stageRef = useRef("PREP");

  const updateStage = (newStage) => {
    setStage(newStage);
    stageRef.current = newStage;
  };

  const recordPrepSeconds = useMemo(() => {
    const specialTypes = [
      "summarise_group_discussion",
      "respond_to_a_situation",
    ];
    return specialTypes.includes(subsection) ? 10 : 0;
  }, [subsection]);

  // --- 2. ENGINES ---
  const { startRecording, stopRecording, cleanupStream } = useAudioRecorder(
    setAnswerKey,
    recordSeconds
  );

  // This function handles the logic for starting the recording exactly when the UI flips
  const triggerRecordingStart = useCallback(() => {
    updateStage("RECORDING");
    // FORCE the timer hook into the recording phase so the red bar moves
    timerHook.setPhase(PHASES.RECORDING);
    startRecording();
  }, [startRecording]);

  const handleMediaPlaybackEnd = useCallback(() => {
    if (recordPrepSeconds > 0) {
      // If we have special 10s prep, the useSequentialTimer will naturally
      // trigger onMiddleEnd when those 10s are up.
      updateStage("GAP");
      timerHook.setPhase(PHASES.ACTIVE_MIDDLE);
    } else {
      updateStage("GAP");
      // Standard: 1.5s visual buffer then start
      setTimeout(() => {
        if (stageRef.current === "GAP") {
          triggerRecordingStart();
        }
      }, 1500);
    }
  }, [recordPrepSeconds, triggerRecordingStart]);

  const isVideo = Boolean(videoUrl?.trim().length > 0);
  const mediaSrc = isVideo ? videoUrl : audioUrl;

  const {
    mediaRef,
    mediaProgress,
    mediaTime,
    startMediaPlayback,
    formatTime,
    pauseMedia,
  } = useMediaPlayback(mediaSrc, handleMediaPlaybackEnd, () => {});

  // Add this inside your RetellLecture component
  const stopSignal = useExamStore((s) => s.stopSignal);

  useEffect(() => {
    // If the ExamShell signals a stop, and we are currently recording or playing
    if (stopSignal) {
      console.log("phase", stageRef.current);
      if (stageRef.current === "RECORDING") {
        console.log("inside the stop recording");
        stopRecording(); // This hook internally calls setAnswerKey with the blob
        updateStage("FINISHED");
      } else if (
        stageRef.current === "PLAYING" ||
        stageRef.current === "PREP"
      ) {
        // If we haven't even started recording, just move to finished
        updateStage("FINISHED");
        if (pauseMedia) pauseMedia();
      }
    }
  }, [stopSignal, stopRecording, pauseMedia]);

  const timerHook = useSequentialTimer(
    prepSeconds,
    recordPrepSeconds,
    recordSeconds,
    questionId,
    // onPrepEnd
    () => {
      updateStage("PLAYING");
      startMediaPlayback(PHASES.ACTIVE_MIDDLE);
    },
    // onMiddleEnd (This is for the 10s post-media prep)
    () => {
      if (stageRef.current === "GAP") {
        triggerRecordingStart();
      }
    },
    // onRecordEnd
    () => {
      updateStage("FINISHED");
      stopRecording();
    }
  );

  // --- 3. SYNC GLOBAL STATE ---
  // --- 3. SYNC GLOBAL STATE ---
  useEffect(() => {
    // If we are currently recording, the user CAN click next,
    // but the Shell needs to know it must "STOP" the mic first.
    if (stage === "RECORDING") {
      globalPhase("recording");
    }
    // If the timer ended or stopRecording was already called
    else if (stage === "FINISHED") {
      globalPhase("finished");
    }
    // Preparation or Playing stages
    else {
      globalPhase("prep");
    }
  }, [stage, globalPhase]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase">
          {subsection?.replace(/_/g, " ")}
        </h2>
        <SectionTimerDisplay
          formattedTime={useSectionTimer(stopRecording).formattedTime}
          isExpired={false}
        />
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[160px] flex flex-col justify-center">
        {stage === "PREP" && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-semibold text-gray-500">
              <span>Preparation</span>
              <span>{timerHook.prepLeft}s</span>
            </div>
            <Progress
              value={timerHook.prepProgress}
              className="h-2 bg-gray-100"
            />
          </div>
        )}

        {stage === "PLAYING" && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-semibold text-blue-600">
              <span>Playing Audio...</span>
              <span>
                {formatTime(mediaTime.current)} / {formatTime(mediaTime.total)}
              </span>
            </div>
            <Progress
              value={Math.round(mediaProgress)}
              className="h-2 bg-blue-50"
            />
          </div>
        )}

        {stage === "GAP" && (
          <div className="space-y-3">
            {recordPrepSeconds > 0 ? (
              <>
                <div className="flex justify-between text-sm font-semibold text-orange-600">
                  <span>Preparation (Post-Media)</span>
                  <span>{timerHook.middleLeft}s</span>
                </div>
                <Progress
                  value={timerHook.middleProgress}
                  className="h-2 bg-orange-50"
                />
              </>
            ) : (
              <div className="text-center animate-pulse">
                <p className="text-blue-600 font-bold text-lg">
                  Ready to Record...
                </p>
              </div>
            )}
          </div>
        )}

        {stage === "RECORDING" && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-semibold text-red-600">
              <span>🔴 Recording...</span>
              <span>{timerHook.recLeft}s</span>
            </div>
            <div className="h-2 w-full bg-red-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all duration-1000 linear"
                style={{ width: `${timerHook.recProgress}%` }}
              />
            </div>
          </div>
        )}

        {stage === "FINISHED" && (
          <div className="text-center text-green-600 font-bold">
            ✅ Recorded. Click Next.
          </div>
        )}
      </div>

      {isVideo ? (
        <video ref={mediaRef} src={videoUrl} className="hidden" />
      ) : (
        <audio ref={mediaRef} src={audioUrl} className="hidden" />
      )}
    </div>
  );
}
