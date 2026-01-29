import React from "react";
import TopSection from "./mockComponent/TopSection";
import SideBar from "./mockComponent/SideBar";
import ExamComponent from "./mockComponent/ExamComponent";

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
