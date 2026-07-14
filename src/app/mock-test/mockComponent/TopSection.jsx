"use client";
import React, { useState } from "react";
import { mocktestStore } from "../mocktestStore";
import Link from "next/link";

// Primary responsibility: Provides the mock-test category picker UI (Speaking/Writing/Reading/Listening).
// Architecture role: Writes category selection into the mock-test store and opens the sidebar to choose a question.

/**
 * @description Top navigation/selector for mock-test categories.
 * Expands/collapses and allows the user to choose a category which triggers sidebar question listing.
 *
 * @returns {JSX.Element} Top section UI for category selection.
 */
const TopSection = ({ onClose }) => {
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

  /**
   * @description Handles category selection by updating the store and opening the sidebar.
   * @param {string} id - Backend category/subsection id (e.g., "read_aloud").
   * @param {string} title - Human-friendly category title shown to the user.
   * @returns {void}
   */
  const handleClick = (id, title) => {
    setCurrentQuestion(id);
    setIsSideOpen(true);
    setCurrentQuestionName(title);
    setIsMockTest(true);
    if (onClose) onClose();
  };

  return (
    <div className="absolute top-full left-0 w-full bg-[#f0fcff] shadow-lg border-t border-slate-200 z-50 p-6 overflow-hidden">
      <div className="w-[80%] max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-8 justify-between items-start">
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
