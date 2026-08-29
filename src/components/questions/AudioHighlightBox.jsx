"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Headphones, Volume2, CheckCircle2, AlertCircle } from "lucide-react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function AudioHighlightBox({
  name = "",
  audioSrc,
  output,
  text = "",
  prepSeconds = 5,
  subsection = "Listening: Highlight Incorrect Words",
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  const mainSrc = audioSrc || output || "";
  const audioRef = useRef(null);

  const [status, setStatus] = useState("LOADING");
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [audioProgress, setAudioProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [sourceError, setSourceError] = useState("");
  const [highlighted, setHighlighted] = useState(new Set());

  const tokens = useMemo(() => tokenize(text), [text]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCanPlay = useCallback(() => {
    if (status === "LOADING") setStatus("PREP");
  }, [status]);

  const handleStartAudio = useCallback(async () => {
    setStatus("PLAYING");
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch {
        setSourceError("Tap text to enable audio.");
      }
    }
  }, []);

  useEffect(() => {
    let timer;
    if (status === "PREP") {
      timer = setTimeout(() => {
        if (prepLeft <= 0) handleStartAudio();
        else setPrepLeft((seconds) => seconds - 1);
      }, prepLeft <= 0 ? 0 : 1000);
    }
    return () => clearTimeout(timer);
  }, [status, prepLeft, handleStartAudio]);

  // --- UPDATED NEXT BUTTON LOGIC ---
  useEffect(() => {
    const selections = Array.from(highlighted)
      .sort((left, right) => left - right)
      .map((idx) => ({
        word_index: tokens[idx].wordIndex,
        word: tokens[idx].value,
      }));

    setAnswerKey("answer", { selections });

    // Condition: Enable "Next" if the section expired OR the audio status is "FINISHED"
    // It no longer depends on whether a word is highlighted (highlighted.size)
    if (isSectionExpired) {
      setPhase("finished");
    } else if (status === "FINISHED") {
      setPhase("writing");
    } else {
      setPhase("prep");
    }
  }, [highlighted, status, isSectionExpired, setPhase, setAnswerKey, tokens]);

  const toggleHighlight = (idx) => {
    // Allows highlighting during "PLAYING" and "FINISHED" stages
    if (status === "LOADING" || status === "PREP" || isSectionExpired) return;

    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 md:pb-4 gap-3">
        <div className="flex items-center gap-2 text-sky-700">
          <Headphones className="w-5 h-5 shrink-0" />
          <h2 className="text-lg md:text-xl font-bold uppercase tracking-tight truncate">
            {name}
          </h2>
        </div>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm flex flex-col items-center justify-center min-h-[120px] md:min-h-[140px] space-y-4 transition-all">
        {status === "PREP" && (
          <div className="w-full max-w-xs md:max-w-md text-center space-y-3">
            <p className="text-[10px] md:text-sm font-black text-amber-500 uppercase tracking-[0.2em]">
              Audio starting in {prepLeft}s
            </p>
            <Progress value={(prepLeft / prepSeconds) * 100} className="h-1.5 md:h-2 bg-amber-50" />
          </div>
        )}

        {status === "PLAYING" && (
          <div className="w-full max-w-xs md:max-w-md space-y-3">
            <div className="flex justify-between items-center text-sky-600 font-bold text-[10px] uppercase tracking-widest">
              <span className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 animate-pulse" /> Status: Playing
              </span>
                <span>{formatTime(elapsed)} / {formatTime(totalDuration)}</span>
            </div>
            <Progress value={audioProgress} className="h-1.5 md:h-2 bg-sky-50" />
          </div>
        )}

        {(status === "FINISHED" || isSectionExpired) && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 md:px-6 py-2 rounded-full border border-green-100 animate-in fade-in zoom-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">
              Listening Phase Complete - You may proceed
            </span>
          </div>
        )}

        {sourceError && (
          <div className="flex items-center gap-2 text-red-500 text-[10px] md:text-xs font-medium">
            <AlertCircle className="h-3 w-3" /> {sourceError}
          </div>
        )}

        <audio
          ref={audioRef}
          src={mainSrc}
          onCanPlayThrough={handleCanPlay}
          onTimeUpdate={() => {
            if (audioRef.current) {
              const current = audioRef.current.currentTime;
              const total = audioRef.current.duration || 0;
              setAudioProgress((current / total) * 100);
              setElapsed(current);
              setTotalDuration(total);
            }
          }}
          onEnded={() => setStatus("FINISHED")}
          className="hidden"
          preload="auto"
        />
      </div>

      <div className="rounded-2xl md:rounded-3xl border border-gray-100 p-5 md:p-6 bg-white shadow-xl text-gray-800 leading-[2rem] text-lg md:text-xl transition-all">
        {tokens.map((t, idx) => {
          if (!t.isWord) {
            return <span key={idx} className="select-none">{t.value}</span>;
          }
          const isHighlighted = highlighted.has(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleHighlight(idx)}
              disabled={status === "LOADING" || status === "PREP" || isSectionExpired}
              className={`
                inline-block px-1 mx-0.5 rounded transition-all duration-200
                ${isHighlighted ? "bg-yellow-300 text-black shadow-sm scale-110" : "bg-transparent active:bg-gray-200 md:hover:bg-gray-100"}
                ${(status === "PREP" || status === "LOADING" || isSectionExpired) ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              `}
            >
              {t.value}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 px-4">
        {status !== "FINISHED" && !isSectionExpired && (
           <p className="text-center text-[10px] md:text-xs font-bold text-amber-600 uppercase tracking-widest animate-pulse">
             The Next button will unlock after the audio finishes
           </p>
        )}
        
        {highlighted.size > 0 && (
          <div className="text-[10px] font-black text-sky-600 uppercase tracking-widest bg-sky-50 px-3 py-1 rounded">
             {highlighted.size} WORD{highlighted.size !== 1 ? 'S' : ''} SELECTED
          </div>
        )}
      </div>
    </div>
  );
}

function tokenize(str) {
  if (!str) return [];
  const regex = /([\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*)|(\s+|[^\s\p{L}\p{N}]+)/gu;
  const tokens = [];
  let wordIndex = 0;
  let m;
  while ((m = regex.exec(str)) !== null) {
    if (m[1]) {
      tokens.push({ value: m[1], isWord: true, wordIndex });
      wordIndex += 1;
    } else if (m[2]) {
      tokens.push({ value: m[2], isWord: false, wordIndex: null });
    }
  }
  return tokens;
}
