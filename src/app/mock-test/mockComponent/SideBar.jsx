"use client";

import React, { useEffect, useState } from "react";
import { mocktestStore } from "../mocktestStore";

// Primary responsibility: Displays the question list sidebar for the selected mock-test category.
// Architecture role: Fetches category questions and lets the user pick a concrete question to practice.

/**
 * @description Sidebar overlay that lists questions for the currently selected category.
 * The sidebar fetches the list whenever `currentQuestion` (category id) changes.
 *
 * @returns {JSX.Element} Sidebar overlay UI.
 */
const SideBar = () => {
  const isSideOpen = mocktestStore((state) => state.isSideOpen);
  const setIsSideOpen = mocktestStore((state) => state.setIsSideOpen);
  const currentQuestion = mocktestStore((state) => state.currentQuestion);
  const baseUrl = mocktestStore((state) => state.baseUrl);
  const setSelectedQuestion = mocktestStore(
    (state) => state.setSelectedQuestion,
  );
  const currentQuestionName = mocktestStore(
    (state) => state.currentQuestionName,
  );

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentQuestion) {
      // Why this exists: the list of questions depends on the selected category.
      // Fetching inside the effect ensures the sidebar stays in sync with category selection.
      const fetchQuestionData = async () => {
        try {
          setLoading(true);
          const response = await fetch(
            `${baseUrl}all_questions/${currentQuestion}`,
          );
          const data = await response.json();
          console.log(data);
          setQuestions(data);
        } catch (error) {
          console.error("Failed to fetch questions", error);
        } finally {
          setLoading(false);
        }
      };

      fetchQuestionData();
    }
  }, [currentQuestion, baseUrl]);

  /**
   * @description Handles selecting a question and closing the sidebar.
   * @param {any} item - Backend question payload selected from the list.
   * @returns {void}
   */
  const handleClick = (item) => {
    setSelectedQuestion(item);
    setIsSideOpen(false);
  };

  return (
    <div
      className={`absolute top-0 z-50 w-[0vw] h-[100vh] bg-black/40 ${isSideOpen ? "block w-[100vw]" : "hidden"}`}
      onClick={() => setIsSideOpen(false)}
    >
      <div className="w-[60%] h-[100vh] bg-white float-right p-8">
        <h1 className="text-lg text-[#018dde] font-bold">
          {currentQuestionName}
        </h1>

        <div className="flex flex-col space-y-2 mt-4">
          {loading ? (
            <QuestionSkeleton />
          ) : (
            questions.map((item) => (
              <div
                key={item.id}
                onClick={() => handleClick(item)}
                className="p-2 bg-blue-50 hover:bg-blue-100 transition-all duration-300 ease-in-out cursor-pointer"
              >
                <p className="text-blue-500">{item.name}</p>
              </div>
            ))
          )}
        </div>
        {!loading && questions.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-6">
            No questions available
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * @description Minimal skeleton UI rendered while the sidebar question list is loading.
 * @returns {JSX.Element} Loading placeholder rows.
 */
const QuestionSkeleton = () => {
  return (
    <div className="flex flex-col space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-10 w-full rounded-md bg-gray-200 animate-pulse"
        />
      ))}
    </div>
  );
};

export default SideBar;
