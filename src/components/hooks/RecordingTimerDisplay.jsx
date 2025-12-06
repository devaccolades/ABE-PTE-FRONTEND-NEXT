// src/components/RecordingTimerDisplay.jsx (or similar path)

import { Progress } from "../ui/progress";
import { PHASES } from "./useRecordingTimer";

// import { Progress } from "@/components/ui/progress";
// import { PHASES } from "@/hooks/useRecordingTimer"; 

/**
 * Renders the countdown timers and progress bars for the recording process.
 */
export default function RecordingTimerDisplay({
  phase,
  prepLeft,
  recLeft,
  prepProgress,
  recProgress,
  error,
}) {
  return (
    <>
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* PREP phase */}
      {phase === PHASES.PREP && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium">Preparation time</div>
            <div>{prepLeft}s</div>
          </div>
          <Progress value={prepProgress} />
          <div className="text-xs text-gray-600">
            Recording will start automatically when the timer reaches 0.
          </div>
        </div>
      )}

      {/* RECORDING phase */}
      {phase === PHASES.RECORDING && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium">Recording…</div>
            <div>{recLeft}s</div>
          </div>
          <Progress value={recProgress} />
          <div className="text-xs text-gray-600">
            Recording in progress — it will stop automatically.
          </div>
        </div>
      )}

      {/* FINISHED phase */}
      {phase === PHASES.FINISHED && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Recording finished click{" "}
            <span className="font-semibold color-blue-300">next</span> for next
            question.
          </div>
        </div>
      )}
    </>
  );
}