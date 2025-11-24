"use client";
import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { useExamStore } from "@/store";

/**
 * RetellLecture (automatic flow) with optional record-preparation stage.
 *
 * Props:
 * - audioUrl, videoUrl (string) : source for media (video takes precedence)
 * - prepSeconds (number) : seconds to prepare before media starts
 * - recordPrepSeconds (number) : seconds to prepare after media ends and before recording (optional)
 * - recordSeconds (number) : seconds to record
 * - questionId (any)
 * - onNext(blob, meta) : called after recording finishes (deferred)
 *
 * Flow:
 *  prep -> playing -> (recordPrep ->) recording -> finished
 *
 * Note: browsers may block autoplay. If playback is blocked, component falls back to:
 *  - recordPrep (if recordPrepSeconds > 0) OR
 *  - recording immediately (if recordPrepSeconds === 0)
 */
export default function RetellLecture({
  audioUrl,
  videoUrl,
  prepSeconds = 10,
  audioSum,
  recordPrepSeconds,
  recordSeconds = 40,
  questionId,
  onNext,
}) {
  const userName = useExamStore((s) => s.userName);
  const addAnswer = useExamStore((s) => s.addAnswer);

  const isVideo = Boolean(videoUrl && videoUrl.trim().length > 0);
  const mediaSrc = isVideo ? videoUrl : audioUrl;

  const mediaRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // phases: prep | playing | recordPrep | recording | finished | error
  const [phase, setPhase] = useState("prep");
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [recordPrepLeft, setRecordPrepLeft] = useState(recordPrepSeconds);
  const [recLeft, setRecLeft] = useState(recordSeconds);

  const [mediaProgress, setMediaProgress] = useState(0);
  const [mediaTime, setMediaTime] = useState({ current: 0, total: 0 });
  const [error, setError] = useState("");
  const [recordedUrl, setRecordedUrl] = useState("");

  // Reset when key inputs change (start fresh)
  useEffect(() => {
    setPhase("prep");
    setPrepLeft(prepSeconds);
    setRecordPrepLeft(recordPrepSeconds);
    setRecLeft(recordSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, videoUrl, questionId]);

  // --- Prep countdown (start on mount) ---
  useEffect(() => {
    if (phase !== "prep") return;
    if (prepLeft <= 0) {
      playMediaOrEnterRecordPrep();
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepLeft]);

  // --- Media event listeners ---
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    function onTimeUpdate() {
      try {
        const current = media.currentTime || 0;
        const total = media.duration || 1;
        setMediaTime({ current, total });
        setMediaProgress((current / Math.max(total, 1)) * 100);
      } catch (e) {
        // ignore
      }
    }

    function onEnded() {
      setMediaProgress(100);
      // after media ends, either go to recordPrep (if set) or startRecording
      if (recordPrepSeconds > 0) {
        setRecordPrepLeft(recordPrepSeconds);
        setPhase("recordPrep");
      } else {
        startRecording().catch((err) => {
          console.error("startRecording after media ended failed:", err);
          setError(String(err));
          setPhase("error");
        });
      }
    }

    media.addEventListener("timeupdate", onTimeUpdate);
    media.addEventListener("ended", onEnded);

    return () => {
      media.removeEventListener("timeupdate", onTimeUpdate);
      media.removeEventListener("ended", onEnded);
    };
    // we intentionally only bind/unbind for the current media element instance
  }, [mediaRef.current, recordPrepSeconds]);

  // --- Record-prep countdown (after media finishes) ---
  useEffect(() => {
    if (phase !== "recordPrep") return;
    if (recordPrepLeft <= 0) {
      startRecording().catch((err) => {
        console.error("startRecording after recordPrep failed:", err);
        setError(String(err));
        setPhase("error");
      });
      return;
    }
    const t = setTimeout(() => setRecordPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, recordPrepLeft]);

  // --- Recording countdown ---
  useEffect(() => {
    if (phase !== "recording") return;
    if (recLeft <= 0) {
      stopRecording();
      return;
    }
    const t = setTimeout(() => setRecLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, recLeft]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      cleanupStream();
      if (recordedUrl) {
        try {
          URL.revokeObjectURL(recordedUrl);
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedUrl]);

  // ---------- actions ----------

  async function playMediaOrEnterRecordPrep() {
    if (!mediaSrc) {
      // no media source -> go to recordPrep or recording
      if (recordPrepSeconds > 0) {
        setRecordPrepLeft(recordPrepSeconds);
        setPhase("recordPrep");
      } else {
        return startRecording();
      }
      return;
    }

    const media = mediaRef.current;
    if (!media) {
      // no media element -> follow same fallback
      if (recordPrepSeconds > 0) {
        setRecordPrepLeft(recordPrepSeconds);
        setPhase("recordPrep");
      } else {
        return startRecording();
      }
      return;
    }

    try {
      setPhase("playing");
      // try to start from beginning
      try {
        media.currentTime = 0;
      } catch {}
      const playPromise = media.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch((err) => {
          // autoplay blocked -> fallback to recordPrep or recording
          console.warn("Media playback blocked; falling back. err:", err);
          if (recordPrepSeconds > 0) {
            setRecordPrepLeft(recordPrepSeconds);
            setPhase("recordPrep");
          } else {
            startRecording().catch((e) => {
              console.error("startRecording fallback failed:", e);
              setError(String(e));
              setPhase("error");
            });
          }
        });
      }
    } catch (e) {
      // fallback
      console.warn("playMediaOrEnterRecordPrep error:", e);
      if (recordPrepSeconds > 0) {
        setRecordPrepLeft(recordPrepSeconds);
        setPhase("recordPrep");
      } else {
        startRecording().catch((err) => {
          console.error("startRecording fallback error:", err);
          setError(String(err));
          setPhase("error");
        });
      }
    }
  }

  async function startRecording() {
    setError("");
    try {
      // ensure media paused
      try {
        const media = mediaRef.current;
        if (media && !media.paused) {
          try {
            media.pause();
          } catch {}
        }
      } catch {}

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, {
            type: mr.mimeType || "audio/webm",
          });
          const url = URL.createObjectURL(blob);
          setRecordedUrl(url);
          setPhase("finished");

          const meta = {
            durationSeconds: recordSeconds - Math.max(recLeft, 0),
            timestamp: Date.now(),
            recordPrepSecondsUsed: recordPrepSeconds,
          };

          // store answer synchronously
          try {
            addAnswer({
              type: "retell-lecture",
              questionId,
              user: userName,
              audio: url,
              timestamp: meta.timestamp,
              meta,
            });
          } catch (e) {
            console.error("addAnswer threw:", e);
          }

          // call onNext deferred (preserve previous behavior)
          setTimeout(() => {
            try {
              if (typeof onNext === "function") {
                const ret = onNext(blob, meta);
                if (ret && typeof ret.then === "function") {
                  ret.then(
                    () => {},
                    (err) => console.error("onNext rejected:", err)
                  );
                }
              }
            } catch (e) {
              console.error("onNext threw:", e);
            } finally {
              cleanupStream();
            }
          }, 0);
        } catch (e) {
          console.error("Error during onstop handling:", e);
          setError(String(e));
          cleanupStream();
          setPhase("error");
        }
      };

      setPhase("recording");
      setRecLeft(recordSeconds);
      mr.start();
    } catch (e) {
      console.error("startRecording failed:", e);
      setError("Microphone access failed or unsupported browser.");
      cleanupStream();
      setPhase("error");

      setTimeout(() => {
        try {
          if (typeof onNext === "function") onNext(null, { error: String(e) });
        } catch (err) {
          console.error("onNext (error fallback) threw:", err);
        }
      }, 0);
    }
  }

  function stopRecording() {
    try {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") mr.stop();
      else {
        setPhase("finished");
        cleanupStream();
      }
    } catch (e) {
      console.error("stopRecording error:", e);
      setPhase("error");
      cleanupStream();
    }
  }

  function cleanupStream() {
    try {
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
    } catch (e) {
      console.error("cleanupStream error:", e);
    } finally {
      streamRef.current = null;
      mediaRecorderRef.current = null;
      chunksRef.current = [];
    }
  }

  // ---------- UI (minimal) ----------
  const prepProgress = Math.round(
    ((prepSeconds - prepLeft) / Math.max(prepSeconds, 1)) * 100
  );
  const recordPrepProgress = Math.round(
    ((recordPrepSeconds - recordPrepLeft) /
      Math.max(recordPrepSeconds || 1, 1)) *
      100
  );
  const recProgress = Math.round(
    ((recordSeconds - recLeft) / Math.max(recordSeconds, 1)) * 100
  );

  return (
    <div className="space-y-6">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {audioSum && <h2>{audioSum}</h2>}
      {phase === "prep" && (
        <div className="space-y-2">
          <div className="font-medium text-gray-800">
            Preparing… ({prepLeft}s)
          </div>
          <Progress value={prepProgress} />
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-2">
          <div className="font-medium text-gray-800">Playing media…</div>
          <div className="text-xs text-gray-600">
            {Math.floor(mediaTime.current) > 0 ||
            Math.floor(mediaTime.total) > 0
              ? `${formatTime(mediaTime.current)} / ${formatTime(
                  mediaTime.total
                )}`
              : ""}
          </div>
          <Progress value={Math.round(mediaProgress)} />
        </div>
      )}

      {phase === "recordPrep" && (
        <div className="space-y-2">
          <div className="font-medium text-gray-800">
            Prepare to speak… ({recordPrepLeft}s)
          </div>
          <Progress value={recordPrepProgress} />
        </div>
      )}

      {phase === "recording" && (
        <div className="space-y-2">
          <div className="font-medium text-gray-800">
            Recording… ({recLeft}s)
          </div>
          <Progress value={recProgress} />
        </div>
      )}

      {phase === "finished" && (
        <div className="space-y-2">
          <div className="font-medium text-gray-800">
            Recording finished. Submitting…
          </div>
        </div>
      )}

      {/* Hidden media element (no controls) */}
      {isVideo ? (
        <video
          ref={mediaRef}
          src={videoUrl || ""}
          style={{ display: "none" }}
        />
      ) : (
        <audio
          ref={mediaRef}
          src={audioUrl || ""}
          style={{ display: "none" }}
        />
      )}
    </div>
  );
}

// small helper to format times
function formatTime(s = 0) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
