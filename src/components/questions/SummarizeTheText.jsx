"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useExamStore } from "@/store";
import { Headphones, Volume2, CheckCircle2, AlertCircle } from "lucide-react";

// --- Timer Hooks & UI ---
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
  const audioRef = useRef(null);

  const handleSectionTimeExpired = useCallback(() => {
    console.log("Section expired");
  }, []);

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer(handleSectionTimeExpired);

  const wordLimit = useMemo(() => {
    if (subsection === "summarize_spoken_text") return 70;
    return 1000;
  }, [subsection]);

  const getWordCount = (text) => {
    const trimmed = text.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  };

  const currentCount = getWordCount(userInput);

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

  // Audio Playback
  useEffect(() => {
    if (stage === "PLAYING" && audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.warn("Autoplay blocked:", err);
        setStage("WRITING");
      });
    }
  }, [stage]);

  const handleAudioEnd = () => setStage("WRITING");

  const handleTextChange = (e) => {
    const newText = e.target.value;
    const newCount = getWordCount(newText);
    if (newCount > wordLimit && newCount >= currentCount) return; 
    setUserInput(newText);
  };

  useEffect(() => {
    setAnswerKey("answer", userInput);
    if (isSectionExpired || (stage === "WRITING" && userInput.trim().length > 0)) {
      setPhase("finished");
    } else {
      setPhase("prep");
    }
  }, [userInput, stage, isSectionExpired, setAnswerKey, setPhase]);

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 md:pb-4 gap-3">
        <div className="flex items-center gap-2 text-sky-700">
           <Headphones className="w-5 h-5 shrink-0" />
           <h2 className="text-lg md:text-xl font-bold uppercase tracking-tight truncate">
             {subsection.replace(/_/g, " ")}
           </h2>
        </div>
        <SectionTimerDisplay 
          formattedTime={formattedTime} 
          isExpired={isSectionExpired} 
        />
      </div>

      {/* AUDIO STATUS CARD - Compact on Mobile */}
      <div className={`bg-white rounded-xl border border-gray-200 p-5 md:p-8 shadow-sm flex flex-col items-center justify-center min-h-[120px] md:min-h-[160px] space-y-4 transition-all ${isSectionExpired ? "opacity-60" : ""}`}>
        
        {stage === "PREP" && (
          <div className="w-full max-w-xs md:max-w-md text-center space-y-3">
            <p className="text-[10px] md:text-xs font-black text-amber-600 uppercase tracking-[0.2em]">
              Beginning in {prepLeft}s
            </p>
            <Progress value={(prepLeft / prepSeconds) * 100} className="h-1.5 md:h-2 bg-amber-50" />
          </div>
        )}

        {stage === "PLAYING" && (
          <div className="flex flex-col items-center space-y-2 text-sky-600">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-sky-50 rounded-full flex items-center justify-center animate-pulse">
               <Volume2 className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <p className="font-bold text-xs md:text-sm uppercase tracking-widest">Playing Audio</p>
          </div>
        )}

        {stage === "WRITING" && (
          <div className="text-green-600 font-bold flex flex-col md:flex-row items-center gap-2 text-center text-xs md:text-sm">
            <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 animate-in zoom-in" />
            Audio complete. Write your summary below.
          </div>
        )}

        <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnd} className="hidden" />
      </div>

      {/* INPUT AREA */}
      <div className="relative space-y-3">
        <Textarea
          placeholder={
            isSectionExpired 
              ? "Time has expired." 
              : stage === "WRITING" 
                ? `Write your summary here (Max ${wordLimit} words)...` 
                : "The summary box will unlock after the audio ends."
          }
          className={`min-h-[200px] md:min-h-[280px] text-base md:text-lg p-4 md:p-6 transition-all resize-none shadow-inner ${
            currentCount >= wordLimit ? "border-red-400 focus-visible:ring-red-500" : "focus-visible:ring-sky-500"
          }`}
          value={userInput}
          onChange={handleTextChange}
          disabled={stage !== "WRITING" || isSectionExpired}
        />
        
        {/* FOOTER - Adaptive Layout */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 px-1">
          <div className={`px-3 py-1.5 rounded-md border text-[11px] md:text-xs transition-colors w-full md:w-auto text-center ${
            currentCount >= wordLimit ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-100 border-slate-200 text-slate-500"
          }`}>
            Word count: <span className="font-bold">{currentCount} / {wordLimit}</span>
          </div>

          {isSectionExpired && (
            <div className="flex items-center gap-2 text-red-600 font-bold text-[11px] md:text-xs animate-pulse uppercase">
              <AlertCircle className="w-4 h-4" />
              Section time expired. Answer locked.
            </div>
          )}
        </div>

        {/* Disabled Overlay Visual */}
        {isSectionExpired && (
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[0.5px] rounded-md pointer-events-none" />
        )}
      </div>
    </div>
  );
}