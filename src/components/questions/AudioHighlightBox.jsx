"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Headphones, Volume2, CheckCircle2, AlertCircle } from "lucide-react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function AudioHighlightBox({
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
  const [progress, setProgress] = useState(0);
  const [sourceError, setSourceError] = useState("");
  const [highlighted, setHighlighted] = useState(new Set());

  const tokens = useMemo(() => tokenize(text), [text]);

  const handleCanPlay = useCallback(() => {
    if (status === "LOADING") setStatus("PREP");
  }, [status]);

  useEffect(() => {
    let timer;
    if (status === "PREP") {
      if (prepLeft <= 0) {
        handleStartAudio();
      } else {
        timer = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
      }
    }
    return () => clearTimeout(timer);
  }, [status, prepLeft]);

  const handleStartAudio = async () => {
    setStatus("PLAYING");
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch (err) {
        setSourceError("Tap text to enable audio.");
      }
    }
  };

  useEffect(() => {
    const selectedWords = Array.from(highlighted)
      .map((idx) => tokens[idx].value)
      .join(",");

    setAnswerKey("answer", selectedWords);

    if (isSectionExpired || highlighted.size > 0) {
      setPhase("finished");
    } else {
      setPhase("prep");
    }
  }, [highlighted, isSectionExpired, setPhase, setAnswerKey, tokens]);

  const toggleHighlight = (idx) => {
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
      {/* Responsive Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 md:pb-4 gap-3">
        <div className="flex items-center gap-2 text-sky-700">
          <Headphones className="w-5 h-5 shrink-0" />
          <h2 className="text-lg md:text-xl font-bold uppercase tracking-tight truncate">
            {subsection}
          </h2>
        </div>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      {/* Playback Status Card - Adaptive Padding */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-8 shadow-sm flex flex-col items-center justify-center min-h-[120px] md:min-h-[140px] space-y-4 transition-all">
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
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5 md:h-2 bg-sky-50" />
          </div>
        )}

        {(status === "FINISHED" || isSectionExpired) && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 md:px-6 py-2 rounded-full border border-green-100 animate-in fade-in zoom-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">
              Listening Phase Complete
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
            const el = audioRef.current;
            if (el && el.duration) setProgress((el.currentTime / el.duration) * 100);
          }}
          onEnded={() => setStatus("FINISHED")}
          className="hidden"
          preload="auto"
        />
      </div>

      {/* Paragraph Content - Adjusted leading and text size for mobile */}
      <div className="rounded-2xl md:rounded-3xl border border-gray-100 p-5 md:p-10 bg-white shadow-xl text-gray-800 leading-[2.5rem] md:leading-[3.5rem] text-lg md:text-xl transition-all">
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
              disabled={status === "PREP" || status === "LOADING" || isSectionExpired}
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
        <p className="text-center text-[11px] md:text-sm font-medium text-gray-400 italic leading-snug">
          * Select the words in the text that differ from what is said. 
          <br className="hidden md:block" /> You must highlight at least one word to continue.
        </p>
        
        {highlighted.size > 0 && (
          <div className="text-[10px] font-black text-sky-600 uppercase tracking-widest bg-sky-50 px-3 py-1 rounded">
             {highlighted.size} WORD{highlighted.size !== 1 ? 'S' : ''} SELECTED
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Tokenizer Helper ---- */
function tokenize(str) {
  if (!str) return [];
  const regex = /([A-Za-z0-9\u00C0-\u017F'\-]+)|(\s+|[^\sA-Za-z0-9\u00C0-\u017F'\-]+)/g;
  const tokens = [];
  let m;
  while ((m = regex.exec(str)) !== null) {
    if (m[1]) tokens.push({ value: m[1], isWord: true });
    else if (m[2]) tokens.push({ value: m[2], isWord: false });
  }
  return tokens;
}