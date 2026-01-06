"use client";
import React, { useState } from "react";
import {
  Info,
  Clock,
  Layers,
  Mic,
  BookOpen,
  Headphones,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AreyousureModal from "@/components/modals/AreyousureModal"; // Assuming this is the path
import { useExamStore } from "@/store";

export default function PTESectionNotification() {
  // --- State for Modal Control ---
  const [callAreYouSure, setCallAreYouSure] = useState(false);
  const setExamStarted = useExamStore((s) => s.setStartExam);

  const sections = [
    {
      title: "Speaking & Writing",
      duration: "54 - 67 minutes",
      icon: <Mic className="w-5 h-5 text-sky-600" />,
      tasks: "Read Aloud, Repeat Sentence, Describe Image, Essay",
    },
    {
      title: "Reading",
      duration: "29 - 30 minutes",
      icon: <BookOpen className="w-5 h-5 text-indigo-600" />,
      tasks: "Fill in the Blanks, Multiple Choice, Re-order Paragraphs",
    },
    {
      title: "Listening",
      duration: "30 - 43 minutes",
      icon: <Headphones className="w-5 h-5 text-emerald-600" />,
      tasks: "Summarize Spoken Text, Fill in the Blanks, Write from Dictation",
    },
  ];

  // --- Handlers ---
  const handleInitialClick = () => {
    setCallAreYouSure(true);
  };

  const handleModalNext = () => {
    setCallAreYouSure(false);

    // 1. This updates the global Zustand store
    setExamStarted(true);

    // 2. This ensures that if the user refreshes, they stay in the exam
    localStorage.setItem("startExam", "true");
  };

  return (
    <div className="max-w-3xl mx-auto my-12 animate-in fade-in zoom-in duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-sky-600 p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-6 h-6 text-sky-200" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-100">
              Official Briefing
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            PTE Academic Exam Structure
          </h1>
          <p className="mt-2 text-sky-50 text-sm leading-relaxed max-w-xl">
            You are about to start the full examination. Once the exam starts,
            the global section timer will begin immediately.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-8">
          <div className="flex items-center gap-2 mb-8 text-slate-400">
            <Layers className="w-4 h-4" />
            <h2 className="text-xs font-bold uppercase tracking-widest">
              Examination Roadmap
            </h2>
          </div>

          <div className="space-y-6">
            {sections.map((section, idx) => (
              <div
                key={idx}
                className="group relative flex gap-6 p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-sky-200 hover:shadow-md transition-all duration-300"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm group-hover:border-sky-100 transition-colors">
                  {section.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-slate-800 text-lg">
                      {section.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-semibold">
                      <Clock className="w-3 h-3" />
                      {section.duration}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 leading-normal">
                    {section.tasks}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Important Notice Box */}
          <div className="mt-10 p-5 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4 items-start">
            <div className="bg-white p-2 rounded-lg border border-amber-200">
              <Info className="w-5 h-5 text-amber-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900">
                Final Instructions
              </p>
              <ul className="text-xs text-amber-800/80 space-y-1 list-disc list-inside leading-relaxed">
                <li>
                  You cannot go back to previous questions once submitted.
                </li>
                <li>
                  Ensure your microphone is positioned 2 inches from your mouth.
                </li>
                <li>Verify your internet stability before proceeding.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-8 flex flex-col items-center">
          <Button
            onClick={handleInitialClick}
            className="w-full max-w-sm py-7 text-lg font-bold bg-sky-600 hover:bg-sky-700 rounded-full shadow-lg hover:shadow-sky-200 transition-all flex gap-3 group text-white"
          >
            Go to Exam
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="mt-4 text-[10px] text-slate-400 uppercase tracking-[0.2em] font-medium">
            Authorized Digital Assessment Environment
          </p>
        </div>
      </div>

      {/* --- Modal Logic --- */}
      {callAreYouSure && (
        <AreyousureModal
          content="Are you sure you want to start the exam? Once started, the timer will begin and you won't be able to pause or exit."
          nextQuestion="Start Exam"
          onClose={() => setCallAreYouSure(false)}
          onNext={handleModalNext}
        />
      )}
    </div>
  );
}
