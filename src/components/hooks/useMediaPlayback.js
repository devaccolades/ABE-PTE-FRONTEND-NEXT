// src/hooks/useMediaPlayback.js

import { useState, useEffect, useRef } from 'react';

// ... (Use the PHASES constants from useSequentialTimer) ...

/**
 * Hook to manage media element state and time tracking.
 * @param {string} mediaSrc - The URL of the media.
 * @param {function} onEndedOrBlocked - Callback when media ends or is blocked/errors.
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

    const pauseMedia = () => {
        const media = mediaRef.current;
        if (media && !media.paused) {
            try { media.pause(); } catch {}
        }
    };
    
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