"use client";
import { useEffect } from "react";

export default function TabGuard() {
  useEffect(() => {
    const handleExit = () => {
      localStorage.clear();
      // Add your cache clearing logic here
    };

    window.addEventListener("beforeunload", handleExit);
    return () => window.removeEventListener("beforeunload", handleExit);
  }, []);

  return null; // This component renders nothing
}