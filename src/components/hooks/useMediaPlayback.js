// src/hooks/useMediaPlayback.js

import { useState, useEffect, useRef } from 'react';

// ... (Use the PHASES constants from useSequentialTimer) ...

/**
 * @description Hook that manages a media element ref (audio/video), playback progress, and failure handling.
 *
 * Why this exists:
 * - Some tasks rely on playing prompt audio/video before moving to a recording phase.
 * - Browsers may block autoplay; this hook centralizes the fallback behavior via `onEndedOrBlocked`.
 *
 * @param {string} mediaSrc - URL for the media (audio/video) to play.
 * @param {(blockedOrFailed: boolean) => void} onEndedOrBlocked - Callback when media ends (false) or playback is blocked/errors (true).
 * @param {(phase: any) => void} setPhase - Phase setter used by the parent timer/state machine (exact type depends on caller).
 * @returns {{
 *   mediaRef: import("react").RefObject<HTMLMediaElement|null>,
 *   mediaProgress: number,
 *   mediaTime: { current: number, total: number },
 *   startMediaPlayback: (onSuccessPhase: any) => Promise<void>,
 *   pauseMedia: () => void,
 *   formatTime: (s?: number) => string
 * }} Media ref, progress state, and playback helpers.
 */
export function useMediaPlayback(mediaSrc, onEndedOrBlocked, setPhase) {
    const mediaRef = useRef(null);
    const [mediaProgress, setMediaProgress] = useState(0);
    const [mediaTime, setMediaTime] = useState({ current: 0, total: 0 });

    // --- Media Event Listeners ---
    useEffect(() => {
        const media = mediaRef.current;
        if (!media) return;

        function onTimeUpdate() {
            const current = media.currentTime || 0;
            const total = media.duration || 1;
            setMediaTime({ current, total });
            setMediaProgress((current / Math.max(total, 1)) * 100);
        }

        function onEnded() {
            setMediaProgress(100);
            onEndedOrBlocked(false); // Success
        }
        
        function onError(e) {
            console.error("Media element error:", e);
            onEndedOrBlocked(true); // Failure
        }

        media.addEventListener("timeupdate", onTimeUpdate);
        media.addEventListener("ended", onEnded);
        media.addEventListener("error", onError);

        return () => {
            media.removeEventListener("timeupdate", onTimeUpdate);
            media.removeEventListener("ended", onEnded);
            media.removeEventListener("error", onError);
        };
    }, [mediaRef.current, onEndedOrBlocked]);
    
    // --- Actions ---

    /**
     * @description Attempts to start playback from the beginning. On success, moves the caller into `onSuccessPhase`.
     * If autoplay is blocked or media is missing, invokes the fallback callback with `true`.
     *
     * @param {any} onSuccessPhase - Phase to set when playback begins successfully (type depends on caller).
     * @returns {Promise<void>}
     */
    const startMediaPlayback = async (onSuccessPhase) => {
        const media = mediaRef.current;
        
        if (!mediaSrc || !media) {
            onEndedOrBlocked(true); // Treat missing media as failure/fallback
            return;
        }

        try {
            setPhase(onSuccessPhase);
            media.currentTime = 0;
            
            const playPromise = media.play();
            if (playPromise && playPromise.catch) {
                playPromise.catch(() => {
                    // Autoplay blocked -> fallback
                    console.warn("Media playback blocked; falling back.");
                    onEndedOrBlocked(true); 
                });
            }
        } catch (e) {
            console.warn("startMediaPlayback error:", e);
            onEndedOrBlocked(true);
        }
    };

    /**
     * @description Pauses playback if the media element is currently playing.
     * @returns {void}
     */
    const pauseMedia = () => {
        const media = mediaRef.current;
        if (media && !media.paused) {
            try { media.pause(); } catch {}
        }
    };
    
    /**
     * @description Formats a time (seconds) as mm:ss for UI display.
     * @param {number} [s=0] - Seconds to format.
     * @returns {string} Time string in mm:ss.
     */
    const formatTime = (s = 0) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    return {
        mediaRef,
        mediaProgress,
        mediaTime,
        startMediaPlayback,
        pauseMedia,
        formatTime,
    };
}