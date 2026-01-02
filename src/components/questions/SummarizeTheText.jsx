"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useExamStore } from "@/store";

// --- Timer Hooks & UI ---
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

/**
 * SummarizeTheText (Listening)
 * - Starts preparation immediately on mount.
 * - Plays audio automatically after preparation.
 * - Implements a 70-word limit for summarize_spoken_text.
 * - Locks input when the global section timer expires.
 */
export default function SummarizeTheText({
  audioUrl,
  prepSeconds = 5,
  subsection = "summarize_spoken_text",
  questionId,
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);

  // States for the specific question lifecycle
  const [stage, setStage] = useState("PREP"); 
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [userInput, setUserInput] = useState("");
  const audioRef = useRef(null);

  // --- 1. Global Section Timer Integration ---
  const handleSectionTimeExpired = useCallback(() => {
    console.log("Section time expired in SummarizeTheText");
  }, []);

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer(handleSectionTimeExpired);

  // --- 2. Word Limit Logic ---
  const wordLimit = useMemo(() => {
    // Specifically check for summarize_spoken_text as requested
    if (subsection === "summarize_spoken_text") return 70;
    return 1000; // High fallback for other listening tasks
  }, [subsection]);

  const getWordCount = (text) => {
    const trimmed = text.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  };

  const currentCount = getWordCount(userInput);

  // --- 3. Preparation Countdown ---
  useEffect(() => {
    if (stage !== "PREP") return;

    if (prepLeft <= 0) {
      setStage("PLAYING");
      return;
    }

    const timer = setTimeout(() => setPrepLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [prepLeft, stage]);

  // --- 4. Audio Playback Logic ---
  useEffect(() => {
    if (stage === "PLAYING" && audioRef.current) {
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay blocked or failed:", err);
          setStage("WRITING");
        });
      }
    }
  }, [stage]);

  const handleAudioEnd = () => setStage("WRITING");

  // --- 5. Input Handler with Word Limit ---
  const handleTextChange = (e) => {
    const newText = e.target.value;
    const newCount = getWordCount(newText);

    // Hard block: prevent adding more words if over the limit
    // Allow deleting (backspacing) even if over limit
    if (newCount > wordLimit && newCount >= currentCount) {
      return; 
    }

    setUserInput(newText);
  };

  // --- 6. Store Sync & Phase Management ---
  useEffect(() => {
    setAnswerKey("answer", userInput);

    if (isSectionExpired || (stage === "WRITING" && userInput.trim().length > 0)) {
      setPhase("finished");
    } else {
      setPhase("prep");
    }
  }, [userInput, stage, isSectionExpired, setAnswerKey, setPhase]);

  return (
    <div className="space-y-6">
      {/* HEADER: Section Name & Global Timer */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">
          {subsection.replace(/_/g, " ")}
        </h2>
        <SectionTimerDisplay 
          formattedTime={formattedTime} 
          isExpired={isSectionExpired} 
        />
      </div>

      {/* AUDIO STATUS CARD */}
      <div className={`bg-white rounded-xl border border-gray-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[160px] space-y-4 transition-opacity ${isSectionExpired ? "opacity-60" : ""}`}>
        
        {stage === "PREP" && (
          <div className="w-full max-w-md text-center space-y-3">
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-widest">
              Audio starting in {prepLeft}s...
            </p>
            <Progress value={(prepLeft / prepSeconds) * 100} className="h-2" />
          </div>
        )}

        {stage === "PLAYING" && (
          <div className="flex flex-col items-center space-y-3 animate-pulse text-blue-600">
            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 9v6m0 0l-3-3m3 3l3-3"></path>
               </svg>
            </div>
            <p className="font-bold">Playing Audio...</p>
          </div>
        )}

        {stage === "WRITING" && (
          <div className="text-green-600 font-bold flex items-center gap-2">
            <span className="h-2 w-2 bg-green-600 rounded-full animate-ping" />
            Audio Finished. Please summarize the text below.
          </div>
        )}

        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onEnded={handleAudioEnd} 
          className="hidden" 
        />
      </div>

      {/* INPUT AREA */}
      <div className="relative space-y-2">
        <Textarea
          placeholder={
            isSectionExpired 
              ? "Time has expired." 
              : stage === "WRITING" 
                ? `Summarize what you heard (Max ${wordLimit} words)...` 
                : "Audio must play before you can type..."
          }
          className={`min-h-[250px] text-lg p-6 transition-all ${
            currentCount >= wordLimit ? "border-red-400 focus-visible:ring-red-500" : ""
          }`}
          value={userInput}
          onChange={handleTextChange}
          disabled={stage !== "WRITING" || isSectionExpired}
        />
        
        <div className="flex justify-between items-center text-sm px-1">
          <div className={`px-3 py-1 rounded-md border transition-colors ${
            currentCount >= wordLimit ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-100 border-gray-200 text-gray-500"
          }`}>
            Word count: <span className="font-bold">{currentCount} / {wordLimit}</span>
          </div>

          {isSectionExpired && (
            <span className="text-red-600 font-bold animate-pulse">
              ⏳ Section time expired. Answer locked.
            </span>
          )}
        </div>

        {isSectionExpired && (
          <div className="absolute inset-0 bg-gray-50/20 rounded-md pointer-events-none" />
        )}
      </div>
    </div>
  );
}