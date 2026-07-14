"use client";
import { useState, useRef, useCallback } from "react";
import { useExamStore } from "@/store";

// Primary responsibility: Provides microphone recording helpers and stores the resulting audio Blob in global answer state.
// Architecture role: Shared hook used by speaking question components to capture audio reliably across short recordings.

/**
 * @description React hook that manages a `MediaRecorder` lifecycle for microphone audio capture.
 * Stores the final audio as a `Blob` under the `answer_audio` key using the provided setter.
 *
 * Why `recorder.start(1000)` exists:
 * - Some browsers may not flush data reliably for very short recordings unless a timeslice is provided.
 * - Collecting chunks every ~1s increases reliability when users stop quickly.
 *
 * @param {(key: string, value: any) => void} setAnswerKey - Store setter used to persist the recorded audio Blob.
 * @param {number} maxDuration - Maximum allowed recording duration in seconds (reserved for future enforcement).
 * @returns {{
 *   startRecording: () => Promise<boolean>,
 *   stopRecording: () => void,
 *   cleanupStream: () => void,
 *   error: string|null
 * }} Recording controls and any microphone error message.
 */
export const useAudioRecorder = (setAnswerKey, maxDuration) => {
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const capturePromiseRef = useRef(null);
  const resolveCaptureRef = useRef(null);
  const setAudioCapturePromise = useExamStore(
    (state) => state.setAudioCapturePromise,
  );

  /**
   * @description Requests microphone access and starts collecting audio chunks.
   * @returns {Promise<boolean>} True when recording starts successfully; false when mic access fails.
   */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      capturePromiseRef.current = new Promise((resolve) => {
        resolveCaptureRef.current = resolve;
      });
      setAudioCapturePromise(capturePromiseRef.current);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        let audioBlob = null;
        if (chunksRef.current.length > 0) {
          audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          setAnswerKey("answer_audio", audioBlob);
        } else {
          console.error("No audio chunks found at stop.");
          setError("The recording was empty. Please record the answer again.");
        }
        resolveCaptureRef.current?.(audioBlob);
        resolveCaptureRef.current = null;
        // Cleanup tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };
      // ---> BEEP LOGIC ADDED HERE <---
      try {
        const beep = new Audio("/beep.mp3"); // Change to match your file name in the public folder
        beep.play();
      } catch (err) {
        console.error("Failed to play beep:", err);
      }
      // -------------------------------
      // CRITICAL CHANGE: Pass 1000ms to collect data every second
      // This makes short recordings much more reliable
      recorder.start(1000);
      return true;
    } catch (err) {
      console.error("Mic access error:", err);
      setError("Microphone access denied or not found.");
      const failedCapture = Promise.resolve(null);
      capturePromiseRef.current = failedCapture;
      setAudioCapturePromise(failedCapture);
      return false;
    }
  }, [setAnswerKey, setAudioCapturePromise]);

  /**
   * @description Stops the active recording session (if one is running). Triggers `MediaRecorder.onstop`.
   * @returns {void}
   */
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    return capturePromiseRef.current || Promise.resolve(null);
  }, []);

  /**
   * @description Stops recording and releases any open microphone tracks.
   * Use this on unmount to avoid leaving the microphone active.
   *
   * @returns {void}
   */
  const cleanupStream = useCallback(() => {
    stopRecording();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [stopRecording]);

  return { startRecording, stopRecording, cleanupStream, error };
};
