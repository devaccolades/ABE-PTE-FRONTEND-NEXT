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

  // --- UPDATED PHASE LOGIC ---
  useEffect(() => {
    setAnswerKey("answer", Array.from(selectedIds).join(","));
    
    // Logic: Enable "Next" if the section timer ran out OR the audio status is "FINISHED"
    // The user does NOT need to select an option anymore to enable the button.
    const canMoveToNext = isSectionExpired || status === "FINISHED";
    
    setPhase(canMoveToNext ? "finished" : "prep");
  }, [selectedIds, isSectionExpired, status, setPhase, setAnswerKey]);

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 md:pb-4 gap-3">
        <div className="flex items-center gap-2 text-sky-700">
          <Headphones className="w-5 h-5 shrink-0" />
          <h2 className="text-lg md:text-xl font-bold uppercase tracking-tight truncate">
            {subsection?.replace(/_/g, " ")}
          </h2>
        </div>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      {/* AUDIO PLAYER CARD */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-10 shadow-sm flex flex-col items-center justify-center min-h-[140px] md:min-h-[180px] space-y-4">
        {status === "LOADING" && (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
            <p className="text-gray-400 font-bold text-xs uppercase">Buffering...</p>
          </div>
        )}

        {status === "PREP" && (
          <div className="w-full max-w-xs md:max-w-md text-center space-y-3">
            <div className="flex justify-between text-[10px] md:text-xs font-black text-amber-600 uppercase">
              <span>Starting in</span>
              <span>{prepLeft}s</span>
            </div>
            <Progress value={(prepLeft / prepSeconds) * 100} className="h-2 bg-amber-50" />
          </div>
        )}

        {status === "PLAYING" && (
          <div className="w-full max-w-xs md:max-w-md space-y-3">
            <div className="flex justify-between items-center text-sky-600 font-bold text-[10px] md:text-xs uppercase">
              <span className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 animate-pulse" /> Audio Playing
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-sky-50" />
          </div>
        )}

        {status === "FINISHED" && (
          <div className="flex flex-col items-center space-y-2 text-green-600 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="h-8 w-8 md:h-10 md:w-10" />
            <p className="font-black uppercase text-[10px] md:text-xs tracking-widest">Playback Complete</p>
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

      {/* OPTIONS */}
      <div className="grid gap-3 md:gap-4">
        {/* HELP TEXT FOR USER EXPERIENCE */}
        {status !== "FINISHED" && !isSectionExpired && (
          <p className="text-[11px] text-center text-amber-600 font-bold uppercase tracking-wider animate-pulse">
            Next button will unlock after audio ends
          </p>
        )}
        
        {options.map((opt) => {
          const isChecked = selectedIds.has(opt.id);
          const isSingle = ["highlight_correct_summary", "l_mc_single", "select_missing_word"].includes(type);

          return (
            <label
              key={opt.id}
              className={`group flex items-start gap-4 rounded-xl border-2 p-4 md:p-5 cursor-pointer transition-all
                ${isChecked
                  ? "border-sky-500 bg-sky-50"
                  : "border-gray-100 bg-white hover:border-sky-100"
                }`}
            >
              <div className="pt-0.5">
                <input
                  type={isSingle ? "radio" : "checkbox"}
                  checked={isChecked}
                  onChange={() => handleSelection(opt.id)}
                  className="h-5 w-5 text-sky-600"
                />
              </div>
              <p className={`text-sm md:text-base ${isChecked ? "text-sky-900 font-semibold" : "text-gray-700 font-medium"}`}>
                {opt.option_text}
              </p>
            </label>
          );
        })}
      </div>
    </div>
  );
}