// src/components/WriteEssay.jsx

"use client";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useExamStore } from "@/store";

// Hooks & UI Components
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function WriteEssay({ promptText, questionId }) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const answers = useExamStore((s) => s.answers); 
  
  // 1. Initialize text from store (or empty string)
  const [localText, setLocalText] = useState("");

  // 2. Global Section Timer only
  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  // 3. Update Store on Typing
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setLocalText(newText);
    setAnswerKey(questionId, { text: newText });
  };

  // 4. Phase Management
  useEffect(() => {
    if (isSectionExpired) {
      setPhase("finished");
    } else {
      // The essay is active immediately upon load
      setPhase("writing");
    }
  }, [isSectionExpired, setPhase]);

  return (
    <div className="space-y-6">
      {/* Global Section Timer Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Write Essay</h2>
        <SectionTimerDisplay 
          formattedTime={formattedTime} 
          isExpired={isSectionExpired} 
        />
      </div>

      {/* Prompt Area */}
      <div className="rounded-lg border border-gray-200 p-5 bg-gray-50 text-gray-900 shadow-sm">
        <RichTextDisplay htmlContent={promptText} />
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <Textarea
          value={localText}
          onChange={handleTextChange}
          placeholder="Write your essay here... (Minimum 200 words recommended)"
          disabled={isSectionExpired}
          rows={15}
          className="text-base leading-relaxed p-4 resize-none focus:ring-2 focus:ring-blue-500 min-h-[400px]"
        />
        
        {isSectionExpired && (
          <div className="absolute inset-0 bg-gray-100/40 backdrop-blur-[1px] rounded-md flex items-center justify-center">
             <div className="bg-white px-6 py-3 rounded-full shadow-xl border border-gray-200 font-bold text-gray-500">
               Section Time Expired - Editing Disabled
             </div>
          </div>
        )}
      </div>

      {/* Word Count Display */}
      <div className="flex justify-between items-center text-sm text-gray-500 px-1">
        <div className="bg-gray-100 px-3 py-1 rounded-md border">
          Word count: <span className="font-bold text-gray-800">
            {localText.trim() === "" ? 0 : localText.trim().split(/\s+/).length}
          </span>
        </div>
        {isSectionExpired && (
          <span className="text-red-500 font-medium">Your response has been saved.</span>
        )}
      </div>
    </div>
  );
}

function RichTextDisplay({ htmlContent }) {
  return (
    <div
      className="prose prose-sm max-w-none text-gray-800"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}