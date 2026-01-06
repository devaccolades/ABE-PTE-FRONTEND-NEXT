"use client";
import React from "react";
import { Progress } from "@/components/ui/progress"; // Assuming shadcn/ui

export default function PremiumPrepCountdown({ prepLeft, totalPrep = 5 }) {
  // We want the progress bar to shrink or grow smoothly
  const progressValue = (prepLeft / totalPrep) * 100;

  return (
    <div className="w-full max-w-md mx-auto py-4">
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
        {/* Minimalist Top Label */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Preparation
          </span>
        </div>

        {/* Large, clean clock */}
        <div className="mb-6">
          <h2 className="text-7xl font-light text-slate-800 tabular-nums tracking-tight">
            00:
            <span className="text-sky-600 font-semibold">
              {String(prepLeft).padStart(2, "0")}
            </span>
          </h2>
        </div>

        {/* Modern, Mild Progress Bar */}
        <div className="w-full space-y-3">
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
            <div
              className="h-full bg-sky-500 transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(14,165,233,0.3)]"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            <span>Standby</span>
            <span
              className={prepLeft <= 2 ? "text-sky-600 transition-colors" : ""}
            >
              {prepLeft <= 2 ? "Ready to speak" : "Recording starts soon"}
            </span>
          </div>
        </div>

        {/* Helpful Tip */}
        <div className="mt-8 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-500 leading-relaxed italic">
            "Check your microphone position during this time."
          </p>
        </div>
      </div>
    </div>
  );
}
