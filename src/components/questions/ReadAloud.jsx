// src/components/ReadAloud.jsx

// ... existing imports

import { useExamStore } from "@/store";
import RecordingTimerDisplay from "../hooks/RecordingTimerDisplay";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { PHASES, useRecordingTimer } from "../hooks/useRecordingTimer";
import { useEffect } from "react";

export default function ReadAloud({
  promptText,
  prepSeconds = 30,
  recordSeconds = 45,
  // Removed onComplete/onNext props as the Parent handles flow now
}) {
    const globalPhase = useExamStore((s) => s.setPhase);
    const setAnswerKey = useExamStore((s) => s.setAnswerKey);
    const isStopSignalSent = useExamStore((s) => s.isStopSignalSent);
    const setStopSignal = useExamStore((s) => s.setStopSignal);

    // 1. Audio Recorder Logic
    const { 
        startRecording: startAudio, 
        stopRecording: stopAudio, 
        cleanupStream: cleanupAudio, 
        error: recorderError 
    } = useAudioRecorder(setAnswerKey, recordSeconds);

    // 2. Timer Logic
    const { 
        phase, 
        setPhase, 
        prepLeft, 
        recLeft, 
        prepProgress, 
        recProgress 
    } = useRecordingTimer(
        prepSeconds, 
        recordSeconds, 
        () => startAudio().then(success => {
            if (!success) setPhase(PHASES.FINISHED); // If mic fails, stop timer flow
        }),
        () => {
            stopAudio();
            setPhase(PHASES.FINISHED); // Ensure phase ends even if stopAudio fails
        }, 
        promptText
    );

    // Combined Error State
    const currentError = recorderError;

    // 3. External Stop Signal Effect
    useEffect(() => {
        if (isStopSignalSent && phase === PHASES.RECORDING) {
            stopAudio(); 
            setPhase(PHASES.FINISHED); // Immediately update phase upon external stop
            setStopSignal(false); 
        }
    }, [isStopSignalSent, phase, setStopSignal, stopAudio, setPhase]);

    // 4. Component Mount/Unmount Cleanup (Simplified)
    useEffect(() => {
        return () => {
            cleanupAudio();
        };
    }, []);

    // 5. Global Phase Update
    useEffect(() => {
        globalPhase(phase);
    }, [phase, globalPhase]);

    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 text-gray-900">
                <p className="leading-relaxed">{promptText}</p>
            </div>

            <RecordingTimerDisplay
                phase={phase}
                prepLeft={prepLeft}
                recLeft={recLeft}
                prepProgress={prepProgress}
                recProgress={recProgress}
                error={currentError}
            />
        </div>
    );
}