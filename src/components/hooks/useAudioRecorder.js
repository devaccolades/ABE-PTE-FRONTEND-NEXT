// src/hooks/useAudioRecorder.js (Optimized with useCallback)

import { useRef, useState, useCallback } from 'react'; // <-- Import useCallback
import { useExamStore } from "@/store";

/**
 * Manages microphone access, recording state, and audio cleanup.
 * @param {function} setAnswerKey - Function to save the result to the store.
 * @param {number} recordSeconds - Max recording duration (used for context, not flow control).
 */
export function useAudioRecorder(setAnswerKey, recordSeconds) {
    const [error, setError] = useState("");

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);

    // --- Core Recording Functions (Wrapped in useCallback) ---

    const cleanupStream = useCallback(() => {
        try {
            // Stop tracks on the media stream
            const s = streamRef.current;
            if (s) {
                s.getTracks().forEach((t) => t.stop());
            }
        } catch (e) {
            console.error("cleanupStream error:", e);
        } finally {
             // Reset refs regardless of success/failure
            mediaRecorderRef.current = null;
            streamRef.current = null;
        }
    }, []); // Dependencies: None, as it only uses refs

    const stopRecording = useCallback(() => {
        const mr = mediaRecorderRef.current;
        if (mr && mr.state !== "inactive") {
            try {
                // Calling stop() triggers mr.onstop, which handles cleanup and saving the blob.
                mr.stop(); 
                return true;
            } catch (e) {
                console.error("stopRecording error:", e);
                // If stop fails unexpectedly, force cleanup
                cleanupStream();
                return false;
            }
        }
        // If it's already inactive, just clean up to be safe (though onstop should have done it)
        cleanupStream(); 
        return true;
    }, [cleanupStream]); // Dependencies: cleanupStream (which is stable)

    const startRecording = useCallback(async () => {
        setError("");
        try {
            chunksRef.current = [];
            
            // 1. Get microphone stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            // 2. Initialize MediaRecorder
            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr;
            
            mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };

            // 3. Define behavior when recording stops (triggered by stopRecording or max time)
            mr.onstop = () => {
                try {
                    const blob = new Blob(chunksRef.current, {
                        type: mr.mimeType || "audio/webm",
                    });
                    
                    // SAVE THE FINAL BLOB to the store
                    // We assume the type used in the store is consistent (e.g., "describe-image-audio")
                    setAnswerKey("answer_audio", blob); 
                } catch (e) {
                    console.error("Error during onstop handling:", e);
                    setError(String(e));
                } finally {
                    // Always clean up the stream when recording finishes
                    cleanupStream();
                }
            };

            // 4. Start recording
            mr.start();
            return true; // Success
        } catch (e) {
            console.error("startRecording error:", e);
            setError(e?.message || "Microphone permission denied or unsupported browser.");
            cleanupStream();
            return false; // Failure
        }
    }, [setAnswerKey, cleanupStream]); // Dependencies: stable functions/props used inside

    return {
        startRecording,
        stopRecording,
        cleanupStream,
        error,
    };
}