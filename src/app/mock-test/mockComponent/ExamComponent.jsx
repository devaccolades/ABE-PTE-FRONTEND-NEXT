"use client";
import React, { useEffect, useState } from "react";
import { mocktestStore } from "../mocktestStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExamStore } from "@/store";
import { Separator } from "@/components/ui/separator";
import ReadAloud from "@/components/questions/ReadAloud";
import AreyousureModal from "@/components/modals/AreyousureModal";
import RetellLecture from "@/components/questions/RetellLecture";
import DescribeImage from "@/components/questions/DescribeImage";
import WriteEssay from "@/components/questions/WriteEssay";
import FillBlanksDropdown from "@/components/questions/FillBlanksDropdown";
import FillBlanksDragDrop from "@/components/questions/FillBlanksDragDrop";
import MultipleChoiceMulti from "@/components/questions/MultipleChoiceMulti";
import MultipleChoiceSingle from "@/components/questions/MultipleChoiceSingle";
import ReorderParagraphs from "@/components/questions/ReorderParagraphs";
import SummarizeTheText from "@/components/questions/SummarizeTheText";
import AudioToMCQ from "@/components/questions/AudioToMCQ";
import FillBlanksTyped from "@/components/questions/FillBlanksTyped";
import AudioHighlightBox from "@/components/questions/AudioHighlightBox";
import NotificationMessage from "@/components/sections/NotificationMessage";
import CategoryMessage from "@/components/sections/CategoryMessage";
import toast, { Toaster } from "react-hot-toast";

// Primary responsibility: Renders and submits a single mock-test question (practice mode).
// Architecture role: Bridges mock-test selection state (mocktestStore) with shared exam answer mechanics (useExamStore).

/**
 * @description Mock-test question runner. Displays the selected question and submits a single response
 * (including optional audio) to the mock-test submission endpoint.
 *
 * Key behaviors:
 * - Uses `mocktestStore` for selection (category/question) and backend base URL.
 * - Uses `useExamStore` for shared answer capture and `phase`/`stopSignal` coordination with question components.
 * - Uses a brief stop-signal buffer before submission to allow recording components to finalize the audio Blob.
 *
 * @returns {JSX.Element} Mock-test question UI including the confirmation modal.
 */
