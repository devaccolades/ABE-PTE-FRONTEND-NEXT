"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2, Volume2, PencilLine, Headphones, AlertCircle } from "lucide-react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function FillBlanksTyped({
  audioSrc: propAudioSrc,
  output,
  prepSeconds = 5,
  textString = "", 
  durationSeconds = 60,
  subsection = "Listening: Fill in the Blanks",
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  const audioSrc = propAudioSrc || output || "";
  const segments = useMemo(() => textString.split(/-{2,}/g), [textString]);
  const blankCount = Math.max(segments.length - 1, 0);

  const [status, setStatus] = useState("LOADING"); 
  const [values, setValues] = useState(() => Array(blankCount).fill(""));
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [answerLeft, setAnswerLeft] = useState(durationSeconds);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false); 
  
  const audioRef = useRef(null);

  const handleCanPlay = useCallback(() => {
    if (status === "LOADING") setStatus("PREP");
  }, [status]);

  // AUTO-PLAY LOGIC
  useEffect(() => {
    let timer;

    if (status === "PREP") {
      if (prepLeft <= 0) {
        setStatus("PLAYING");
      } else {
        timer = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
      }
    }

    if (status === "PLAYING" && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Autoplay Blocked:", error);
          setIsBlocked(true);
        });
      }
    }

    if (status === "ANSWER") {
      if (answerLeft <= 0 || isSectionExpired) {
        setStatus("FINISHED");
      } else {
        timer = setTimeout(() => setAnswerLeft((s) => s - 1), 1000);
      }
    }

    return () => clearTimeout(timer);
  }, [status, prepLeft, answerLeft, isSectionExpired]);

  const handleAudioEnd = () => setStatus("ANSWER");

  // --- LOGIC: ENABLE NEXT ONLY WHEN ALL FILLED ---
  useEffect(() => {
    // Save to store
    setAnswerKey("answer", values.join("|"));

    // Validation
    const allFilled = values.length > 0 && values.every((val) => val.trim() !== "");

    // Phase control
    if (isSectionExpired || allFilled) {
      setPhase("finished"); // Enables Next Button
    } else {
      setPhase("prep"); // Disables Next Button
    }
  }, [values, isSectionExpired, setPhase, setAnswerKey]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight flex items-center gap-2">
          <Headphones className="w-5 h-5 text-sky-600" /> {subsection}
        </h2>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      {isBlocked && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 animate-pulse">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">
            Audio blocked. Please click anywhere on the page to enable sound for this exam session.
          </p>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[140px] space-y-4">
        {status === "PREP" && (
          <div className="w-full max-w-sm text-center space-y-3">
            <p className="text-sm font-black text-amber-500 uppercase tracking-widest">Starting in {prepLeft}s</p>
            <Progress value={(prepLeft / prepSeconds) * 100} className="h-2 bg-amber-50" />
          </div>
        )}

        {status === "PLAYING" && (
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between items-center text-sky-600 font-bold text-xs uppercase tracking-widest">
              <span className="flex items-center gap-2"><Volume2 className="w-4 h-4 animate-bounce" /> Playing</span>
              <span>{Math.round(audioProgress)}%</span>
            </div>
            <Progress value={audioProgress} className="h-2 bg-sky-50" />
          </div>
        )}

        {(status === "ANSWER" || status === "FINISHED") && (
          <div className="text-green-600 font-bold uppercase text-sm flex items-center gap-2 bg-green-50 px-6 py-2 rounded-full border border-green-100">
            <PencilLine className="w-4 h-4" /> 
            {status === "FINISHED" ? "Time Expired" : `Typing Phase: ${answerLeft}s`}
          </div>
        )}

        <audio
          ref={audioRef}
          src={audioSrc}
          onCanPlayThrough={handleCanPlay}
          onTimeUpdate={() => {
            if (audioRef.current) {
               setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
            }
          }}
          onEnded={handleAudioEnd}
          className="hidden"
          preload="auto"
        />
      </div>

      {/* Main Text Area - Reverted to your original gray color scheme */}
      <div className="rounded-3xl border border-gray-100 p-12 bg-white shadow-2xl text-xl leading-[4rem] text-gray-700">
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            <span className="select-none">{seg}</span>
            {i < blankCount && (
              <input
                type="text"
                autoComplete="off"
                value={values[i]}
                onChange={(e) => {
                  const next = [...values];
                  next[i] = e.target.value;
                  setValues(next);
                }}
                disabled={status === "LOADING" || status === "PREP" || isSectionExpired}
                className="inline-block h-10 min-w-[160px] mx-2 px-4 align-middle text-center text-sky-600 font-bold border-b-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-sky-500 outline-none transition-all rounded"
                placeholder={`${i + 1}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Help text */}
      <div className="flex flex-col items-center gap-1 text-gray-400">
         <p className="text-sm italic">Please fill all blanks to proceed.</p>
         <p className="text-xs font-mono">{values.filter(v => v.trim() !== "").length} / {blankCount} filled</p>
      </div>
    </div>
  );
}