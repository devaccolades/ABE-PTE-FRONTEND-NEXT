"use client";
import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { UserCircle, Info } from "lucide-react";

/**
 * PersonalIntroduction
 * - Soft start component for examinees
 * - 50-word hard limit logic
 * - Real-time word counter with color-coded feedback
 */
export default function PersonalIntroduction({ onComplete }) {
  const [text, setText] = useState("");
  const wordLimit = 50;

  // Helper to count words accurately
  const getWordCount = (val) => {
    const trimmed = val.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  };

  const currentCount = getWordCount(text);

  const handleChange = (e) => {
    const newValue = e.target.value;
    const newCount = getWordCount(newValue);

    // Hard block: Only allow change if within limit or if deleting
    if (newCount <= wordLimit || newValue.length < text.length) {
      setText(newValue);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center gap-4">
          <div className="bg-sky-100 p-3 rounded-full">
            <UserCircle className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 tracking-tight">
              Personal Introduction
            </h2>
            <p className="text-sm text-slate-500">
              Briefly introduce yourself to the institution.
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 space-y-6">
          <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
            <p className="text-sm text-sky-800 leading-relaxed">
              <strong>Question:</strong> Talk about your interests, your family, or your reasons for studying abroad. 
              This part is not scored but will be sent to the institutions you apply to.
            </p>
          </div>

          <div className="relative">
            <Textarea
              value={text}
              onChange={handleChange}
              placeholder="Start typing your introduction here..."
              className="min-h-[220px] text-lg p-6 bg-white border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 rounded-xl resize-none leading-relaxed transition-all"
            />
            
            {/* Bottom Counter Bar */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                currentCount >= wordLimit 
                  ? "bg-red-50 text-red-600 border-red-100" 
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                {currentCount} / {wordLimit} words
              </div>
            </div>
          </div>

          {/* Footer Instruction */}
          <div className="flex justify-between items-center pt-4">
            <p className="text-xs text-slate-400 italic">
              * Ensure your response is clear and professional.
            </p>
            
            <button
              disabled={currentCount === 0}
              onClick={() => onComplete && onComplete(text)}
              className={`px-8 py-2.5 rounded-full font-bold text-sm transition-all ${
                currentCount > 0 
                  ? "bg-sky-600 text-white hover:bg-sky-700 shadow-md" 
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Finish Introduction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}