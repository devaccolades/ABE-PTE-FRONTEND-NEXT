// src/components/RecordingStatusDisplay.jsx

import { Progress } from "@/components/ui/progress";
import { PHASES } from "../hooks/useSequentialTimer"; // Import PHASES

const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export default function RecordingStatusDisplay({ 
    phase, 
    prepLeft, 
    recLeft, 
    prepProgress, 
    recProgress, 
    error 
}) {
    // This component renders the UI based on the phase passed from the hook.

    if (error) {
        return <div className="text-red-600 text-sm">❌ {error}</div>;
    }

    if (phase === PHASES.PREP) {
        return (
            <div className="space-y-2">
                <div className="font-medium text-gray-800">
                    **Preparing…** ({prepLeft}s)
                </div>
                <Progress value={prepProgress} />
                <div className="text-xs text-gray-600">
                    Get ready to speak.
                </div>
            </div>
        );
    }
    
    if (phase === PHASES.RECORDING) {
        return (
            <div className="space-y-2">
                <div className="font-medium text-gray-800">
                    🔴 **Recording…** ({recLeft}s)
                </div>
                <Progress value={recProgress} />
                <div className="text-xs text-gray-600">
                    The recording will stop automatically.
                </div>
            </div>
        );
    }
    
    if (phase === PHASES.FINISHED) {
        return (
            <div className="text-gray-800 font-medium">✅ **Recording finished.**</div>
        );
    }

    return null; 
}