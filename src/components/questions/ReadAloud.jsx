"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/**
 * ReadAloud (automatic, no playback)
 * - After recording ends, calls onComplete(blob, meta) and onNext(blob, meta)
 *   both deferred to next macrotask and wrapped in try/catch.
 */
export default function ReadAloud({
  promptText,
  prepSeconds = 30,
  recordSeconds = 45,
  onComplete,
  onNext,
}) {
  const [phase, setPhase] = useState("prep"); // "prep" | "recording" | "finished"
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [recLeft, setRecLeft] = useState(recordSeconds);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // PREP countdown: automatically start recording when it reaches 0
  useEffect(() => {
    if (phase !== "prep") return;
    if (prepLeft <= 0) {
      startRecording().catch((e) => setError(e?.message || String(e)));
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepLeft]);

  // RECORDING countdown: automatically stop when time is up
  useEffect(() => {
    if (phase !== "recording") return;
    if (recLeft <= 0) {
      stopRecording();
      return;
    }
    const t = setTimeout(() => setRecLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, recLeft]);

  // unmount cleanup
  useEffect(() => {
    return () => {
      cleanupStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When promptText changes, reset state and discard previous recording activity
  useEffect(() => {
    try {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") mr.stop();
    } catch {}
    chunksRef.current = [];
    setError("");
    setPhase("prep");
    setPrepLeft(prepSeconds);
    setRecLeft(recordSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptText]);

  const prepProgress = Math.round(((prepSeconds - prepLeft) / Math.max(prepSeconds, 1)) * 100);
  const recProgress = Math.round(((recordSeconds - recLeft) / Math.max(recordSeconds, 1)) * 100);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 text-gray-900">
        <p className="leading-relaxed">{promptText}</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* PREP phase (automatic start) */}
      {phase === "prep" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium">Preparation time</div>
            <div>{prepLeft}s</div>
          </div>
          <Progress value={prepProgress} />
          <div className="text-xs text-gray-600">Recording will start automatically when the timer reaches 0.</div>
        </div>
      )}

      {/* RECORDING phase (automatic stop) */}
      {phase === "recording" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium">Recording…</div>
            <div>{recLeft}s</div>
          </div>
          <Progress value={recProgress} />
          <div className="text-xs text-gray-600">Recording in progress — it will stop automatically.</div>
        </div>
      )}

      {/* FINISHED: we don't show playback; callbacks already invoked (deferred) */}
      {phase === "finished" && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">Recording finished and submitted.</div>
        </div>
      )}
    </div>
  );

  // ---- helpers / actions ----

  async function startRecording() {
    setError("");
    try {
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Use an async wrapper but call parent handlers deferred via setTimeout
      mr.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });

          // set finished phase first so UI stabilizes
          setPhase("finished");

          const durationSeconds = recordSeconds - Math.max(recLeft, 0);

          // Defer calling parent handlers to next macrotask to avoid lifecycle conflicts
          setTimeout(() => {
            // onComplete (preserve backward compatibility)
            if (typeof onComplete === "function") {
              try {
                onComplete(blob, { durationSeconds });
              } catch (err) {
                console.error("onComplete threw:", err);
              }
            } else {
              console.info("ReadAloud: onComplete not provided.");
            }

            // onNext - primary navigation/advance callback
            if (typeof onNext === "function") {
              try {
                // invoke and log return (if any)
                const ret = onNext(blob, { durationSeconds });
                // If the parent returns a Promise, log it (helpful for debugging)
                if (ret && typeof ret.then === "function") {
                  ret.then(
                    (r) => console.debug("onNext resolved:", r),
                    (e) => console.error("onNext rejected:", e)
                  );
                } else {
                  console.debug("onNext returned:", ret);
                }
              } catch (err) {
                console.error("onNext threw:", err);
              }
            } else {
              console.info("ReadAloud: onNext not provided.");
            }

            // cleanup stream after callbacks
            cleanupStream();
          }, 0);
        } catch (e) {
          console.error("Error during onstop handling:", e);
          setError(String(e));
          cleanupStream();
        }
      };

      mediaRecorderRef.current = mr;
      setPhase("recording");
      mr.start();
      setRecLeft(recordSeconds);
    } catch (e) {
      console.error("startRecording error:", e);
      setError(e?.message || "Microphone permission denied or unsupported browser.");
      cleanupStream();
      setPhase("finished");
    }
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch (e) {
        console.error("stopRecording error:", e);
        setPhase("finished");
        cleanupStream();
      }
    } else {
      setPhase("finished");
      cleanupStream();
    }
  }

  function cleanupStream() {
    try {
      mediaRecorderRef.current = null;
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
      }
      streamRef.current = null;
    } catch (e) {
      console.error("cleanupStream error:", e);
    }
  }
}
