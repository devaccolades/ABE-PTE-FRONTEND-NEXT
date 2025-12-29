"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Headphones, Volume2, CheckCircle2, AlertCircle } from "lucide-react";
import { useExamStore } from "@/store"; // Ensure this path is correct for your project
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function AudioHighlightBox({
  audioSrc,
  output,
  text = "",
  prepSeconds = 5,
  subsection = "Listening: Highlight Incorrect Words",
}) {
  // --- STORE HOOKS ---
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  const mainSrc = audioSrc || output || "";
  const audioRef = useRef(null);

  // --- STATE ---
  const [status, setStatus] = useState("LOADING"); // LOADING | PREP | PLAYING | FINISHED
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [progress, setProgress] = useState(0);
  const [sourceError, setSourceError] = useState("");
  const [highlighted, setHighlighted] = useState(new Set());

  // Tokenize the text once
  const tokens = useMemo(() => tokenize(text), [text]);

  // --- 1. MEDIA READINESS ---
  const handleCanPlay = useCallback(() => {
    if (status === "LOADING") setStatus("PREP");
  }, [status]);

  // --- 2. PREP TIMER & AUTOPLAY ---
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
        console.warn("Autoplay blocked:", err);
        setSourceError("Autoplay blocked. Click text to enable audio.");
      }
    }
  };

  // --- 3. SYNC ANSWERS & NEXT BUTTON ---
  useEffect(() => {
    // Get actual word values from the indices stored in the Set
    const selectedWords = Array.from(highlighted)
      .map((idx) => tokens[idx].value)
      .join(",");

    setAnswerKey("answer", selectedWords);

    // Requirement: Enable Next button only if at least one word is highlighted
    if (isSectionExpired || highlighted.size > 0) {
      setPhase("finished");
    } else {
      setPhase("prep");
    }
  }, [highlighted, isSectionExpired, setPhase, setAnswerKey, tokens]);

  // --- 4. HIGHLIGHT LOGIC ---
  const toggleHighlight = (idx) => {
    // Disable interaction during preparation
    if (status === "LOADING" || status === "PREP") return;

    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center border-b pb-4">
        <div className="flex items-center gap-2 text-sky-700">
          <Headphones className="w-5 h-5" />
          <h2 className="text-xl font-bold uppercase tracking-tight">{subsection}</h2>
        </div>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      {/* Playback Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[140px] space-y-4">
        {status === "PREP" && (
          <div className="w-full max-w-md text-center space-y-3">
            <p className="text-sm font-black text-amber-500 uppercase tracking-widest">
              Audio starting in {prepLeft}s
            </p>
            <Progress value={(prepLeft / prepSeconds) * 100} className="h-2 bg-amber-50" />
          </div>
        )}

        {status === "PLAYING" && (
          <div className="w-full max-w-md space-y-3">
            <div className="flex justify-between items-center text-sky-600 font-bold text-xs uppercase tracking-widest">
              <span className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 animate-bounce" /> Status: Playing
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-sky-50" />
          </div>
        )}

        {(status === "FINISHED" || isSectionExpired) && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-6 py-2 rounded-full border border-green-100">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Listening Phase Complete</span>
          </div>
        )}

        {sourceError && (
          <div className="flex items-center gap-2 text-red-500 text-xs font-medium">
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

      {/* Paragraph Content */}
      <div className="rounded-3xl border border-gray-100 p-10 bg-white shadow-2xl text-gray-800 leading-[3.5rem] text-xl">
        {tokens.map((t, idx) => {
          if (!t.isWord) {
            return <span key={idx}>{t.value}</span>;
          }
          const isHighlighted = highlighted.has(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleHighlight(idx)}
              disabled={status === "PREP" || status === "LOADING"}
              className={`
                inline-block px-1 rounded transition-all duration-200
                ${isHighlighted ? "bg-yellow-300 text-black shadow-sm" : "bg-transparent hover:bg-gray-100"}
                ${(status === "PREP" || status === "LOADING") ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              `}
            >
              {t.value}
            </button>
          );
        })}
      </div>

      <p className="text-center text-sm font-medium text-gray-400 italic">
        * Select the words in the text that differ from what is said. 
        <br /> You must highlight at least one word to enable the Next button.
      </p>
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