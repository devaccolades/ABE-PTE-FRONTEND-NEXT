"use client";
import { useEffect } from "react";

// Primary responsibility: Clears persisted client state when the user leaves the page.
// Architecture role: Prevents stale localStorage from leaking across exam/mock-test sessions.

/**
 * @description Tab-level guard that clears localStorage on `beforeunload` (tab close / reload / navigation).
 * This is used as a safety net to avoid resuming stale client-side state after the user leaves the app.
 *
 * @returns {null} This component renders nothing; it only registers a lifecycle side effect.
 */
export default function TabGuard() {
  useEffect(() => {
    /**
     * @description Handles tab/page exit by clearing localStorage.
     * @returns {void}
     */
    const handleExit = () => {
      // Keep an unfinished exam so a refresh resumes it; ExamShell's heartbeat
      // clears it when the tab was closed instead.
      const examInProgress =
        localStorage.getItem("exam_session_id") &&
        localStorage.getItem("exam_completed") !== "true";
      if (examInProgress) return;
      localStorage.clear();
      // Add your cache clearing logic here
    };

    window.addEventListener("beforeunload", handleExit);
    return () => window.removeEventListener("beforeunload", handleExit);
  }, []);

  return null; // This component renders nothing
}