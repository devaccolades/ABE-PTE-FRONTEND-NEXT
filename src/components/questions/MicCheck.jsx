"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  RotateCcw,
  Volume2,
  Mic,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import PremiumPrepCountdown from "../ui/PremiumPrepCountdown";

/**
 * MicCheck Component
 * - 5s Preparation
 * - 10s Recording
 * - Instant Playback for Review
 * - "Try Again" functionality
 */
export default function MicCheck({ onFinished }) {
  const [stage, setStage] = useState("IDLE"); // IDLE, PREP, RECORDING, REVIEW
  const [prepLeft, setPrepLeft] = useState(5);
  const [recLeft, setRecLeft] = useState(10);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const playbackRef = useRef(null);

  // --- Logic: Countdown & State Transitions ---
  useEffect(() => {
    let timer;
    if (stage === "PREP") {
      if (prepLeft > 0) {
        timer = setTimeout(() => setPrepLeft((prev) => prev - 1), 1000);
      } else {
        startRecording();
      }
    } else if (stage === "RECORDING") {
      if (recLeft > 0) {
        timer = setTimeout(() => setRecLeft((prev) => prev - 1), 1000);
      } else {
        stopRecording();
      }
    }
    return () => clearTimeout(timer);
  }, [stage, prepLeft, recLeft]);

  // --- Recording Actions ---
  const startRecording = async () => {
    setStage("RECORDING");
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (e) =>
        audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setAudioUrl(URL.createObjectURL(blob));
      };
      mediaRecorderRef.current.start();
    } catch (err) {
      alert("Microphone access denied or not found.");
      setStage("IDLE");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
    setStage("REVIEW");
  };

  const handleReset = () => {
    setAudioUrl(null);
    setPrepLeft(5);
    setRecLeft(10);
    setStage("PREP");
  };

  const togglePlayback = () => {
    if (isPlaying) {
      playbackRef.current.pause();
    } else {
      playbackRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // ---------------- UI ----------------
  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl border shadow-xl">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Microphone Check</h2>
        <p className="text-gray-500 mt-2 text-sm">
          Speak clearly into your microphone to ensure your audio is being
          captured correctly.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-gray-100 rounded-xl bg-gray-50 p-6">
        {stage === "IDLE" && (
          <Button
            onClick={() => setStage("PREP")}
            size="lg"
            className="rounded-full px-8 gap-2 bg-sky-600"
          >
            <Mic className="w-5 h-5" /> Start Test
          </Button>
        )}

        {stage === "PREP" && (
          <PremiumPrepCountdown prepLeft={prepLeft} totalPrep={5} />
        )}

        {stage === "RECORDING" && (
          <div className="text-center space-y-4 w-full max-w-xs">
            <div className="flex items-center justify-center gap-2 text-red-600 animate-pulse">
              <span className="h-3 w-3 bg-red-600 rounded-full" />
              <p className="font-bold text-xl">RECORDING: {recLeft}s</p>
            </div>
            <Progress value={(recLeft / 10) * 100} className="h-2 bg-red-100" />
            <Button
              variant="outline"
              onClick={stopRecording}
              className="mt-4 border-red-200 text-red-600 hover:bg-red-50"
            >
              Stop Now
            </Button>
          </div>
        )}

        {stage === "REVIEW" && (
          <div className="w-full space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" /> Recording Complete
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={togglePlayback}
                  variant="secondary"
                  className="gap-2 rounded-full px-6"
                >
                  {isPlaying ? (
                    <Square className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  {isPlaying ? "Stop Playback" : "Play My Recording"}
                </Button>

                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="gap-2 rounded-full px-6"
                >
                  <RotateCcw className="w-4 h-4" /> Try Again
                </Button>
              </div>
            </div>

            <audio
              ref={playbackRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )}
      </div>

      {stage === "REVIEW" && (
        <div className="mt-8 pt-6 border-t flex flex-col items-center">
          <p className="text-sm text-gray-500 mb-4 text-center">
            If you can hear your voice clearly and at a good volume, you are
            ready to proceed.
          </p>
          <Button
            onClick={onFinished}
            className="w-full max-w-xs bg-green-600 hover:bg-green-700 text-white font-bold py-6 rounded-xl"
          >
            Everything is Perfect
          </Button>
        </div>
      )}
    </div>
  );
}
