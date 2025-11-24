import React, { useEffect, useRef, useState } from "react";

/**
 * AudioToMCQRadioAuto
 *
 * Props:
 * - audioSrc (string) OR output (string) : main audio URL
 * - prepSeconds (number) optional (default 0) — wait this long then autoplay main audio
 * - options: [{ id, text, audioSrc? }]
 * - onSelect?: function(selectedId)          (optional callback when user selects a radio)
 *
 * Behavior:
 * - On mount: runs prep countdown (if prepSeconds > 0)
 * - After prep: attempts to autoplay main audio. If blocked or missing, goes to "finished" state.
 * - While main plays, per-option players are paused.
 * - No manual Play/Stop buttons for main audio (readonly UI).
 * - Options are radio (single select). onSelect callback is called when user picks an option.
 */

export default function AudioToMCQRadioAuto({
  audioSrc,
  output,
  prepSeconds,
  options = [],
  onSelect,
}) {
  const mainSrc = audioSrc || output || "";
  const audioRef = useRef(null);
  const optionPlayersRef = useRef(new Map());

  const [phase, setPhase] = useState(prepSeconds > 0 ? "prep" : "idle"); // prep | playing | finished | error | idle
  const [prepLeft, setPrepLeft] = useState(Math.max(0, prepSeconds));
  const [playing, setPlaying] = useState(false);
  const [playedCount, setPlayedCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);

  // Attach listeners to main audio
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    function onPlay() {
      setPlaying(true);
      setPlayedCount((c) => c + 1);
      setPhase("playing");
      // pause option audios when main plays
      optionPlayersRef.current.forEach((a) => {
        try {
          if (a && !a.paused) {
            a.pause();
            a.currentTime = 0;
          }
        } catch (e) {}
      });
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
      setError("Main audio failed to load or play.");
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

  // reset/cleanup when source or options change
  useEffect(() => {
    setSelectedId(null);
    setPlayedCount(0);
    setProgress(0);
    setPlaying(false);
    setError("");
    setPhase(prepSeconds > 0 ? "prep" : "idle");
    setPrepLeft(Math.max(0, prepSeconds));

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {}
    }

    optionPlayersRef.current.forEach((a) => {
      try {
        if (a && !a.paused) {
          a.pause();
          a.currentTime = 0;
        }
      } catch (e) {}
    });
  }, [mainSrc, JSON.stringify(options), prepSeconds]);

  // prep countdown -> autoplay
  useEffect(() => {
    if (phase !== "prep") return;
    if (prepLeft <= 0) {
      attemptAutoPlay().catch((e) => {
        console.warn("Autoplay blocked/failure:", e);
        setError("Autoplay blocked or failed.");
        setPhase("finished"); // proceed (user can still select)
      });
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepLeft]);

  // attempt to play main audio, fallback to finished if blocked/no-source
  async function attemptAutoPlay() {
    if (!mainSrc || !audioRef.current) {
      setError("No main audio source provided.");
      setPhase("finished");
      return;
    }
    try {
      try {
        audioRef.current.currentTime = 0;
      } catch {}
      const p = audioRef.current.play();
      if (p && p.catch) {
        await p.catch((err) => {
          // autoplay blocked -> fallback
          throw err;
        });
      }
      // If play succeeded, phase will be set by 'play' event listener
    } catch (err) {
      // autoplay failed
      throw err;
    }
  }

  // register/unregister per-option players so we can pause them when main plays
  function registerOptionPlayer(id, el) {
    if (!id) return;
    if (el) optionPlayersRef.current.set(id, el);
    else optionPlayersRef.current.delete(id);
  }

  function handleRadioChange(id) {
    setSelectedId(id);
    try {
      if (typeof onSelect === "function") onSelect(id);
    } catch (e) {
      console.error("onSelect threw:", e);
    }
  }

  // Small per-option player component
  function SmallAudioPlayer({ id, src }) {
    const ref = useRef(null);
    const [localPlaying, setLocalPlaying] = useState(false);

    useEffect(() => {
      if (!registerOptionPlayer) return;
      // register even if ref.current is null (parent handles null appropriately)
      registerOptionPlayer(id, ref.current);
      return () => registerOptionPlayer(id, null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
      const a = ref.current;
      if (!a) return;
      function onPlay() {
        setLocalPlaying(true);
        // pause main audio
        try {
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        } catch (e) {}
      }
      function onPause() {
        setLocalPlaying(false);
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
      if (localPlaying) {
        try {
          ref.current.pause();
          ref.current.currentTime = 0;
        } catch (e) {}
      } else {
        try {
          ref.current.currentTime = 0;
          const p = ref.current.play();
          if (p && p.catch) p.catch(() => {});
        } catch (e) {}
      }
    }

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className="px-2 py-1 border rounded-md text-sm bg-white"
        >
          {localPlaying ? "Stop" : "Play"}
        </button>
        <audio ref={ref} src={src} preload="none" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Playback card: readonly status */}
      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 text-gray-900">
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 rounded-md font-medium shadow-sm bg-white border">
            {phase === "prep"
              ? `Starting in ${prepLeft}s`
              : phase === "playing"
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

      {/* Radio options */}
      <div className="space-y-2">
        <div className="font-medium">Choose one option</div>
        <div className="grid gap-2">
          {options.map((opt) => {
            const checked = selectedId === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:shadow-sm ${
                  checked ? "border-blue-500 bg-blue-50" : "bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="audio-mcq-radio"
                  checked={checked}
                  onChange={() => handleRadioChange(opt.id)}
                  className="mt-1 form-radio"
                />

                <div className="flex-1">
                  <div className="text-sm font-medium">{opt.text}</div>

                  {opt.audioSrc ? (
                    <div className="mt-1">
                      <SmallAudioPlayer id={opt.id} src={opt.audioSrc} />
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
