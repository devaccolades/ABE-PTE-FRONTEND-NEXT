import React, { useEffect, useRef, useState } from "react";

/**
 * AudioToMCQ (plain JavaScript, React) — Auto-play main audio after prepSeconds
 *
 * Props:
 * - audioSrc (string) OR output (string)
 * - prepSeconds (number) optional (default 0) — wait this long then autoplay main audio
 * - options: array of { id, text, audioSrc? }
 *
 * Notes:
 * - No manual controls for the main audio (no Play/Stop buttons)
 * - Option-level audio still has a small player with Play/Stop for convenience
 * - Submit / Clear / Next buttons and their logic have been removed
 */

export default function AudioToMCQ({ audioSrc, output, prepSeconds = 0, options = [] }) {
  const mainSrc = audioSrc || output || "";
  const audioRef = useRef(null);
  const optionPlayersRef = useRef(new Map());

  const [playing, setPlaying] = useState(false);
  const [playedCount, setPlayedCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(prepSeconds > 0 ? "prep" : "idle"); // prep | playing | idle | finished | error
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [error, setError] = useState("");

  // selection state (multi-select) still available to UI, but no submit button
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Attach listeners to main audio
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    function onPlay() {
      setPlaying(true);
      setPlayedCount((c) => c + 1);
      setPhase("playing");
      // pause option audios when main plays
      optionPlayersRef.current.forEach((el) => {
        try {
          if (el && !el.paused) {
            el.pause();
            el.currentTime = 0;
          }
        } catch (e) {}
      });
    }
    function onPauseOrEnded() {
      setPlaying(false);
      if (audioEl.ended) setPhase("finished");
    }
    function onTimeUpdate() {
      if (audioEl.duration && !isNaN(audioEl.duration)) {
        setProgress((audioEl.currentTime / audioEl.duration) * 100);
      }
    }
    function onError() {
      setError("Main audio failed to play.");
      setPhase("error");
    }

    audioEl.addEventListener("play", onPlay);
    audioEl.addEventListener("pause", onPauseOrEnded);
    audioEl.addEventListener("ended", onPauseOrEnded);
    audioEl.addEventListener("timeupdate", onTimeUpdate);
    audioEl.addEventListener("error", onError);

    return () => {
      audioEl.removeEventListener("play", onPlay);
      audioEl.removeEventListener("pause", onPauseOrEnded);
      audioEl.removeEventListener("ended", onPauseOrEnded);
      audioEl.removeEventListener("timeupdate", onTimeUpdate);
      audioEl.removeEventListener("error", onError);
    };
  }, [mainSrc]);

  // Reset UI when main source or options change
  useEffect(() => {
    setSelectedIds(new Set());
    setPlayedCount(0);
    setProgress(0);
    setPlaying(false);
    setError("");
    setPhase(prepSeconds > 0 ? "prep" : "idle");
    setPrepLeft(prepSeconds);

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {}
    }

    optionPlayersRef.current.forEach((el) => {
      try {
        if (el && !el.paused) {
          el.pause();
          el.currentTime = 0;
        }
      } catch (e) {}
    });
  }, [mainSrc, options, prepSeconds]);

  // Prep countdown — autoplay when reaches 0
  useEffect(() => {
    if (phase !== "prep") return;
    if (prepLeft <= 0) {
      autoPlayMain().catch((e) => {
        console.warn("Autoplay failed:", e);
        setError("Autoplay was blocked or failed.");
        setPhase("error");
      });
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepLeft]);

  // autoplay helper
  async function autoPlayMain() {
    if (!mainSrc || !audioRef.current) {
      setError("No main audio source available.");
      setPhase("error");
      return;
    }
    try {
      audioRef.current.currentTime = 0;
    } catch {}
    try {
      const p = audioRef.current.play();
      if (p && p.catch) {
        await p.catch((err) => {
          // autoplay blocked
          throw err;
        });
      }
    } catch (err) {
      throw err;
    }
  }

  // register/unregister option-level audio elements so parent can pause them
  function registerOptionPlayer(id, el) {
    if (!id) return;
    if (el) optionPlayersRef.current.set(id, el);
    else optionPlayersRef.current.delete(id);
  }

  // selection toggling (multi-select)
  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Playback card — no manual play/stop */}
      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 text-gray-900">
        <div className="flex items-center gap-3">
          {/* Show readonly status instead of controls */}
          <div className="px-3 py-2 rounded-md font-medium shadow-sm bg-white border">
            {phase === "prep"
              ? `Starting in ${prepLeft}s`
              : playing
              ? "Playing"
              : phase === "finished"
              ? "Finished"
              : phase === "error"
              ? "Error"
              : "Idle"}
          </div>

          <div className="text-sm text-gray-600">Plays: {playedCount}</div>
        </div>

        <div className="mt-3 text-sm flex items-center justify-between">
          <div className="font-medium">Playback progress</div>
          <div className="text-xs text-gray-600">{Math.round(progress)}%</div>
        </div>

        <div className="w-full h-2 bg-gray-200 rounded mt-2 overflow-hidden">
          <div
            className="h-full bg-gray-700"
            style={{ width: `${progress}%`, transition: "width 120ms linear" }}
          />
        </div>

        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      </div>

      {/* Hidden main audio element (no controls) */}
      <audio ref={audioRef} src={mainSrc} preload="auto" />

      {/* Options (multi-select) */}
      <div className="space-y-2">
        <div className="font-medium">Select all correct options</div>
        <div className="grid gap-2">
          {options.map((opt) => {
            const checked = selectedIds.has(opt.id);
            return (
              <label
                key={opt.id}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:shadow-sm ${
                  checked ? "border-blue-500 bg-blue-50" : "bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  name="audio-mcq"
                  checked={checked}
                  onChange={() => toggleSelect(opt.id)}
                  className="mt-1 form-checkbox"
                />

                <div className="flex-1">
                  <div className="text-sm font-medium">{opt.text}</div>

                  {opt.audioSrc ? (
                    <div className="mt-1">
                      <SmallAudioPlayer
                        id={opt.id}
                        src={opt.audioSrc}
                        register={registerOptionPlayer}
                        pauseMain={() => {
                          try {
                            if (audioRef.current && !audioRef.current.paused) {
                              audioRef.current.pause();
                              audioRef.current.currentTime = 0;
                            }
                          } catch (e) {}
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** SmallAudioPlayer: per-option player with Play/Stop button */
function SmallAudioPlayer({ id, src, register, pauseMain }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!register) return;
    register(id, ref.current);
    return () => register(id, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    function onPlay() {
      setPlaying(true);
      if (pauseMain) pauseMain();
    }
    function onPause() {
      setPlaying(false);
    }
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onPause);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onPause);
    };
  }, [ref.current]);

  function toggle() {
    if (!ref.current) return;
    if (playing) {
      try {
        ref.current.pause();
        ref.current.currentTime = 0;
      } catch {}
    } else {
      try {
        ref.current.currentTime = 0;
        const p = ref.current.play();
        if (p && p.catch) p.catch(() => {});
      } catch {}
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className="px-2 py-1 border rounded-md text-sm bg-white"
      >
        {playing ? "Stop" : "Play"}
      </button>
      <audio ref={ref} src={src} preload="none" />
    </div>
  );
}
