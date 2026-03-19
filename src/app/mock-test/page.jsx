import React from "react";
import TopSection from "./mockComponent/TopSection";
import SideBar from "./mockComponent/SideBar";
import ExamComponent from "./mockComponent/ExamComponent";

// Primary responsibility: Renders the mock-test experience shell (top navigation, sidebar, and question area).
// Architecture role: Dedicated route for running individual question practice outside the full exam flow.

/**
 * @description Mock test route entry component. Composes the mock-test UI primitives.
 * @returns {JSX.Element} Mock-test page layout.
 */
const page = () => {
  return (
    <div>
      <TopSection />
      <SideBar />
      <ExamComponent />
    </div>
  );
};

export default page;
