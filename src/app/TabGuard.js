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
      localStorage.clear();
      // Add your cache clearing logic here
    };

    window.addEventListener("beforeunload", handleExit);
    return () => window.removeEventListener("beforeunload", handleExit);
  }, []);

  return null; // This component renders nothing
}