"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";

/**
 * FillBlanksTyped
 *
 * Props:
 * - audioSrc / output (string) : main audio source
 * - prepSeconds (number) : seconds to wait before auto-playing audio
 * - segments (array) : text segments; blanks are inserted between segments
 * - durationSeconds (number) : seconds allowed for typing (starts after audio ends or when autoplay is blocked)
 *
 * Notes:
 * - All manual controls (Play/Stop/Submit/Clear/Next) removed.
 * - Audio auto-plays after prepSeconds. If autoplay is blocked, the answer timer still starts.
 * - Inputs are enabled only during the answer period; they are disabled before the audio plays and after time expires.
 */
export default function FillBlanksTyped({
  audioSrc: propAudioSrc,
  output,
  prepSeconds = 0,
  segments = [],
  durationSeconds = 60,
}) {
  const audioSrc = propAudioSrc || output || "";

  // number of blanks = segments.length - 1
  const blankCount = Math.max(segments.length - 1, 0);

  // typed values for blanks
  const [values, setValues] = useState(() => Array(blankCount).fill(""));

  // answer timer left (starts when audio ends or autoplay blocked)
  const [left, setLeft] = useState(durationSeconds);

  // prep timer
  const [prepLeft, setPrepLeft] = useState(Math.max(0, prepSeconds));

  // phase: 'prep' | 'playing' | 'answer' | 'finished' | 'error'
  const [phase, setPhase] = useState(prepSeconds > 0 ? "prep" : "playing");

  // audio state
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [playedCount, setPlayedCount] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [sourceError, setSourceError] = useState(null);

  // reset when segments or audio changes
  useEffect(() => {
    setValues(Array(blankCount).fill(""));
    setLeft(durationSeconds);
    setPrepLeft(Math.max(0, prepSeconds));
    setPhase(prepSeconds > 0 ? "prep" : "playing");
    setPlaying(false);
    setAudioProgress(0);
    setSourceError(null);
    setPlayedCount(0);

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch (e) {}
  }, [audioSrc, JSON.stringify(segments), durationSeconds, prepSeconds]);

  // PREP countdown: when it reaches 0, attempt autoplay
  useEffect(() => {
    if (phase !== "prep") return;
    if (prepLeft <= 0) {
      attemptPlayOrStartAnswer();
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, prepLeft]);

  // Attach audio events
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    function onPlay() {
      setPlaying(true);
      setPlayedCount((c) => c + 1);
      setPhase("playing");
    }
    function onPause() {
      setPlaying(false);
    }
    function onTime() {
      try {
        if (el.duration && !isNaN(el.duration)) {
          setAudioProgress((el.currentTime / el.duration) * 100);
        }
      } catch (e) {}
    }
    function onEnded() {
      // audio finished -> start answer period
      setPlaying(false);
      setAudioProgress(100);
      setPhase("answer");
      setLeft(durationSeconds);
    }
    function onMeta() {
      setSourceError(null);
    }
    function onErr() {
      setSourceError("Failed to load audio. Check path or format.");
      // If audio can't load, start answer period anyway
      setPhase("answer");
      setLeft(durationSeconds);
    }

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("error", onErr);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("error", onErr);
    };
  }, [audioSrc, durationSeconds]);

  // Attempt autoplay, or if blocked, immediately start answer period
  async function attemptPlayOrStartAnswer() {
    const a = audioRef.current;
    if (!audioSrc || !a) {
      // no audio -> go straight to answer
      setPhase("answer");
      setLeft(durationSeconds);
      return;
    }

    try {
      // try to play from start
      try {
        a.currentTime = 0;
      } catch {}
      const p = a.play();
      if (p && p.catch) {
        await p.catch((err) => {
          // autoplay blocked: start answer period anyway
          console.warn("Autoplay blocked or failed:", err);
          setSourceError("Autoplay blocked by browser. You may not hear audio automatically.");
          setPhase("answer");
          setLeft(durationSeconds);
        });
      }
    } catch (e) {
      // If play throws, fallback to answer period
      console.warn("Play failed:", e);
      setSourceError("Audio autoplay failed.");
      setPhase("answer");
      setLeft(durationSeconds);
    }
  }

  // Answer countdown: only runs when phase === 'answer'
  useEffect(() => {
    if (phase !== "answer") return;
    if (left <= 0) {
      setPhase("finished");
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left]);

  // update values
  function updateValue(i, v) {
    setValues((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  // UI helpers
  const timerProgress = useMemo(() => {
    if (!durationSeconds) return 100;
    const pct = phase === "answer" ? Math.round(((durationSeconds - left) / durationSeconds) * 100) : 0;
    return pct;
  }, [durationSeconds, left, phase]);

  return (
    <div className="space-y-6">
      {/* Prep / status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {phase === "prep" && "Preparing..."}
            {phase === "playing" && "Playing audio..."}
            {phase === "answer" && "Answer now"}
            {phase === "finished" && "Time's up"}
            {phase === "error" && "Error"}
          </span>
          <span>
            {phase === "prep" && `${prepLeft}s`}
            {phase === "playing" && `${Math.round(audioProgress)}%`}
            {phase === "answer" && `${left}s`}
            {phase === "finished" && `0s`}
          </span>
        </div>
        <Progress value={phase === "answer" ? timerProgress : Math.round(audioProgress)} />
      </div>

      {/* Hidden audio element (autoplayed after prep) */}
      <audio ref={audioRef} src={audioSrc} preload="auto" />

      {/* Text with automatic blanks */}
      <div className="rounded-lg border p-6 bg-white text-lg leading-relaxed">
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            {seg}
            {/* Create a blank after every segment except last */}
            {i < blankCount && (
              <input
                type="text"
                value={values[i]}
                onChange={(e) => updateValue(i, e.target.value)}
                disabled={phase !== "answer" || left <= 0}
                style={{
                  display: "inline-block",
                  minWidth: 120,
                  border: "none",
                  borderBottom: "2px solid #000",
                  background: "transparent",
                  margin: "0 6px",
                  outline: "none",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Optional inline hint about error or state */}
      {sourceError && <div className="text-sm text-red-600">{sourceError}</div>}
      {phase === "finished" && <div className="text-sm text-gray-600">Time finished — inputs disabled.</div>}
    </div>
  );
}
