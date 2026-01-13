"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2, Volume2, PencilLine, Headphones, AlertCircle, CheckCircle2 } from "lucide-react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function FillBlanksTyped({
  audioSrc: propAudioSrc,
  output,
  prepSeconds = 5,
  textString = "", 
  durationSeconds ,
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

  // AUTO-PLAY & TIMER LOGIC
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
        playPromise.catch(() => setIsBlocked(true));
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

  // --- UPDATED PHASE LOGIC ---
  useEffect(() => {
    setAnswerKey("answer", values.join("|"));

    // The button is enabled ONLY if the section timer expired 
    // OR the audio has finished playing (status is ANSWER or FINISHED)
    const audioIsDone = status === "ANSWER" || status === "FINISHED";
    
    if (isSectionExpired || audioIsDone) {
      setPhase("finished"); 
    } else {
      setPhase("prep"); // Keeps Next button disabled during LOADING, PREP, and PLAYING
    }
  }, [values, status, isSectionExpired, setPhase, setAnswerKey]);

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 md:pb-4 gap-3">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 uppercase tracking-tight flex items-center gap-2">
          <Headphones className="w-5 h-5 text-sky-600 shrink-0" /> 
          <span className="truncate">{subsection}</span>
        </h2>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      {isBlocked && (
        <div className="flex items-center gap-3 p-3 md:p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 animate-pulse">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs md:text-sm font-medium">Audio blocked. Click anywhere to enable sound.</p>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-8 shadow-sm flex flex-col items-center justify-center min-h-[100px] md:min-h-[140px] space-y-4">
        {status === "PREP" && (
          <div className="w-full max-w-xs md:max-w-sm text-center space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wait for Audio: {prepLeft}s</p>
            <Progress value={(prepLeft / prepSeconds) * 100} className="h-1.5 bg-slate-100" />
          </div>
        )}

        {status === "PLAYING" && (
          <div className="w-full max-w-xs md:max-w-sm space-y-3">
            <div className="flex justify-between items-center text-sky-600 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.2em]">
              <span className="flex items-center gap-2"><Volume2 className="w-3 h-3 md:w-4 md:h-4" /> Listening</span>
              <span>{Math.round(audioProgress)}%</span>
            </div>
            <Progress value={audioProgress} className="h-1.5 bg-sky-50" />
          </div>
        )}

        {(status === "ANSWER" || status === "FINISHED") && (
          <div className="text-green-600 font-bold uppercase text-[9px] md:text-[10px] tracking-widest flex items-center gap-2 bg-green-50 px-4 md:px-6 py-2 rounded-full border border-green-100 animate-in zoom-in">
            <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" /> 
            {status === "FINISHED" ? "Time Up - Proceed" : `Audio Finished: ${answerLeft}s Left`}
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

      {/* Main Text Area */}
      <div className="rounded-2xl md:rounded-3xl border border-gray-100 p-6 md:p-12 bg-white shadow-sm text-base md:text-xl leading-[3.5rem] md:leading-[4.5rem] text-gray-700">
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            <span className="select-none whitespace-pre-wrap">{seg}</span>
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
                className="inline-block h-8 md:h-10 w-[100px] md:w-[160px] mx-1 md:mx-2 px-2 md:px-4 align-middle text-center text-sky-600 font-bold border-b-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-sky-500 outline-none transition-all rounded text-sm md:text-lg"
                placeholder={`${i + 1}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Footer Info */}
      <div className="flex flex-col items-center gap-2 pb-6">
          {status === "PLAYING" || status === "PREP" ? (
             <p className="text-[10px] md:text-xs text-amber-600 font-bold animate-pulse">
               NEXT BUTTON WILL UNLOCK AFTER AUDIO
             </p>
          ) : (
            <p className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest">
              {values.filter(v => v.trim() !== "").length} OF {blankCount} BLANKS COMPLETED
            </p>
          )}
      </div>
    </div>
  );
}