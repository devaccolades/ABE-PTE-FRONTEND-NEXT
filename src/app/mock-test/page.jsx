"use client";

import { useState } from "react";
import Header from "@/components/Header";
import TopSection from "./mockComponent/TopSection";
import SideBar from "./mockComponent/SideBar";
import ExamComponent from "./mockComponent/ExamComponent";

export default function Page() {
  const [active, setActive] = useState(false);

  return (
    <>
      <Header
        variant="mock-test"
        onSelectQuestions={() => setActive((prev) => !prev)}
      >
        {active && <TopSection onClose={() => setActive(false)} />}
      </Header>

      <SideBar />
      <ExamComponent />
    </>
  );
}