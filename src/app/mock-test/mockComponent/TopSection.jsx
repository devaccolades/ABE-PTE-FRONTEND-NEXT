"use client";
import React, { useState } from "react";
import { mocktestStore } from "../mocktestStore";

const TopSection = () => {
  const [active, setActive] = useState(false);
  const setCurrentQuestion = mocktestStore((state) => state.setCurrentQuestion);
  const setIsSideOpen = mocktestStore((state) => state.setIsSideOpen);
  const setCurrentQuestionName = mocktestStore(
    (state) => state.setCurrentQuestionName,
  );
  const setIsMockTest = mocktestStore((state) => state.setIsMockTest);

  const speaking = [
    { id: "read_aloud", title: "Read Aloud" },
    { id: "repeat_sentence", title: "Repeat Sentence" },
    { id: "describe_image", title: "Describe Image" },
    { id: "retell_lecture", title: "Retell Lecture" },
    { id: "answer_short_question", title: "Answer Short Question" },
    { id: "summarise_group_discussion", title: "Summarise Group Discussion" },
    { id: "respond_to_a_situation", title: "Respond to a Situation" },
  ];

  const writing = [
    { id: "summarize_written_text", title: "Summarize Written Text" },
    { id: "write_essay", title: "Write Essay" },
  ];

  const reading = [
    { id: "fib_dropdown", title: "Fill in the Blanks – Dropdown" },
    { id: "mc_multiple", title: "MCQ – Multiple Answers (Reading)" },
    { id: "reorder_paragraphs", title: "Reorder Paragraphs" },
    { id: "fib_drag_drop", title: "Fill in the Blanks – Drag & Drop" },
    { id: "mc_single", title: "MCQ – Single Answer (Reading)" },
  ];

  const listening = [
    { id: "summarize_spoken_text", title: "Summarize Spoken Text" },
    { id: "l_mc_multiple", title: "MCQ – Multiple Answers (Listening)" },
    { id: "l_fill_in_blanks", title: "Fill in the Blanks (Listening)" },
    { id: "highlight_correct_summary", title: "Highlight Correct Summary" },
    { id: "l_mc_single", title: "MCQ – Single Answer (Listening)" },
    { id: "select_missing_word", title: "Select Missing Word" },
    { id: "highlight_incorrect_words", title: "Highlight Incorrect Words" },
    { id: "write_from_dictation", title: "Write from Dictation" },
  ];

  const handleClick = (id, title) => {
    setCurrentQuestion(id);
    setIsSideOpen(true);
    setCurrentQuestionName(title);
    setIsMockTest(true);
  };

  return (
    <div
      className={`bg-[#f0fcff] absolute top-0 z-50  w-full transition-h duration-300 ease-in-out overflow-hidden p-5  ${active ? "h-full" : "h-[10vh]"}`}
      onClick={() => setActive(!active)}
    >
      {" "}
      <div className="w-[80%] mx-auto ">
        <div className="flex justify-between items-center h-[8vh] gap-1">
          <h1 className="text-[#0084d1] text-2xl md:text-3xl font-bold py-5">
            Mock Test
          </h1>
          <button className="bg-[#0084d1] py-2 px-4 text-white rounded-xl  w-fit h-fit cursor-pointer">
            Select Questions
          </button>
        </div>
        <div className="flex flex-wrap space-y-4 space-x-4 justify-between items-start mt-4">
          <div>
            <h2 className="text-xl font-semibold text-[#018dde] mb-1">
              Speaking
            </h2>

            <div className="space-y-1">
              {speaking.map((item) => (
                <div
                  className="cursor-pointer "
                  key={item.id}
                  onClick={() => handleClick(item.id, item.title)}
                >
                  <p className="hover:text-[#018dde]">{item.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* writing section  */}
          <div>
            <h2 className="text-xl font-semibold text-[#018dde] mb-1">
              writing
            </h2>

            <div className="space-y-1">
              {writing.map((item) => (
                <div
                  className="cursor-pointer"
                  key={item.id}
                  onClick={() => handleClick(item.id, item.title)}
                >
                  <p className="hover:text-[#018dde]">{item.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* reading section  */}
          <div>
            <h2 className="text-xl font-semibold text-[#018dde] mb-1">
              reading
            </h2>

            <div className="space-y-1">
              {reading.map((item) => (
                <div
                  className="cursor-pointer"
                  key={item.id}
                  onClick={() => handleClick(item.id, item.title)}
                >
                  <p className="hover:text-[#018dde]">{item.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* listening section  */}
          <div>
            <h2 className="text-xl font-semibold text-[#018dde] mb-1">
              listening
            </h2>

            <div className="space-y-1">
              {listening.map((item) => (
                <div
                  className="cursor-pointer"
                  key={item.id}
                  onClick={() => handleClick(item.id, item.title)}
                >
                  <p className="hover:text-[#018dde]">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopSection;
