import React, { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";

/**
 * AudioHighlightBox (auto-play after prepSeconds, no manual controls)
 *
 * Props:
 * - audioSrc (string) OR output (string) -> main audio path
 * - text (string) -> paragraph to show; each word becomes highlightable
 * - prepSeconds (number) -> wait this long (seconds) then autoplay main audio
 * - onNext (function) -> kept for compatibility but NOT called automatically by this component
 */

export default function AudioHighlightBox({
  audioSrc,
  output,
  text = "",
  prepSeconds = 0,
  onNext,
}) {
  const mainSrc = audioSrc || output || "";
  const audioRef = useRef(null);

  const [phase, setPhase] = useState(prepSeconds > 0 ? "prep" : "idle"); // prep | playing | finished | error | idle
  const [prepLeft, setPrepLeft] = useState(Math.max(0, prepSeconds));
  const [playing, setPlaying] = useState(false);
  const [playedCount, setPlayedCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [sourceError, setSourceError] = useState("");

  // tokenize once per text change
  const tokensRef = useRef(tokenize(text));
  useEffect(() => {
    tokensRef.current = tokenize(text);
    // reset highlights on text change
    setHighlighted(new Set());
  }, [text]);

  // highlighted indices (Set)
  const [highlighted, setHighlighted] = useState(new Set());

  // reset when audio source changes
  useEffect(() => {
    setHighlighted(new Set());
    setProgress(0);
    setPlaying(false);
    setPlayedCount(0);
    setSourceError("");
    setPhase(prepSeconds > 0 ? "prep" : "idle");
    setPrepLeft(Math.max(0, prepSeconds));

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainSrc]);

  // prep countdown -> autoplay attempt
  useEffect(() => {
    if (phase !== "prep") return;
    if (prepLeft <= 0) {
      attemptAutoPlay();
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepLeft]); // eslint-disable-line

  // attach audio listeners
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    function onPlay() {
      setPlaying(true);
      setPlayedCount((c) => c + 1);
      setPhase("playing");
    }
    function onPauseOrEnded() {
      setPlaying(false);
      if (el.ended) setPhase("finished");
    }
    function onTime() {
      try {
        if (el.duration && !isNaN(el.duration)) {
          setProgress((el.currentTime / el.duration) * 100);
        }
      } catch (e) {}
    }
    function onError() {
      setSourceError("Audio failed to load or play.");
      setPhase("error");
    }

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPauseOrEnded);
    el.addEventListener("ended", onPauseOrEnded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("error", onError);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPauseOrEnded);
      el.removeEventListener("ended", onPauseOrEnded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("error", onError);
    };
  }, [mainSrc]);

  async function attemptAutoPlay() {
    const a = audioRef.current;
    if (!mainSrc || !a) {
      setSourceError("No audio source provided.");
      setPhase("finished"); // allow user to highlight even if no audio
      return;
    }

    try {
      try {
        a.currentTime = 0;
      } catch {}
      const p = a.play();
      if (p && p.catch) {
        await p.catch((err) => {
          // Autoplay blocked — mark error and move to finished (so user can still highlight)
          setSourceError("Autoplay blocked by browser.");
          setPhase("finished");
          throw err;
        });
      }
    } catch (err) {
      // Already handled above by setting sourceError and phase
      console.warn("Autoplay attempt failed:", err);
    }
  }

  function toggleHighlight(idx) {
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // The UI is minimal and automatic — no manual controls shown.
  return (
    <div className="space-y-6">
      {/* Status / playback card (readonly) */}
      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 text-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-md font-medium shadow-sm bg-white border">
              {phase === "prep"
                ? `Preparing… (${prepLeft}s)`
                : phase === "playing"
                ? "Playing audio…"
                : phase === "finished"
                ? "Finished"
                : phase === "error"
                ? "Error"
                : "Idle"}
            </div>

            <div className="text-sm text-gray-600">Plays: {playedCount}</div>
          </div>

          <div className="text-xs text-gray-600">
            {phase === "playing"
              ? `${Math.round(progress)}%`
              : phase === "prep"
              ? `${prepLeft}s`
              : ""}
          </div>
        </div>

        <div className="mt-3">
          <Progress value={Math.round(phase === "playing" ? progress : 0)} />
        </div>

        {sourceError && <div className="mt-2 text-xs text-red-600">{sourceError}</div>}
      </div>

      {/* Hidden audio element (autoplayed) */}
      <audio ref={audioRef} src={mainSrc} preload="auto" />

      {/* Paragraph with highlightable words */}
      <div className="rounded-lg border border-gray-200 p-6 bg-white text-gray-900 leading-relaxed text-lg">
        {tokensRef.current.map((t, idx) => {
          if (!t.isWord) {
            return (
              <span key={idx} aria-hidden>
                {t.value}
              </span>
            );
          }
          const isHighlighted = highlighted.has(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleHighlight(idx)}
              className={`inline-block mr-1 mb-0.5 text-left leading-tight px-1 py-0.5 rounded-sm focus:outline-none ${
                isHighlighted ? "bg-yellow-300" : "bg-transparent"
              }`}
              style={{
                border: "none",
                background: isHighlighted ? "rgba(250,204,21,0.35)" : "transparent",
                cursor: "pointer",
              }}
              aria-pressed={isHighlighted}
              title={isHighlighted ? "Unhighlight" : "Highlight"}
            >
              {t.value}
            </button>
          );
        })}
      </div>

      {/* Note: no manual buttons (Submit/Clear/Next) shown here. */}
    </div>
  );
}

/* ---- helper tokenizer ---- */
function tokenize(str) {
  if (!str) return [];
  const regex =
    /([A-Za-z0-9\u00C0-\u017F'\-]+)|(\s+|[^\sA-Za-z0-9\u00C0-\u017F'\-]+)/g;
  const tokens = [];
  let m;
  while ((m = regex.exec(str)) !== null) {
    if (m[1]) tokens.push({ value: m[1], isWord: true });
    else if (m[2]) tokens.push({ value: m[2], isWord: false });
  }
  return tokens;
}
