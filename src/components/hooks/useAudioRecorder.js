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
 */
export const useAudioRecorder = (setAnswerKey, maxDuration) => {
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const capturePromiseRef = useRef(null);
  const resolveCaptureRef = useRef(null);
  const isStoppingRef = useRef(false);
  const stopRequestedRef = useRef(false);

  const setAudioCapturePromise = useExamStore(
    (state) => state.setAudioCapturePromise,
  );

  /**
   * Requests microphone access and starts collecting audio chunks.
   */
  const startRecording = useCallback(async () => {
    isStoppingRef.current = false;
    stopRequestedRef.current = false;
    setError(null);

    // Publish the promise before requesting permission so submission always has
    // one authoritative capture to await, even while the browser prompt is open.
    resolveCaptureRef.current?.(null);
    capturePromiseRef.current = new Promise((resolve) => {
      resolveCaptureRef.current = resolve;
    });
    setAudioCapturePromise(capturePromiseRef.current);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      if (isStoppingRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        resolveCaptureRef.current?.(null);
        resolveCaptureRef.current = null;
        return false;
      }

      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        let audioBlob = null;

        if (chunksRef.current.length > 0) {
          audioBlob = new Blob(chunksRef.current, {
            type: "audio/webm",
          });

          setAnswerKey("answer_audio", audioBlob);
        } else {
          console.error("No audio chunks found at stop.");
          setError("The recording was empty. Please record the answer again.");
        }

        resolveCaptureRef.current?.(audioBlob);
        resolveCaptureRef.current = null;
        stopRequestedRef.current = false;

        if (mediaRecorderRef.current === recorder) {
          mediaRecorderRef.current = null;
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      // ------------------ BEEP LOGIC ------------------
      try {
        const beep = new Audio("/beep.mp3");

        // Wait until the beep finishes playing
        await new Promise((resolve, reject) => {
          beep.onended = resolve;
          beep.onerror = reject;

          beep.play().catch(reject);
        });

        if (isStoppingRef.current) {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          return false;
        }
      } catch (err) {
        console.error("Failed to play beep:", err);
      }

      if (isStoppingRef.current) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        return false;
      }

      // Start recording after beep + 2 second delay
      recorder.start(1000);

      return true;
    } catch (err) {
      console.error("Mic access error:", err);

      setError("Microphone access denied or not found.");
      resolveCaptureRef.current?.(null);
      resolveCaptureRef.current = null;
      stopRequestedRef.current = false;
      mediaRecorderRef.current = null;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      return false;
    }
  }, [setAnswerKey, setAudioCapturePromise]);

  /**
   * Stops the active recording session.
   */
  const stopRecording = useCallback(() => {
    isStoppingRef.current = true;
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      if (!stopRequestedRef.current) {
        stopRequestedRef.current = true;
        try {
          recorder.stop();
        } catch (error) {
          console.error("Could not stop audio recording:", error);
          stopRequestedRef.current = false;
          setError("The recording could not be finalized. Please try again.");
          resolveCaptureRef.current?.(null);
          resolveCaptureRef.current = null;
          mediaRecorderRef.current = null;

          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        }
      }
    } else if (recorder && stopRequestedRef.current) {
      // MediaRecorder becomes inactive before its queued dataavailable/onstop
      // events run. A repeated stop must keep waiting for that same result.
    } else {
      // The recorder never started (for example, permission was denied or the
      // question was stopped during its beep/preparation phase).
      if (resolveCaptureRef.current) {
        resolveCaptureRef.current(null);
        resolveCaptureRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }

    return capturePromiseRef.current || Promise.resolve(null);
  }, []);

  /**
   * Stops recording and releases microphone tracks.
   */
  const cleanupStream = useCallback(() => {
    stopRecording();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [stopRecording]);

  return {
    startRecording,
    stopRecording,
    cleanupStream,
    error,
  };
};
