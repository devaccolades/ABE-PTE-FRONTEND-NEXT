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
  type = "l_mc_multiple",
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

  useEffect(() => {
    if (status !== "PREP") return;
    if (prepLeft <= 0) {
      setStatus("PLAYING");
      audioRef.current?.play().catch((err) => console.warn("Autoplay blocked", err));
      return;
    }
    const timer = setTimeout(() => setPrepLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [prepLeft, status]);

  const handleSelection = (id) => {
    if (isSectionExpired) return;
    const isSingleSelect = ["highlight_correct_summary", "l_mc_single", "select_missing_word"].includes(type);

    if (isSingleSelect) {
      setSelectedIds(new Set([id]));
    } else {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
    }
  };

  const pauseAllOptionAudios = () => {
    optionPlayersRef.current.forEach((player) => {
      try { player.pause(); player.currentTime = 0; } catch (e) {}
    });
  };

  useEffect(() => {
    setAnswerKey("answer", Array.from(selectedIds).join(","));
    setPhase((isSectionExpired || selectedIds.size > 0) ? "finished" : "prep");
  }, [selectedIds, isSectionExpired, setPhase, setAnswerKey]);

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {/* RESPONSIVE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 md:pb-4 gap-3">
        <div className="flex items-center gap-2 text-sky-700">
          <Headphones className="w-5 h-5 shrink-0" />
          <h2 className="text-lg md:text-xl font-bold uppercase tracking-tight truncate">
            {subsection?.replace(/_/g, " ")}
          </h2>
        </div>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      {/* MAIN AUDIO CARD - Adaptive Padding and Sizing */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-10 shadow-sm flex flex-col items-center justify-center min-h-[140px] md:min-h-[180px] space-y-4 transition-all">
        {status === "LOADING" && (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-8 w-8 md:h-10 md:w-10 text-sky-500 animate-spin" />
            <p className="text-gray-400 font-bold text-xs uppercase tracking-tighter">Buffering...</p>
          </div>
        )}

        {status === "PREP" && (
          <div className="w-full max-w-xs md:max-w-md text-center space-y-3">
            <div className="flex justify-between text-[10px] md:text-xs font-black text-amber-600 uppercase tracking-[0.2em]">
              <span>Beginning in</span>
              <span>{prepLeft}s</span>
            </div>
            <Progress value={(prepLeft / prepSeconds) * 100} className="h-2 md:h-3 bg-amber-50" />
          </div>
        )}

        {status === "PLAYING" && (
          <div className="w-full max-w-xs md:max-w-md space-y-3">
            <div className="flex justify-between items-center text-sky-600 font-bold text-[10px] md:text-xs uppercase">
              <span className="flex items-center gap-2">
                <Volume2 className="h-3 w-3 md:h-4 md:w-4 animate-pulse" /> Playing Audio
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5 md:h-2 bg-sky-50" />
          </div>
        )}

        {status === "FINISHED" && (
          <div className="flex flex-col items-center space-y-2 text-green-600 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="h-8 w-8 md:h-10 md:w-10" />
            <p className="font-black uppercase text-[10px] md:text-xs tracking-widest">Audio Ended</p>
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

      {/* OPTIONS GRID - Stacked on mobile, hover effects only on desktop */}
      <div className="grid gap-3 md:gap-4">
        {options.map((opt) => {
          const isChecked = selectedIds.has(opt.id);
          const isSingle = ["highlight_correct_summary", "l_mc_single", "select_missing_word"].includes(type);

          return (
            <label
              key={opt.id}
              className={`group flex items-start gap-3 md:gap-4 rounded-xl border-2 p-4 md:p-5 cursor-pointer transition-all duration-200
                ${isChecked
                  ? "border-sky-500 bg-sky-50 shadow-sm ring-1 ring-sky-500/10"
                  : "border-gray-100 bg-white active:bg-gray-50 md:hover:border-sky-200 md:hover:bg-gray-50/50"
                }`}
            >
              <div className="pt-0.5">
                <input
                  type={isSingle ? "radio" : "checkbox"}
                  name={isSingle ? "mcq-single" : opt.id}
                  checked={isChecked}
                  onChange={() => handleSelection(opt.id)}
                  className={`h-5 w-5 border-gray-300 text-sky-600 focus:ring-sky-500 transition-transform group-active:scale-90 ${
                    isSingle ? "rounded-full" : "rounded"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm md:text-base leading-relaxed break-words ${
                    isChecked ? "text-sky-900 font-semibold" : "text-gray-700 font-medium"
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

// OptionAudioPlayer Sub-component with mobile-friendly button
function OptionAudioPlayer({ src, id, register, pauseMain }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    register(ref.current);
    return () => register(null);
  }, [id, register]);

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent label click from toggling checkbox
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
        className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[9px] md:text-[10px] font-black tracking-widest transition-all active:scale-95 ${
          playing ? "bg-red-500 text-white shadow-lg shadow-red-200" : "bg-sky-100 text-sky-700 md:hover:bg-sky-200"
        }`}
      >
        {playing ? <Square className="h-2.5 w-2.5 fill-current" /> : <Play className="h-2.5 w-2.5 fill-current" />}
        {playing ? "STOP" : "LISTEN"}
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