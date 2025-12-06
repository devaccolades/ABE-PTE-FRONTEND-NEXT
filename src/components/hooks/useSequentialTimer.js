// src/hooks/useSequentialTimer.js

import { useState, useEffect } from "react";

// Use universal phase constants
export const PHASES = {
    PREP: "prep",
    ACTIVE_MIDDLE: "activeMiddle", // Used for Playing OR Record Prep
    RECORDING: "recording",
    FINISHED: "finished",
    ERROR: "error",
};

/**
 * Manages a flexible two- or three-stage sequential flow.
 *
 * @param {number} prepSeconds - Duration of the first (prep) phase.
 * @param {number} middleSeconds - Duration of the middle (media/recordPrep) phase. Set to 0 for a two-phase flow.
 * @param {number} recordSeconds - Duration of the final (recording) phase.
 * @param {any} resetKey - Dependency to trigger a full reset (e.g., questionId).
 * @param {function} onPrepEnd - Callback when PREP ends (triggers ACTIVE_MIDDLE/RECORDING start).
 * @param {function} onMiddleEnd - Callback when ACTIVE_MIDDLE ends (triggers RECORDING start).
 * @param {function} onRecordEnd - Callback when RECORDING ends (triggers recording stop).
 */
export function useSequentialTimer(
    prepSeconds,
    middleSeconds,
    recordSeconds,
    resetKey,
    onPrepEnd,
    onMiddleEnd,
    onRecordEnd
) {
    const [phase, setPhase] = useState(PHASES.PREP);
    const [prepLeft, setPrepLeft] = useState(prepSeconds);
    const [middleLeft, setMiddleLeft] = useState(middleSeconds);
    const [recLeft, setRecLeft] = useState(recordSeconds);

    const isMiddlePhaseActive = middleSeconds > 0;

    // --- State Reset ---
    useEffect(() => {
        setPhase(PHASES.PREP);
        setPrepLeft(prepSeconds);
        setMiddleLeft(middleSeconds);
        setRecLeft(recordSeconds);
    }, [resetKey, prepSeconds, middleSeconds, recordSeconds]);

    // --- 1. Prep Countdown (PREP -> ACTIVE_MIDDLE or RECORDING) ---
    useEffect(() => {
        if (phase !== PHASES.PREP) return;
        if (prepLeft <= 0) {
            onPrepEnd(isMiddlePhaseActive);
            // Phase transition handled by onPrepEnd callback
            return;
        }
        const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, prepLeft, onPrepEnd, isMiddlePhaseActive]);

    // --- 2. Middle Countdown (ACTIVE_MIDDLE -> RECORDING) ---
    useEffect(() => {
        if (!isMiddlePhaseActive || phase !== PHASES.ACTIVE_MIDDLE) return;
        if (middleLeft <= 0) {
            setPhase(PHASES.RECORDING);
            onMiddleEnd(); // Start recording
            return;
        }
        const t = setTimeout(() => setMiddleLeft((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, middleLeft, onMiddleEnd, isMiddlePhaseActive]);

    // --- 3. Recording Countdown (RECORDING -> FINISHED) ---
    useEffect(() => {
        if (phase !== PHASES.RECORDING) return;
        if (recLeft <= 0) {
            onRecordEnd(); // Stop recording
            setPhase(PHASES.FINISHED);
            return;
        }
        const t = setTimeout(() => setRecLeft((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, recLeft, onRecordEnd]);

    // --- Progress Calculations ---
    const prepProgress = (prepSeconds > 0) ? ((prepSeconds - prepLeft) / prepSeconds) * 100 : 100;
    const middleProgress = (middleSeconds > 0) ? ((middleSeconds - middleLeft) / middleSeconds) * 100 : 100;
    const recProgress = (recordSeconds > 0) ? ((recordSeconds - recLeft) / recordSeconds) * 100 : 100;

    return {
        phase,
        setPhase, // Exposed for I/O hooks to transition state (e.g., to ACTIVE_MIDDLE or ERROR)
        prepLeft,
        middleLeft,
        recLeft,
        prepProgress,
        middleProgress,
        recProgress,
        isMiddlePhaseActive,
    };
}