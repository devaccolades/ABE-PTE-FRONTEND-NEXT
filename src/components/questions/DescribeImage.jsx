"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useExamStore } from "@/store";
import Image from "next/image";

export default function DescribeImage({
  imageUrl,
  prepSeconds = 30,
  recordSeconds = 40,
  questionId,
  onNext,
}) {
  const userName = useExamStore((s) => s.userName);
  const addAnswer = useExamStore((s) => s.addAnswer);

  const [phase, setPhase] = useState("prep");
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [recLeft, setRecLeft] = useState(recordSeconds);
  const [error, setError] = useState("");
  const [recordedUrl, setRecordedUrl] = useState("");

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // ---------------- PREPARATION TIMER ----------------
  useEffect(() => {
    if (phase !== "prep") return;
    if (prepLeft <= 0) {
      startRecording().catch((e) => {
        setError(String(e));
        setPhase("error");
      });
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepLeft]);

  // ---------------- RECORDING TIMER ----------------
  useEffect(() => {
    if (phase !== "recording") return;
    if (recLeft <= 0) {
      stopRecording();
      return;
    }
    const t = setTimeout(() => setRecLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, recLeft]);

  // Cleanup mic stream on unmount
  useEffect(() => {
    return () => cleanupStream();
  }, []);

  // ---------------- MICROPHONE LOGIC ----------------
  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);

        // DO NOT call onNext here — only save result
        addAnswer({
          type: "describe-image",
          questionId,
          user: userName,
          audio: url,
          timestamp: Date.now(),
        });

        setPhase("finished");
        cleanupStream();
      };

      setPhase("recording");
      setRecLeft(recordSeconds);
      mr.start();
    } catch (e) {
      setError("Microphone access failed.");
      setPhase("error");
    }
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    } else {
      setPhase("finished");
      cleanupStream();
    }
  }

  function cleanupStream() {
    try {
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }

  // ---------------- PROGRESS HELPERS ----------------
  const prepProgress = Math.round(
    ((prepSeconds - prepLeft) / prepSeconds) * 100
  );
  const recProgress = Math.round(
    ((recordSeconds - recLeft) / recordSeconds) * 100
  );

  // ---------------- UI ----------------
  return (
    <div className="space-y-4">
      {/* IMAGE */}
      <div className="border rounded overflow-hidden shadow-sm flex justify-center bg-white">
        <Image
          src={imageUrl}
          alt="Describe visual"
          width={600}
          height={400}
          className="max-h-96 w-auto object-contain"
        />
      </div>

      {/* PREPARATION */}
      {phase === "prep" && (
        <div className="space-y-2">
          <div className="font-medium text-gray-800">
            Preparing… ({prepLeft}s)
          </div>
          <Progress value={prepProgress} />
        </div>
      )}

      {/* RECORDING */}
      {phase === "recording" && (
        <div className="space-y-2">
          <div className="font-medium text-gray-800">
            Recording… ({recLeft}s)
          </div>
          <Progress value={recProgress} />
        </div>
      )}

      {/* FINISHED */}
      {phase === "finished" && (
        <div className="text-gray-800 font-medium">Recording finished.</div>
      )}

      {/* ERROR */}
      {phase === "error" && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {/* NEXT BUTTON (manual only!) */}
      {/* <div className="pt-3 border-t flex justify-end">
        <Button onClick={() => onNext?.()} className="bg-sky-600 text-white">
          Next
        </Button>
      </div> */}
    </div>
  );
}
