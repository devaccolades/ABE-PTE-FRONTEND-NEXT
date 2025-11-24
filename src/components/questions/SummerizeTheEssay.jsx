import React, { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

export default function SummerizeTheEssay({
  promptText = "The quick brown fox jumps over the lazy dog.",
  output,
  prepSeconds = 0,
}) {
  const [userText, setUserText] = useState("");
  const [playedCount, setPlayedCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [prepLeft, setPrepLeft] = useState(prepSeconds || 0);
  const [phase, setPhase] = useState(prepSeconds > 0 ? "prep" : "playing");
  const [error, setError] = useState("");

  const audioRef = useRef(null);

  // Attach audio listeners
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onPlay = () => setPlayedCount((c) => c + 1);

    const onEnded = () => {
      setProgress(100);
      setPhase("finished");
    };

    const onTimeUpdate = () => {
      try {
        if (a.duration && !isNaN(a.duration)) {
          setProgress((a.currentTime / a.duration) * 100);
        }
      } catch {}
    };

    const onError = () => {
      setError("Audio failed to play.");
      setPhase("error");
    };

    a.addEventListener("play", onPlay);
    a.addEventListener("ended", onEnded);
    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("error", onError);

    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("error", onError);
    };
  }, [audioRef.current]);

  // Prep countdown
  useEffect(() => {
    if (phase !== "prep") return;
    if (prepLeft <= 0) {
      playAudio();
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepLeft]);

  // If output changes, reset everything
  useEffect(() => {
    setProgress(0);
    setPlayedCount(0);
    setError("");

    if (prepSeconds > 0) {
      setPrepLeft(prepSeconds);
      setPhase("prep");
    } else {
      setPhase("playing");
      setTimeout(playAudio, 0);
    }

    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    }
  }, [output]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (!a) return;
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    };
  }, []);

  async function playAudio() {
    const a = audioRef.current;
    if (!a || !output) {
      setError("No audio source provided.");
      setPhase("error");
      return;
    }

    try {
      a.currentTime = 0;
      const p = a.play();

      if (p && p.catch) {
        await p.catch(() => {
          setError(
            "Autoplay blocked by browser. Interaction required to play audio."
          );
          setPhase("error");
        });
      }
    } catch (e) {
      setError("Audio playback failed.");
      setPhase("error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 text-gray-900">
        {phase === "prep" ? (
          <div>
            <div className="font-medium">Preparing…</div>
            <div className="text-sm text-gray-600">Starts in {prepLeft}s</div>
          </div>
        ) : phase === "playing" ? (
          <div>
            <div className="font-medium">Playing audio…</div>
            <div className="text-sm text-gray-600">Plays: {playedCount}</div>
          </div>
        ) : phase === "finished" ? (
          <div className="font-medium">Audio finished</div>
        ) : phase === "error" ? (
          <div className="font-medium text-red-600">{error}</div>
        ) : null}
      </div>

      {/* Playback Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="font-medium">Playback progress</div>
          <div className="text-xs text-gray-600">{Math.round(progress)}%</div>
        </div>
        <Progress value={Math.round(progress)} />
      </div>

      {/* Hidden audio */}
      <audio ref={audioRef} src={output} preload="auto" />

      {/* Textarea */}
      <Textarea
        value={userText}
        onChange={(e) => setUserText(e.target.value)}
        placeholder="Type the summary here..."
        rows={8}
      />
    </div>
  );
}
