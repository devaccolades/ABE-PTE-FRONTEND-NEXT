"use client";
import { useState, useRef, useCallback } from "react";

export const useAudioRecorder = (setAnswerKey, maxDuration) => {
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorderRef.current = recorder;
      chunksRef.current = []; // Clear previous data

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // 1. Create the binary Blob from chunks
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

        // 2. SAVE THE ACTUAL BLOB to the store
        // DO NOT save as { size: audioBlob.size }, save the audioBlob itself!
        setAnswerKey("answer_audio", audioBlob);

        // 3. Cleanup: Stop all tracks to turn off the microphone light
        stream.getTracks().forEach((track) => track.stop());
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cleanupStream = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  return { startRecording, stopRecording, cleanupStream, error };
};