"use client";
import React from "react";
import { 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  Home, 
  Trophy, 
  BarChart3, 
  Clock 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ExamCompleteScreen({
  examTitle = "PTE Academic Practice Test",
  score = null,
  timeSpent = "01:20:00",
  // Updated default handler to clear storage
  onReset = () => {
    localStorage.clear(); 
    window.location.reload();
  },
  onGoHome = () => {},
  onViewAnalysis = () => {},
}) {
  
  // Internal wrapper to ensure storage is cleared if the prop is passed externally
  const handleRetry = () => {
    localStorage.clear();
    // If you use a custom reset logic from props, call it here
    onReset();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 md:p-6 bg-slate-50/50">
      <Card className="max-w-2xl w-full p-6 md:p-10 border-none shadow-2xl bg-white rounded-3xl text-center space-y-6 md:space-y-8 animate-in fade-in zoom-in duration-500">
        
        {/* Success Icon & Celebration */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25" />
            <div className="relative bg-green-50 p-6 rounded-full">
              <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 text-green-500" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Exam Completed!
          </h1>
          <p className="text-sm md:text-base text-gray-500 max-w-sm mx-auto">
            Great job! You have successfully finished the <span className="font-semibold text-gray-700">{examTitle}</span>. Your answers have been submitted for scoring.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 py-2">
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <Clock className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-[10px] md:text-xs text-blue-600 font-bold uppercase tracking-wider">Time Spent</p>
            <p className="text-lg md:text-xl font-bold text-blue-900">{timeSpent}</p>
          </div>
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
            <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className="text-[10px] md:text-xs text-amber-600 font-bold uppercase tracking-wider">Status</p>
            <p className="text-lg md:text-xl font-bold text-amber-900">Submitted</p>
          </div>
          <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
            <BarChart3 className="w-5 h-5 text-purple-500 mx-auto mb-2" />
            <p className="text-[10px] md:text-xs text-purple-600 font-bold uppercase tracking-wider">Analysis</p>
            <p className="text-lg md:text-xl font-bold text-purple-900">Ready</p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center">
          <Button 
            onClick={onViewAnalysis}
            size="lg"
            className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white rounded-full px-8 py-6 text-base md:text-lg font-bold transition-all hover:shadow-lg active:scale-95"
          >
            View Detailed Score
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleRetry} // Calls the internal function that clears storage
            size="lg"
            className="w-full sm:w-auto rounded-full px-8 py-6 text-gray-600 font-bold hover:bg-gray-50 border-gray-200"
          >
            <RotateCcw className="mr-2 w-5 h-5" />
            Retry Test
          </Button>
        </div>

        <button 
          onClick={onGoHome}
          className="text-gray-400 hover:text-sky-600 flex items-center gap-2 mx-auto transition-colors text-[10px] md:text-xs font-semibold uppercase tracking-widest pt-2"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </button>

      </Card>
    </div>
  );
}