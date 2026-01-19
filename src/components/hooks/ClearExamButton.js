"use client";

export default function ClearExamButton() {
  const onReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <button
      className="fixed bottom-10 right-12 bg-[#f0f9ff] text-[#0084d1] py-2 px-4 rounded-full cursor-pointer shadow-md"
      onClick={onReset}
    >
      Clear Exam
    </button>
  );
}
