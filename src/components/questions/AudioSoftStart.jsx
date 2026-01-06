"use client";
import React, { useState, useEffect, useRef } from "react";
import { Mic, Info, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * AudioSoftStart
 * - 10s Thinking Time (Prep)
 * - 20s Automatic Recording
 * - Static Professional UI (No distracting animations)
 * - Next Stage button integration
 */


export default function AudioSoftStart({ onNext }) {
  const [stage, setStage] = useState("PREP"); // PREP, RECORDING, FINISHED
  const [timeLeft, setTimeLeft] = useState(10);
  
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else {
      if (stage === "PREP") {
        startRecording();
      } else if (stage === "RECORDING") {
        stopRecording();
      }
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, stage]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();
      
      setStage("RECORDING");
      setTimeLeft(20);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Please enable microphone access to proceed.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setStage("FINISHED");
    setTimeLeft(0);
  };

  return (
    <div className="max-w-3xl mx-auto my-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full transition-colors duration-500 ${
              stage === "RECORDING" ? "bg-red-100 text-red-600" : "bg-sky-100 text-sky-600"
            }`}>
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">
                Speaking Introduction
              </h2>
              <p className="text-sm text-slate-500 font-medium">Step 2 of 2: Voice Check</p>
            </div>
          </div>
          
          <div className="text-right">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
               {stage === "PREP" ? "Thinking Time" : stage === "RECORDING" ? "Recording" : "Status"}
             </span>
             <div className={`text-2xl font-mono font-bold ${stage === "RECORDING" ? "text-red-600" : "text-sky-600"}`}>
               {stage === "FINISHED" ? "00:00" : `00:${String(timeLeft).padStart(2, "0")}`}
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center">
          <div className="w-full bg-slate-50 border border-slate-100 p-5 rounded-xl flex gap-4 items-start mb-12">
            <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>Instruction:</strong> Read the following aloud:
              </p>
              <p className="text-lg font-medium text-slate-900 italic">
                "My name is [Your Name], and I am taking this test to practice my English skills for my future studies."
              </p>
            </div>
          </div>

          {/* Visual Indicator (Static) */}
          <div className="mb-10 text-center">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full border-2 transition-all duration-300 ${
              stage === "RECORDING" 
                ? "border-red-500 bg-red-50 text-red-700" 
                : stage === "FINISHED"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-slate-200 bg-white text-slate-400"
            }`}>
              {stage === "RECORDING" ? (
                <span className="flex items-center gap-2 font-bold uppercase text-xs tracking-wider">
                  <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
                  Microphone Active
                </span>
              ) : stage === "FINISHED" ? (
                <span className="flex items-center gap-2 font-bold uppercase text-xs tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  Recording Saved
                </span>
              ) : (
                <span className="font-bold uppercase text-xs tracking-wider">Standby</span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md space-y-3">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className={`h-full transition-all duration-1000 ease-linear ${
                  stage === "RECORDING" ? "bg-red-500" : "bg-sky-500"
                }`}
                style={{ 
                  width: stage === "FINISHED" ? "0%" : `${(timeLeft / (stage === "PREP" ? 10 : 20)) * 100}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
              <span>{stage === "PREP" ? "Prepare" : "Speak Now"}</span>
              <span>{stage === "FINISHED" ? "Complete" : `${timeLeft}s remaining`}</span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-center">
          <Button
            onClick={onNext}
            disabled={stage !== "FINISHED"}
            className={`group px-10 py-6 rounded-full font-bold text-lg transition-all duration-300 ${
              stage === "FINISHED"
                ? "bg-sky-600 text-white hover:bg-sky-700 shadow-lg scale-100"
                : "bg-slate-200 text-slate-400 scale-95 cursor-not-allowed"
            }`}
          >
            Start Official Exam
            <ArrowRight className={`ml-2 w-5 h-5 transition-transform ${stage === "FINISHED" ? "group-hover:translate-x-1" : ""}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}