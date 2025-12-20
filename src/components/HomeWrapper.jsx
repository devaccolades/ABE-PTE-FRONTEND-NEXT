"use client";
import React, { useEffect } from "react";
import NameGate from "./NameGate";
import { useExamStore } from "@/store";
import ExamShell from "./ExamShell";

const HomeWrapper = ({ mocktestList }) => {
  // const name = useExamStore((s) => s.userName);
  const session_id = useExamStore((s) => s.session_id);
  const url = useExamStore((s) => s.baseUrl);

  // return (
  //   <main className="min-h-dvh bg-gradient-to-b from-sky-50 to-white text-gray-900">
  //     <div className="container mx-auto max-w-4xl p-6 min-h-dvh flex items-center justify-center">
  //       {!name ? <NameGate mocktestList={mocktestList} /> : <ExamShell />}
  //     </div>
  //   </main>
  // );
  return (
    <main className="min-h-dvh bg-gradient-to-b from-sky-50 to-white text-gray-900">
      <div className="container mx-auto max-w-4xl p-6 min-h-dvh flex items-center justify-center">
        <ExamShell mocktestList={mocktestList} />
      </div>
    </main>
  );
};

export default HomeWrapper;
