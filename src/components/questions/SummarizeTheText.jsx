"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useExamStore } from "@/store";
import { Headphones, Volume2, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";

import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function SummarizeTheText({
  audioUrl,
  prepSeconds = 5,
  subsection = "summarize_spoken_text",
  questionId,
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);

  const [stage, setStage] = useState("PREP"); 
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [userInput, setUserInput] = useState("");
  const [isBlocked, setIsBlocked] = useState(false); 
  const audioRef = useRef(null);

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  const wordLimit = useMemo(() => {
    if (subsection === "summarize_spoken_text") return 70;
    // return 1000; 
  }, [subsection]);

  const getWordCount = (text) => {
    const trimmed = text.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  };

  const currentCount = getWordCount(userInput);

  // 1. Next Button Strategy: 
  // We keep the phase as "prep" (disabled) until the audio finishes.
  useEffect(() => {
    if (stage === "WRITING" && !isSectionExpired) {
      setPhase("writing"); // This enables the "Next" button in ExamShell
    } else {
      setPhase("prep"); // Keeps "Next" disabled during PREP and PLAYING
    }
  }, [stage, setPhase, isSectionExpired]);

  // Preparation Countdown
  useEffect(() => {
    if (stage !== "PREP") return;
    if (prepLeft <= 0) {
      setStage("PLAYING");
      return;
    }
    const timer = setTimeout(() => setPrepLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [prepLeft, stage]);

  // 2. Automatic Audio Playback
  useEffect(() => {
    if (stage === "PLAYING" && audioRef.current) {
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsBlocked(false);
          })
          .catch((err) => {
            // If the browser blocks it, we HAVE to show a button as a fallback.
            // There is no technical way to bypass a browser's security block without a click.
            console.warn("Autoplay blocked:", err);
            setIsBlocked(true); 
          });
      }
    }
  }, [stage]);

  const handleAudioEnd = () => {
    setStage("WRITING");
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setUserInput(newText);
    setAnswerKey("answer", newText);
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
        <div className="flex items-center gap-2 text-sky-700">
           <Headphones className="w-5 h-5" />
           <h2 className="text-lg md:text-xl font-bold uppercase tracking-tight">
             {subsection.replace(/_/g, " ")}
           </h2>
        </div>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-8 shadow-sm flex flex-col items-center justify-center min-h-[160px] space-y-4">
        
        {stage === "PREP" && (
          <div className="w-full max-w-md text-center space-y-3">
            <p className="text-xs font-black text-amber-600 uppercase tracking-widest">
              Audio begins in {prepLeft}s
            </p>
            <Progress value={(prepLeft / prepSeconds) * 100} className="h-2 bg-amber-50" />
          </div>
        )}

        {stage === "PLAYING" && (
          <div className="flex flex-col items-center space-y-2 text-sky-600">
            {isBlocked ? (
              /* Fallback UI: If browser blocks autoplay, user must click this once */
              <button 
                onClick={() => audioRef.current?.play().then(() => setIsBlocked(false))}
                className="flex flex-col items-center gap-2 text-amber-600 animate-pulse"
              >
                <PlayCircle className="w-12 h-12" />
                <p className="font-bold text-xs">Browser blocked autoplay. Click to play.</p>
              </button>
            ) : (
              <>
                <div className="h-12 w-12 bg-sky-50 rounded-full flex items-center justify-center animate-pulse">
                   <Volume2 className="w-6 h-6" />
                </div>
                <p className="font-bold text-sm uppercase tracking-widest">Playing Audio...</p>
              </>
            )}
          </div>
        )}

        {stage === "WRITING" && (
          <div className="text-green-600 font-bold flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6" />
            Audio complete. Next button enabled.
          </div>
        )}

        <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnd} className="hidden" />
      </div>

      <div className="relative space-y-3">
        <Textarea
          placeholder={stage === "WRITING" ? "Write your summary here..." : "Wait for audio to finish..."}
          className={`min-h-[250px] text-lg p-6 transition-all ${
            currentCount > wordLimit ? "border-red-400 bg-red-50/10" : "focus-visible:ring-sky-500"
          }`}
          value={userInput}
          onChange={handleTextChange}
          disabled={stage !== "WRITING" || isSectionExpired}
        />
        
        <div className="flex justify-between items-center px-1">
          <div className={`px-4 py-2 rounded-full border text-xs font-bold ${
            currentCount > wordLimit ? "bg-red-600 text-white" : "bg-slate-800 text-white"
          }`}>
            Word count: {currentCount} / {wordLimit}
          </div>

          {currentCount > wordLimit && (
            <div className="flex items-center gap-2 text-red-600 font-bold text-xs animate-bounce uppercase">
              <AlertCircle className="w-4 h-4" />
              Limit exceeded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}