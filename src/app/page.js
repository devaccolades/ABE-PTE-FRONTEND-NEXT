"use client";
import NameGate from "@/components/NameGate";
import ExamShell from "@/components/ExamShell";
import { useExamStore } from "@/store";

export default function Home() {
  const userName = useExamStore((s) => s.userName);

  return (
    <main className="min-h-dvh bg-gradient-to-b from-sky-50 to-white text-gray-900">
      <div className="container mx-auto max-w-4xl p-6 min-h-dvh flex items-center justify-center">
        {!userName ? <NameGate /> : <ExamShell />}
      </div>
    </main>
  );
}
