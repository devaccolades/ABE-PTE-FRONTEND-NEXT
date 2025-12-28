"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Volume2,
  CheckCircle2,
  Play,
  Square,
  Headphones,
} from "lucide-react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function AudioToMCQ({
  audioSrc,
  output,
  prepSeconds = 5,
  type = "l_mc_multiple", // "l_mc_multiple" or "highlight_correct_summary"
  options = [],
  subsection = "Listening: Multiple Choice",
  questionId,
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);

  const mainSrc = audioSrc || output || "";
  const audioRef = useRef(null);
  const optionPlayersRef = useRef(new Map());

  const [status, setStatus] = useState("LOADING");
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [progress, setProgress] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  // --- 1. MEDIA HANDLERS ---
  const handleCanPlay = useCallback(() => {
    if (status === "LOADING") setStatus("PREP");
  }, [status]);

  const handleAudioEnd = () => setStatus("FINISHED");

  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (el && el.duration) {
      setProgress((el.currentTime / el.duration) * 100);
    }
  };

  // --- 2. TIMERS & AUTOPLAY ---
  useEffect(() => {
    if (status !== "PREP") return;

    if (prepLeft <= 0) {
      setStatus("PLAYING");
      const playPromise = audioRef.current?.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => console.warn("Autoplay blocked", err));
      }
      return;
    }

    const timer = setTimeout(() => setPrepLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [prepLeft, status]);

  // --- 3. SELECTION LOGIC (SINGLE VS MULTIPLE) ---
  const handleSelection = (id) => {
    const isSingleSelect =
      type === "highlight_correct_summary" || type === "l_mc_single" || type === "select_missing_word";

    if (isSingleSelect) {
      // For radio-style, we only keep the latest ID
      setSelectedIds(new Set([id]));
    } else {
      // For checkbox-style (l_mc_multiple), we toggle
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
    }
  };

  const pauseAllOptionAudios = () => {
    optionPlayersRef.current.forEach((player) => {
      try {
        player.pause();
        player.currentTime = 0;
      } catch (e) {}
    });
  };

  // --- 4. SYNC TO GLOBAL STORE ---
  useEffect(() => {
    setAnswerKey("answer", Array.from(selectedIds).join(","));

    // Enable "Next" button if something is selected or section timer expired
    if (isSectionExpired || selectedIds.size > 0) {
      setPhase("finished");
    } else {
      setPhase("prep");
    }
  }, [selectedIds, isSectionExpired, setPhase, setAnswerKey]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div className="flex items-center gap-2 text-sky-700">
          <Headphones className="w-5 h-5" />
          <h2 className="text-xl font-bold uppercase tracking-tight">
            {subsection?.replace(/_/g, " ")}
          </h2>
        </div>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isSectionExpired}
        />
      </div>

      {/* Main Playback Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[160px] space-y-4">
        {status === "LOADING" && (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-10 w-10 text-sky-500 animate-spin" />
            <p className="text-gray-400 font-medium text-sm uppercase">
              Buffering...
            </p>
          </div>
        )}

        {status === "PREP" && (
          <div className="w-full max-w-md text-center space-y-4">
            <div className="flex justify-between text-sm font-bold text-amber-600 uppercase tracking-widest">
              <span>Preparation</span>
              <span>{prepLeft}s</span>
            </div>
            <Progress
              value={(prepLeft / prepSeconds) * 100}
              className="h-3 bg-amber-50"
            />
          </div>
        )}

        {status === "PLAYING" && (
          <div className="w-full max-w-md space-y-4">
            <div className="flex justify-between items-center text-sky-600 font-bold text-xs uppercase">
              <span className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 animate-bounce" /> Status: Playing
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-sky-50" />
          </div>
        )}

        {status === "FINISHED" && (
          <div className="flex flex-col items-center space-y-2 text-green-600">
            <CheckCircle2 className="h-10 w-10 animate-in zoom-in" />
            <p className="font-bold uppercase text-xs">
              Listening Phase Complete
            </p>
          </div>
        )}

        <audio
          ref={audioRef}
          src={mainSrc}
          onCanPlayThrough={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnd}
          onPlay={pauseAllOptionAudios}
          className="hidden"
          preload="auto"
        />
      </div>

      {/* Options Grid */}
      <div className="grid gap-4">
        {options.map((opt) => {
          const isChecked = selectedIds.has(opt.id);
          const isSingle = type === "highlight_correct_summary";

          return (
            <label
              key={opt.id}
              className={`flex items-start gap-4 rounded-xl border-2 p-5 cursor-pointer transition-all duration-200
                ${
                  isChecked
                    ? "border-sky-500 bg-sky-50 shadow-md transform scale-[1.01]"
                    : "border-gray-100 bg-white hover:border-sky-200 hover:bg-gray-50/50"
                }`}
            >
              <input
                type={isSingle ? "radio" : "checkbox"}
                name={isSingle ? "mcq-single" : opt.id}
                checked={isChecked}
                onChange={() => handleSelection(opt.id)}
                className={`mt-1 h-5 w-5 border-gray-300 text-sky-600 focus:ring-sky-500 ${
                  isSingle ? "rounded-full" : "rounded"
                }`}
              />
              <div className="flex-1">
                <p
                  className={`text-base leading-relaxed ${
                    isChecked ? "text-sky-900 font-semibold" : "text-gray-700"
                  }`}
                >
                  {opt.option_text}
                </p>
                {opt.audioSrc && (
                  <OptionAudioPlayer
                    src={opt.audioSrc}
                    id={opt.id}
                    register={(el) => {
                      if (el) optionPlayersRef.current.set(opt.id, el);
                      else optionPlayersRef.current.delete(opt.id);
                    }}
                    pauseMain={() => audioRef.current?.pause()}
                  />
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function OptionAudioPlayer({ src, id, register, pauseMain }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    register(ref.current);
    return () => register(null);
  }, [id, register]);

  const toggle = (e) => {
    e.preventDefault();
    if (!ref.current) return;
    if (playing) {
      ref.current.pause();
      ref.current.currentTime = 0;
    } else {
      pauseMain();
      ref.current.play();
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={toggle}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-tighter transition-colors ${
          playing
            ? "bg-red-500 text-white"
            : "bg-sky-100 text-sky-700 hover:bg-sky-200"
        }`}
      >
        {playing ? (
          <Square className="h-3 w-3 fill-current" />
        ) : (
          <Play className="h-3 w-3 fill-current" />
        )}
        {playing ? "STOP AUDIO" : "LISTEN TO OPTION"}
      </button>
      <audio
        ref={ref}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
