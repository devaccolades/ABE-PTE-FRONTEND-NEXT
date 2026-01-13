"use client";
import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { useExamStore } from "@/store";
import { Headphones, Volume2, Mic } from "lucide-react";

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
  text,
}) {
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const globalPhase = useExamStore((s) => s.setPhase);
  const stopSignal = useExamStore((s) => s.stopSignal);

  // --- 1. MEDIA TYPE CLASSIFICATION ---
  const mediaType = useMemo(() => {
    if (!videoUrl) return "AUDIO_ONLY";

    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const isImg = imageExtensions.some((ext) =>
      videoUrl.toLowerCase().endsWith(ext)
    );

    if (isImg) return "AUDIO_AND_IMAGE";
    return "VIDEO_ONLY";
  }, [videoUrl]);

  const primaryMediaSrc = mediaType === "VIDEO_ONLY" ? videoUrl : audioUrl;

  // --- 2. STAGE CONTROL ---
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
      "retell_lecture",
    ];
    return specialTypes.includes(subsection) ? 10 : 0;
  }, [subsection]);

  // --- 3. ENGINES ---
  const { startRecording, stopRecording, cleanupStream } = useAudioRecorder(
    setAnswerKey,
    recordSeconds
  );

  const triggerRecordingStart = useCallback(() => {
    updateStage("RECORDING");
    timerHook.setPhase(PHASES.RECORDING);
    startRecording();
  }, [startRecording]);

  const handleMediaPlaybackEnd = useCallback(() => {
    if (recordPrepSeconds > 0) {
      updateStage("GAP");
      timerHook.setPhase(PHASES.ACTIVE_MIDDLE);
    } else {
      updateStage("GAP");
      setTimeout(() => {
        if (stageRef.current === "GAP") triggerRecordingStart();
      }, 1500);
    }
  }, [recordPrepSeconds, triggerRecordingStart]);

  const {
    mediaRef,
    mediaProgress,
    mediaTime,
    startMediaPlayback,
    formatTime,
    pauseMedia,
  } = useMediaPlayback(primaryMediaSrc, handleMediaPlaybackEnd, () => {});

  // --- 4. EFFECTS ---
  useEffect(() => {
    if (stopSignal) {
      if (stageRef.current === "RECORDING") {
        stopRecording();
        updateStage("FINISHED");
      } else if (
        stageRef.current === "PLAYING" ||
        stageRef.current === "PREP"
      ) {
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
    () => {
      updateStage("PLAYING");
      startMediaPlayback(PHASES.ACTIVE_MIDDLE);
    },
    () => {
      if (stageRef.current === "GAP") triggerRecordingStart();
    },
    () => {
      updateStage("FINISHED");
      stopRecording();
    }
  );

  useEffect(() => {
    if (stage === "RECORDING") globalPhase("recording");
    else if (stage === "FINISHED") globalPhase("finished");
    else globalPhase("prep");
  }, [stage, globalPhase]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">
          {subsection?.replace(/_/g, " ")}
        </h2>
        <SectionTimerDisplay
          formattedTime={useSectionTimer(stopRecording).formattedTime}
          isExpired={false}
        />
      </div>

      {/* CONDITIONALLY RENDER MEDIA BOX: 
         Only show if it's NOT Audio Only (i.e., has Video or Image)
      */}
      {text && (
        <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-gray-700 whitespace-pre-line">{text}</p>
        </div>
      )}
      {mediaType !== "AUDIO_ONLY" && (
        <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border-4 border-white">
          {mediaType === "VIDEO_ONLY" && (
            <video
              ref={mediaRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              playsInline
            />
          )}

          {mediaType === "AUDIO_AND_IMAGE" && (
            <>
              <img
                src={videoUrl}
                alt="Lecture Graphic"
                className="w-full h-full object-contain"
              />
              <audio ref={mediaRef} src={audioUrl} className="hidden" />
              <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm p-2 rounded-full">
                <Volume2 className="w-5 h-5 text-white animate-pulse" />
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden audio tag for AUDIO_ONLY cases to drive the engine without showing the box */}
      {mediaType === "AUDIO_ONLY" && (
        <audio ref={mediaRef} src={audioUrl} className="hidden" />
      )}

      {/* PROGRESS AND STATUS CARD */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[140px] flex flex-col justify-center transition-all">
        {/* Helper for Audio Only Mode */}
        {mediaType === "AUDIO_ONLY" && stage === "PLAYING" && (
          <div className="flex items-center gap-3 mb-4 text-sky-600">
            <div className="p-2 bg-sky-100 rounded-full">
              <Headphones className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">
              Audio Presentation
            </span>
          </div>
        )}

        {stage === "PREP" && (
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-black text-gray-400 uppercase tracking-widest">
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
            <div className="flex justify-between text-xs font-black text-sky-600 uppercase tracking-widest">
              <span>
                {mediaType === "VIDEO_ONLY"
                  ? "Playing Lecture Video"
                  : "Playing Lecture Audio"}
              </span>
              <span className="tabular-nums">
                {formatTime(mediaTime.current)} / {formatTime(mediaTime.total)}
              </span>
            </div>
            <Progress
              value={Math.round(mediaProgress)}
              className="h-2 bg-sky-50"
            />
          </div>
        )}

        {stage === "GAP" && (
          <div className="space-y-3">
            {recordPrepSeconds > 0 ? (
              <>
                <div className="flex justify-between text-xs font-black text-amber-600 uppercase tracking-widest">
                  <span>Final Preparation</span>
                  <span>{timerHook.middleLeft}s</span>
                </div>
                <Progress
                  value={timerHook.middleProgress}
                  className="h-2 bg-amber-50"
                />
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sky-600 font-black uppercase tracking-tighter text-xl animate-pulse">
                  Mic Opening...
                </p>
              </div>
            )}
          </div>
        )}

        {stage === "RECORDING" && (
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-black text-red-600 uppercase tracking-widest">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                Recording Active
              </span>
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
          <div className="flex flex-col items-center gap-2 py-4 text-green-600 bg-green-50/50 rounded-lg border border-green-100 border-dashed animate-in fade-in">
            <p className="font-black uppercase tracking-widest text-sm">
              Response Captured
            </p>
            <p className="text-xs text-green-500/80">
              Please click "Next" to move to the next item.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
