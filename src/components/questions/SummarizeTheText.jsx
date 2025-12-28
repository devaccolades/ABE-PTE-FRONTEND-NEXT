"use client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button"; // Assuming you use shadcn or similar
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { PlayCircle } from "lucide-react"; 
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function SummarizeTheText({
  audioUrl,
  prepSeconds = 5,
  subsection = "Listening",
  questionId,
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);

  const [hasInteracted, setHasInteracted] = useState(false); // New state to fix the error
  const [stage, setStage] = useState("PREP"); 
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [userInput, setUserInput] = useState("");
  const audioRef = useRef(null);

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  // 1. Countdown logic only starts AFTER interaction
  useEffect(() => {
    if (!hasInteracted || stage !== "PREP") return;

    if (prepLeft <= 0) {
      setStage("PLAYING");
      return;
    }

    const timer = setTimeout(() => setPrepLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [prepLeft, stage, hasInteracted]);

  // 2. Audio playback
  useEffect(() => {
    if (stage === "PLAYING" && audioRef.current) {
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("Playback failed even after interaction:", err);
          setStage("WRITING");
        });
      }
    }
  }, [stage]);

  const handleStart = () => {
    setHasInteracted(true);
  };

  const handleAudioEnd = () => setStage("WRITING");

  useEffect(() => {
    setAnswerKey("answer", userInput);
    if (isSectionExpired || (stage === "WRITING" && userInput.trim().length > 0)) {
      setPhase("finished");
    } else {
      setPhase("prep");
    }
  }, [userInput, stage, isSectionExpired, setAnswerKey, setPhase]);

  // If user hasn't clicked "Start", show the interaction overlay
  if (!hasInteracted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-300 min-h-[400px] space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800">Audio Question Ready</h3>
          <p className="text-gray-500 mt-2">Click the button below to start the preparation timer and listen to the audio.</p>
        </div>
        <Button onClick={handleStart} size="lg" className="rounded-full px-8 gap-2 bg-sky-600 hover:bg-sky-700">
          <PlayCircle className="w-5 h-5" />
          Begin Question
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">{subsection}</h2>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[160px] space-y-4">
        {stage === "PREP" && (
          <div className="w-full max-w-md text-center space-y-3">
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-widest">Starting in {prepLeft}s...</p>
            <Progress value={(prepLeft / prepSeconds) * 100} className="h-2" />
          </div>
        )}

        {stage === "PLAYING" && (
          <div className="flex flex-col items-center space-y-3 animate-pulse text-blue-600">
            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 9v6m0 0l-3-3m3 3l3-3"></path></svg>
            </div>
            <p className="font-bold">Playing Audio...</p>
          </div>
        )}

        {stage === "WRITING" && (
          <div className="text-green-600 font-bold flex items-center gap-2">
            <span className="h-2 w-2 bg-green-600 rounded-full animate-ping" />
            Audio Finished. Please type your answer.
          </div>
        )}

        <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnd} className="hidden" />
      </div>

      <Textarea
        placeholder={stage === "WRITING" ? "Type what you heard..." : "Audio must play before typing..."}
        className="min-h-[200px] text-lg p-6"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        disabled={stage !== "WRITING" || isSectionExpired}
      />
    </div>
  );
}