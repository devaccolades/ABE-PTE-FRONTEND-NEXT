"use client";
import { useState, useRef, useCallback } from "react";

export const useAudioRecorder = (setAnswerKey, maxDuration) => {
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log("Chunk received:", e.data.size); // Debugging
        }
      };

      recorder.onstop = () => {
        // Create the Blob from chunks gathered so far
        console.log("entered to the onStop");
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          console.log("Blob created successfully:", audioBlob.size);
          setAnswerKey("answer_audio", audioBlob);
        } else {
          console.error("No audio chunks found at stop.");
        }

        // Cleanup tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      // CRITICAL CHANGE: Pass 1000ms to collect data every second
      // This makes short recordings much more reliable
      recorder.start(1000);

      return true;
    } catch (err) {
      console.error("Mic access error:", err);
      setError("Microphone access denied or not found.");
      return false;
    }
  }, [setAnswerKey]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      console.log("calling the stopp");
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cleanupStream = useCallback(() => {
    stopRecording();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [stopRecording]);

  return { startRecording, stopRecording, cleanupStream, error };
};