const ExamComponent = () => {
  const selectedQuestion = mocktestStore((state) => state.selectedQuestion);
  const currentQuestion = mocktestStore((state) => state.currentQuestion);
  const baseUrl = mocktestStore((state) => state.baseUrl);
  const phase = useExamStore((state) => state.phase);
  const [callAreYouSure, setCallAreYouSure] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState();
  const setStopSignal = useExamStore((state) => state.setStopSignal);
  const resetAnswer = useExamStore((state) => state.resetAnswer);

  /**
   * @description Stores the candidate name used for single-question mock-test submissions.
   * @returns {void}
   */
  const handleSubmit = () => {
    setName(inputValue);
    console.log(inputValue);
  };

  //   console.log(selectedQuestion.name);

  useEffect(() => {
    if (selectedQuestion) {
      console.log(currentQuestion);
    }
  }, [selectedQuestion]);

  /**
   * @description Submits the current mock-test answer to the backend.
   *
   * Why the stop-signal + delay exists:
   * - Speaking tasks record audio in child components.
   * - When the user clicks "Next" while recording/prep is still active, we must signal the child to stop and finalize.
   * - The short delay provides a buffer for the audio Blob to be produced and stored in `useExamStore`.
   *
   * @returns {Promise<void>}
   */
  const handleModalNext = async () => {
    setCallAreYouSure(false);
    // 1. Check if the question is currently in a recording/active state
    const currentPhase = useExamStore.getState().phase;

    // If not "finished", it means the user clicked Next while the timer was still running
    console.log("phase", currentPhase);
    // Logic: If it's not finished, we need to manually end the recording
    if (currentPhase === "recording" || currentPhase === "prep") {
      setStopSignal(true);
      setLoading(true);

      // This pause is the "Safety Buffer" for the Audio Blob to be created
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 2. Now get the FRESH state (which now includes the blob from step 1)
    const finalAnswer = useExamStore.getState().answer;

    // 3. Prepare FormData
    const formData = new FormData();
    // formData.append("session_id", sessionId);
    formData.append("name", name);
    formData.append("question_name", selectedQuestion.name);

    // Handle Audio: Only append if it's a valid Blob
    if (finalAnswer.answer_audio instanceof Blob) {
      formData.append("answer_audio", finalAnswer.answer_audio, "answer.webm");
    }

    console.log("answer", formData);
    // Handle Text Answers
    if (finalAnswer.answer !== undefined && finalAnswer.answer !== null) {
      const answerVal =
        typeof finalAnswer.answer === "object"
          ? JSON.stringify(finalAnswer.answer)
          : finalAnswer.answer;
      formData.append("answer", answerVal);
    }

    try {
      console.log("answer", formData);
      const postRes = await fetch(`${baseUrl}single-response/`, {
        method: "POST",
        body: formData,
      });
      // console.log("remain time from shell after submission ", remainingTime);

      if (!postRes.ok) throw new Error("Submission Failed");

      toast.success("Successfully completed the submission try next one!");

      // 4. CLEANUP: Reset store for the next question
      setStopSignal(false);
      resetAnswer(); // Ensure this clears both 'answer' and 'answer_audio'

      // if (nextQuestionUrl) {
      //   loadQuestion(nextQuestionUrl);
      // } else {
      //   setLoading(false);
      //   setCurrentQuestion(null); // Shows ExamCompleteScreen
      // }
    } catch (error) {
      console.error("Submission Error:", error);
      alert("Submission failed. Please try again.");
      setLoading(false);
      setStopSignal(false);
    }
  };

  return (
    // <div className="flex justify-center items-center h-[80vh] w-full">
    //   <div className="w-[60%] h-[50vh] bg-blue-50 rounded-lg flex flex-col overflow-hidden">
    //     <div className="h-[20%] bg-blue-100 w-full p-5 flex items-center justify-between">
    //       <p className="uppercase text-lg font-semibold">
    //         Question Name : {selectedQuestion?.name}
    //       </p>
    //       <div className="flex items-start w-[40%]">
    //         <p className="uppercase text-md font-semibold ">candidate : </p>
    //       </div>
    //     </div>
    //   </div>
    // </div>
    <div className="flex justify-center items-start h-[80vh] relative mt-56 md:mt-40 w-[90%] mx-auto">
      <Toaster position="top-center" reverseOrder={false} />
      {!name && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-fadeIn">
            {/* Title */}
            <h2 className="text-xl font-semibold text-blue-600 text-center">
              Enter Your Name
            </h2>

            {/* Subtitle */}
            <p className="text-sm text-blue-400 text-center mt-1">
              This will be used to identify your test session
            </p>

            {/* Form */}
            <div className="mt-6 flex flex-col gap-4">
              <input
                type="text"
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                onChange={(e) => setInputValue(e.target.value)}
              />

              <button
                onClick={handleSubmit}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 transition active:scale-[0.98]"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      <Card className="w-full max-w-4xl mx-auto shadow-lg border-none md:border sm:rounded-xl rounded-none">
        {/* Header: Adjusted padding and text size for mobile */}
        <CardHeader className="bg-slate-50 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 w-full">
            <CardTitle className="text-sky-800 text-lg md:text-xl">
              {titleFor(currentQuestion)}
            </CardTitle>
            <div className="text-xs md:text-sm text-gray-500">
              Candidate: {"" + name}
              {/* <span className="font-bold text-gray-700">{userName }</span> */}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-8">
          {/* Instruction: Responsive font size and margin */}
          <h2 className="font-bold text-base md:text-lg mb-3 md:mb-4 leading-tight">
            {/* {currentQuestion.subsection_instruction} */}
          </h2>
          <Separator className="mb-4 md:mb-6" />

          {/* Question Container: Flexible height */}
          {selectedQuestion && (
            <div className="min-h-[200px] md:min-h-[250px]">
              {renderQuestionComponent(
                currentQuestion,
                selectedQuestion,
                // handleModalNext,
                // remainingTime,
              )}
            </div>
          )}

          {!selectedQuestion && (
            <div>
              <p className="text-lg font-bold">
                select the question category from above
              </p>
            </div>
          )}

          {/* Footer: Full-width button on mobile for better thumb reach */}
          <div className="mt-6 md:mt-10 pt-4 border-t flex justify-end">
            <button
              disabled={phase === "prep"}
              onClick={() => setCallAreYouSure(true)}
              className={`w-full sm:w-auto px-10 py-3 md:py-2 rounded-lg md:rounded-md font-bold transition-all text-base md:text-sm ${
                phase === "prep"
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-sky-600 text-white hover:bg-sky-700 shadow-md active:scale-95"
              }`}
            >
              Next
            </button>
          </div>
        </CardContent>
      </Card>
      {callAreYouSure && (
        <AreyousureModal
          onClose={() => setCallAreYouSure(false)}
          onNext={handleModalNext}
        />
      )}
    </div>
  );
};

/**
 * @description Maps backend subsection codes to display titles for the mock-test header.
 * @param {string} sub - Backend subsection identifier (e.g., "read_aloud", "mc_single").
 * @returns {string} Human-friendly title string for the current question type.
 */
function titleFor(sub) {
  const map = {
    read_aloud: "Speaking: Read Aloud",
    describe_image: "Speaking: Describe Image",
    answer_short_question: "Speaking: Answer Short Question",
    respond_to_a_situation: "Speaking: Respond to a Situation",
    summarise_group_discussion: "Speaking: Summarize Group Discussion",
    summarize_written_text: "Writing: Summarize Written Text",
    write_essay: "Writing: Essay",
    mc_multiple: "Multiple Choice Multiple Answers",
    fib_drag_drop: "Fill in the blanks Drag and Drop",
    reorder_paragraphs: "Reorder Paragraphs",
    mc_single: "Multiple Choice Single Answer",
    fib_dropdown: "Reading: Fill in the Blanks",
    retell_lecture: "Speaking: Retell Lecture",
    repeat_sentence: "Speaking: Repeat Sentence",
    "mcq-multi": "Reading: Multiple Choice (Multiple)",
    "mcq-single": "Reading: Multiple Choice (Single)",
    "reorder-paragraphs": "Reading: Reorder Paragraphs",
    "Write-from-Dictation": "Listening: Write from Dictation",
    "summarize-spoken-text": "Listening: Summarize Spoken Text",
    write_from_dictation: "Write From Dictation",
    l_mc_multiple: "Multiple Choice Multiple Answers",
    highlight_correct_summary: "Highlight Correct Summary ",
    l_mc_single: "Multiple Choice Single Answer",
    select_missing_word: "Select Missing Word",
    l_fill_in_blanks: "Listening Fill in the Blanks",
    highlight_incorrect_words: "Highlight Incorrect Words",
  };
  return map[sub] || "Mock Test Question";
}

/**
 * @description Renders the appropriate question component for mock-test mode based on the selected category.
 * @param {string} QuestionId - Selected category/subsection identifier.
 * @param {any} q - Concrete question payload selected from the sidebar.
 * @param {Function} onNext - Callback to submit and advance (passed through to question components when used).
 * @param {number} remainingTime - Remaining time (seconds) for timed writing/listening tasks (if applicable).
 * @returns {JSX.Element} Rendered question component.
 */
function renderQuestionComponent(QuestionId, q, onNext, remainingTime) {
  const id = q.id;
  const sub = QuestionId;

  switch (sub) {
    // --- Speaking ---
    case "read_aloud":
      return (
        <ReadAloud
          key={id}
          promptText={q.text}
          prepSeconds={q.reading_time}
          recordSeconds={q.answering_time}
          name={q.name}
          onNext={onNext}
        />
      );

    case "describe_image":
      return (
        <DescribeImage
          key={id}
          imageUrl={q.image}
          prepSeconds={q.reading_time}
          recordSeconds={q.answering_time}
          onNext={onNext}
        />
      );

    case "repeat_sentence":
    case "retell_lecture":
    case "answer_short_question":
    case "respond_to_a_situation":
    case "summarise_group_discussion":
      return (
        <RetellLecture
          key={id}
          audioUrl={q.audio}
          videoUrl={q.image}
          prepSeconds={q.reading_time}
          recordSeconds={q.answering_time}
          text={q.text}
          subsection={sub}
          onNext={onNext}
        />
      );

    // --- Writing / Summarization ---
    case "write_essay":
    case "summarize_written_text":
      return (
        <WriteEssay
          key={id}
          promptText={q.text}
          durationSeconds={remainingTime}
          subsection={sub}
          onNext={onNext}
        />
      );

    // case "audio_to_text":
    // case "write_from_dictation":
    // return (
    //   <SummerizeTheEssay
    //     key={id}
    //     output={q.audio}
    //     prepSeconds={q.prepSeconds}
    //     onNext={onNext}
    //   />
    // );

    // --- Reading ---
    case "fib_dropdown":
      return (
        <FillBlanksDropdown
          key={id}
          segments={q.sub_questions}
          onNext={onNext}
        />
      );

    case "fib_drag_drop":
      return (
        <FillBlanksDragDrop
          key={id}
          segments={q.text} // Your text segments
          options={q.options} // The array of 6 objects you provided
          subsection={q.subsection}
        />
      );

    case "mc_multiple":
      return (
        <MultipleChoiceMulti
          key={id}
          paragraphs={q.text}
          // questionText={q.questionText}
          options={q.options}
          onNext={onNext}
        />
      );

    case "mc_single":
      return (
        <MultipleChoiceSingle
          key={id}
          paragraphs={q.text}
          // questionText={q.text}
          options={q.options}
          onNext={onNext}
        />
      );

    case "reorder_paragraphs":
      return <ReorderParagraphs key={id} items={q.options} onNext={onNext} />;

    // --- Listening ---
    case "summarize_spoken_text":
    case "write_from_dictation":
      return (
        <SummarizeTheText
          key={id}
          audioUrl={q.audio}
          prepSeconds={q.reading_time}
          subsection={sub}
          questionId={id}
          onNext={onNext}
        />
      );

    case "l_mc_multiple":
    case "highlight_correct_summary":
    case "l_mc_single":
    case "select_missing_word":
      return (
        <AudioToMCQ
          key={id}
          type={q.subsection}
          audioSrc={q.audio}
          options={q.options}
          text={q.text}
          onNext={onNext}
        />
      );

    case "l_fill_in_blanks":
      return (
        <FillBlanksTyped
          key={id}
          textString={q.text}
          audioSrc={q.audio}
          durationSeconds={q.durationSeconds}
          onNext={onNext}
        />
      );

    case "highlight_incorrect_words":
      return (
        <AudioHighlightBox
          key={id}
          audioSrc={q.audio}
          text={q.text}
          onNext={onNext}
        />
      );

    // --- System Messaging ---
    case "notification":
      return (
        <NotificationMessage
          key={id}
          message={q.message}
          duration={q.durationSeconds}
          onNext={onNext}
        />
      );

    case "category":
      return (
        <CategoryMessage
          key={id}
          categoryName={q.categoryName}
          message={q.message}
          duration={q.durationSeconds}
          onNext={onNext}
        />
      );

    default:
      return (
        <div key={id} className="text-center py-10 text-gray-400">
          Question type [{sub}] not yet implemented.
        </div>
      );
  }
}

export default ExamComponent;
