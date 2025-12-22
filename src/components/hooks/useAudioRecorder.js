"use client";
import { useState, useRef, useCallback } from "react";

export const useAudioRecorder = (setAnswerKey, maxDuration) => {
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null); // Keep a reference to the stream
  const chunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      // 1. Get the stream and store it in a Ref
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = []; 

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // 2. Create the raw binary Blob
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

        // 3. Update the store ONLY with the Blob
        // This targets the "answer_audio" key directly in your answer object
        setAnswerKey("answer_audio", audioBlob);

        // 4. Clean up tracks immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      return true;
    } catch (err) {
      console.error("Mic access error:", err);
      setError("Microphone access denied or not found.");
      return false;
    }
  }, [setAnswerKey]);

  const stopRecording = useCallback(() => {
    // Only stop if we are actually recording to prevent duplicate 'onstop' triggers
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
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