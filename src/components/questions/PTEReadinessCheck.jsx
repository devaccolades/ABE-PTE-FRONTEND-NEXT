"use client";
import React, { useState } from "react";
import { 
  Wifi, 
  Monitor, 
  Battery, 
  Mic, 
  AlertTriangle, 
  CheckCircle,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PTEReadinessCheck({ onProceed }) {
  const [agreed, setAgreed] = useState(false);

  const requirements = [
    {
      icon: <Wifi className="text-blue-600" />,
      title: "Stable Internet",
      desc: "Minimum 5Mbps upload/download. Avoid mobile hotspots if possible.",
    },
    {
      icon: <Monitor className="text-purple-600" />,
      title: "Device Requirements",
      desc: "Use a PC/Laptop with latest Chrome/Edge. Ensure your battery is plugged in.",
    },
    {
      icon: <Mic className="text-green-600" />,
      title: "Audio Setup",
      desc: "Use a high-quality wired headset. Wireless earbuds are not recommended.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto my-10 p-1 bg-white rounded-2xl shadow-2xl border border-gray-100">
      {/* Official Header */}
      <div className="bg-sky-900 text-white p-6 rounded-t-xl flex items-center gap-4">
        <ShieldCheck className="w-10 h-10 text-sky-300" />
        <div>
          <h1 className="text-2xl font-bold">PTE Official Examination Environment</h1>
          <p className="text-sky-100 text-sm">System Compatibility & Environment Check</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Warning Banner */}
        <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
          <p className="text-sm text-amber-800 leading-relaxed">
            <strong>Warning:</strong> Technical failure due to poor network or low battery will result 
            in exam termination. Ensure you are in a quiet room with no background noise.
          </p>
        </div>

        {/* Requirements Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {requirements.map((req, idx) => (
            <div key={idx} className="p-5 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition-all">
              <div className="mb-3">{req.icon}</div>
              <h3 className="font-bold text-gray-800 text-base">{req.title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-normal">{req.desc}</p>
            </div>
          ))}
        </div>

        {/* Checkboxes */}
        <div className="space-y-4 pt-4 border-t">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-sky-600 cursor-pointer" 
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="text-sm text-gray-700 font-medium group-hover:text-sky-700 transition-colors">
              I have checked my network, audio, and device. I am ready to begin the exam.
            </span>
          </label>
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-center pt-4">
          <Button 
            disabled={!agreed}
            onClick={onProceed}
            className={`w-full max-w-sm py-6 text-lg font-bold rounded-full transition-all duration-300 ${
              agreed 
                ? "bg-sky-600 hover:bg-sky-700 shadow-lg scale-100" 
                : "bg-gray-300 scale-95 cursor-not-allowed text-gray-500"
            }`}
          >
            {agreed ? "Proceed to Exam" : "Please Complete Checklist"}
          </Button>
          <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-widest">
            Pearson Language Tests Standardized Environment
          </p>
        </div>
      </div>
    </div>
  );
}