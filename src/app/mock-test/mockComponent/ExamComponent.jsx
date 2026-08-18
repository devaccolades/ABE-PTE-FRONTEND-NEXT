"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  X,
} from "lucide-react";
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
  const router = useRouter();
  const selectedQuestion = mocktestStore((state) => state.selectedQuestion);
  const currentQuestion = mocktestStore((state) => state.currentQuestion);
  const baseUrl = mocktestStore((state) => state.baseUrl);
  const setIsSideOpen = mocktestStore((state) => state.setIsSideOpen);
  const phase = useExamStore((state) => state.phase);
  const [callAreYouSure, setCallAreYouSure] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [name, setName] = useState("");
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [evaluationState, setEvaluationState] = useState(null);
  const setStopSignal = useExamStore((state) => state.setStopSignal);
  const resetAnswer = useExamStore((state) => state.resetAnswer);
  const pollTimerRef = useRef(null);
  const trackingIdRef = useRef(null);

  /**
   * @description Stores the candidate name used for single-question mock-test submissions.
   * @returns {void}
   */
  const handleSubmit = () => {
    const candidateName = inputValue.trim();
    if (!candidateName) {
      toast.error("Enter your name to continue.");
      return;
    }
    setName(candidateName);
    setIsNameDialogOpen(false);
  };

  const closeNameDialog = () => {
    setIsNameDialogOpen(false);
    router.replace("/");
  };

  useEffect(() => {
    if (!isNameDialogOpen || name) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsNameDialogOpen(false);
        router.replace("/");
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isNameDialogOpen, name, router]);

  useEffect(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    trackingIdRef.current = null;
    setEvaluationState(null);
    setLoading(false);
    setStopSignal(false);
    resetAnswer();
  }, [selectedQuestion?.id, resetAnswer, setStopSignal]);

  useEffect(() => () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  }, []);

  const pollEvaluation = async (trackingId, attempt = 0) => {
    if (trackingIdRef.current !== trackingId) return;

    try {
      const response = await fetch(
        `${baseUrl}single-response-status/${trackingId}/`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Evaluation status could not be loaded.");

      const payload = await response.json();
      if (trackingIdRef.current !== trackingId) return;
      setEvaluationState(payload);

      if (payload.terminal) return;
      if (attempt >= 149) {
        setEvaluationState((current) => ({
          ...current,
          status: "delayed",
          terminal: true,
          message: "Evaluation is still running in the background. Please try this question again later.",
        }));
        return;
      }
    } catch (error) {
      if (attempt >= 149) {
        setEvaluationState({
          status: "failed",
          terminal: true,
          message: error.message || "Evaluation status could not be loaded.",
          error: error.message || "Evaluation status could not be loaded.",
          feedback: emptyFeedback(),
        });
        return;
      }
    }

    pollTimerRef.current = setTimeout(
      () => pollEvaluation(trackingId, attempt + 1),
      2000,
    );
  };

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
    if (!name) {
      setCallAreYouSure(false);
      setIsNameDialogOpen(true);
      toast.error("Enter your name before submitting your answer.");
      return;
    }

    setCallAreYouSure(false);
    setLoading(true);
    // 1. Check if the question is currently in a recording/active state
    const currentPhase = useExamStore.getState().phase;

    // If not "finished", it means the user clicked Next while the timer was still running
    // Logic: If it's not finished, we need to manually end the recording
    if (currentPhase === "recording" || currentPhase === "prep") {
      setStopSignal(true);
    }

    if (selectedQuestion?.ai_input_type === "audio") {
      const capturePromise = useExamStore.getState().audioCapturePromise;
      let audioBlob = null;

      try {
        audioBlob = await Promise.race([
          capturePromise || Promise.resolve(null),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Audio finalization timed out.")), 5000),
          ),
        ]);
      } catch (error) {
        console.error("Audio finalization failed:", error);
      }

      if (!(audioBlob instanceof Blob) || audioBlob.size === 0) {
        setLoading(false);
        setStopSignal(false);
        alert(
          "Your recording could not be saved. Please check microphone access and record this answer again.",
        );
        return;
      }
    }

    // 2. Now get the FRESH state (which now includes the blob from step 1)
    const finalAnswer = useExamStore.getState().answer;

    // 3. Prepare FormData
    const formData = new FormData();
    formData.append("name", name);
    formData.append("question_id", selectedQuestion.id);

    // Handle Audio: Only append if it's a valid Blob
    if (finalAnswer.answer_audio instanceof Blob) {
      formData.append("answer_audio", finalAnswer.answer_audio, "answer.webm");
    }

    // Handle Text Answers
    if (finalAnswer.answer !== undefined && finalAnswer.answer !== null) {
      const answerVal =
        typeof finalAnswer.answer === "object"
          ? JSON.stringify(finalAnswer.answer)
          : finalAnswer.answer;
      formData.append("answer", answerVal);
    }

    try {
      const postRes = await fetch(`${baseUrl}single-response/`, {
        method: "POST",
        body: formData,
      });
      const payload = await postRes.json().catch(() => ({}));
      if (!postRes.ok) {
        throw new Error(payload.error || "Submission failed");
      }

      const trackingId = payload.evaluation?.tracking_id;
      if (!trackingId) {
        throw new Error("Evaluation tracking was not created.");
      }

      trackingIdRef.current = trackingId;
      setEvaluationState({
        status: payload.evaluation.status || "pending",
        stage: payload.evaluation.stage || "queued",
        terminal: false,
        retrying: Boolean(payload.evaluation.retryable),
        message: payload.evaluation.message || "Your answer is queued for evaluation.",
        feedback: emptyFeedback(),
        transcript: "",
        error: "",
      });
      toast.success("Answer submitted. Evaluation is in progress.");

      setStopSignal(false);
      resetAnswer();
      setLoading(false);
      pollEvaluation(trackingId);
    } catch (error) {
      console.error("Submission Error:", error);
      toast.error(error.message || "Submission failed. Please try again.");
      setLoading(false);
      setStopSignal(false);
    }
  };

  const clearEvaluation = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    trackingIdRef.current = null;
    setEvaluationState(null);
    setLoading(false);
    resetAnswer();
  };

  const chooseAnotherQuestion = () => {
    clearEvaluation();
    setIsSideOpen(true);
  };

  const requestSubmission = () => {
    if (!name) {
      setIsNameDialogOpen(true);
      return;
    }
    setCallAreYouSure(true);
  };

  return (
    <div className="flex justify-center items-start h-[80vh] relative mt-56 md:mt-40 w-[90%] mx-auto">
      <Toaster position="top-center" reverseOrder={false} />
      {!name && isNameDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900/40 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeNameDialog();
          }}
        >
          <div
            className="relative w-full max-w-md rounded-lg bg-white p-8 shadow-2xl animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-name-title"
          >
            <button
              type="button"
              onClick={closeNameDialog}
              className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close name dialog"
              title="Close"
            >
              <X size={19} />
            </button>

            {/* Title */}
            <h2
              id="candidate-name-title"
              className="text-center text-xl font-semibold text-blue-600"
            >
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
                spellCheck={false}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSubmit();
                }}
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeNameDialog}
                  className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Card className="w-full max-w-4xl mx-auto shadow-lg border-none md:border sm:rounded-xl rounded-none">
        {/* Header: Adjusted padding and text size for mobile */}
        <CardHeader className="bg-slate-50 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 w-full">
            <CardTitle className="text-sky-800 text-lg md:text-xl">
              {titleFor(currentQuestion, selectedQuestion)}
            </CardTitle>
            {name ? (
              <div className="text-xs text-gray-500 md:text-sm">
                Candidate: {name}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsNameDialogOpen(true)}
                className="text-left text-xs font-semibold text-sky-700 hover:text-sky-900 md:text-sm"
              >
                Add candidate name
              </button>
            )}
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

          {evaluationState && (
            <EvaluationFeedback result={evaluationState} />
          )}

          <div className="mt-6 flex flex-col justify-end gap-3 border-t pt-4 sm:flex-row md:mt-10">
            {selectedQuestion && !evaluationState && (
              <button
                disabled={phase === "prep" || loading}
                onClick={requestSubmission}
                className={`w-full rounded-md px-6 py-3 text-sm font-bold transition-colors sm:w-auto ${
                  phase === "prep" || loading
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : "bg-sky-600 text-white hover:bg-sky-700"
                }`}
              >
                {loading ? "Preparing answer..." : "Submit for evaluation"}
              </button>
            )}

            {evaluationState?.terminal && (
              <>
                {evaluationState.status === "failed" && (
                  <button
                    type="button"
                    onClick={clearEvaluation}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
                  >
                    <RotateCcw size={17} />
                    Try again
                  </button>
                )}
                <button
                  type="button"
                  onClick={chooseAnotherQuestion}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 sm:w-auto"
                >
                  <FileSearch size={17} />
                  Choose another question
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      {callAreYouSure && (
        <AreyousureModal
          onClose={() => setCallAreYouSure(false)}
          onNext={handleModalNext}
          content="Submit this answer for evaluation?"
          nextQuestion="Submit Answer"
        />
      )}
    </div>
  );
};

function EvaluationFeedback({ result }) {
  const feedback = result.feedback || emptyFeedback();
  const isWorking = !result.terminal;
  const isFailed = result.status === "failed";
  const isDelayed = result.status === "delayed";
  const statusStyle = isFailed
    ? "border-red-200 bg-red-50 text-red-800"
    : isDelayed
      ? "border-amber-200 bg-amber-50 text-amber-800"
    : isWorking
      ? "border-sky-200 bg-sky-50 text-sky-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <section className="mt-8 border-t border-slate-200 pt-6" aria-live="polite">
      <div className={`flex items-start gap-3 border p-4 ${statusStyle}`}>
        {isWorking ? (
          <LoaderCircle className="mt-0.5 shrink-0 animate-spin" size={20} />
        ) : isFailed || isDelayed ? (
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
        ) : (
          <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
        )}
        <div>
          <h2 className="font-semibold">
            {isWorking
              ? "Evaluation in progress"
              : isFailed
                ? "Evaluation could not be completed"
                : isDelayed
                  ? "Evaluation delayed"
                : "Evaluation feedback"}
          </h2>
          <p className="mt-1 text-sm leading-6">{result.message}</p>
        </div>
      </div>

      {!isWorking && !isFailed && !isDelayed && (
        <div className="mt-5 space-y-6">
          {feedback.summary && (
            <FeedbackSection icon={MessageSquareText} title="Overall feedback">
              <p className="text-sm leading-7 text-slate-700">{feedback.summary}</p>
            </FeedbackSection>
          )}

          {result.transcript && (
            <FeedbackSection icon={MessageSquareText} title="Your transcript">
              <p className="text-sm leading-7 text-slate-700">{result.transcript}</p>
            </FeedbackSection>
          )}

          {feedback.observations?.length > 0 && (
            <FeedbackSection icon={Lightbulb} title="What the evaluation found">
              <dl className="divide-y divide-slate-100">
                {feedback.observations.map((item) => (
                  <div key={item.label} className="py-3 first:pt-0 last:pb-0">
                    <dt className="text-xs font-semibold uppercase text-slate-500">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-sm leading-6 text-slate-700">
                      {formatFeedbackValue(item.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </FeedbackSection>
          )}

          {feedback.details?.length > 0 && (
            <FeedbackSection icon={FileSearch} title="Answer details">
              <div className="divide-y divide-slate-100">
                {feedback.details.map((detail, index) => (
                  <div key={`${detail.label || "detail"}-${index}`} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {detail.label || `Item ${index + 1}`}
                    </p>
                    <dl className="mt-2 space-y-1 text-sm text-slate-600">
                      {Object.entries(detail)
                        .filter(
                          ([key, value]) =>
                            key !== "label" &&
                            value !== null &&
                            value !== undefined &&
                            value !== "",
                        )
                        .map(([key, value]) => (
                          <div key={key} className="flex flex-wrap gap-x-2">
                            <dt className="font-medium capitalize text-slate-500">
                              {key.replaceAll("_", " ")}:
                            </dt>
                            <dd>{formatFeedbackValue(value)}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                ))}
              </div>
            </FeedbackSection>
          )}

          {feedback.errors?.length > 0 && (
            <FeedbackSection icon={AlertCircle} title="Language corrections">
              <div className="space-y-3">
                {feedback.errors.map((error, index) => {
                  const isSpelling = error.type === "spelling";
                  return (
                    <div
                      key={`${error.type || "error"}-${error.text || index}`}
                      className={`border-l-4 px-3 py-2 ${
                        isSpelling
                          ? "border-red-500 bg-red-50"
                          : "border-blue-500 bg-blue-50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase text-slate-600">
                        {isSpelling ? "Spelling" : "Grammar"}
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        <span className="font-medium">{error.text}</span>
                        {error.suggestion && <> → {error.suggestion}</>}
                      </p>
                      {error.explanation && (
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {error.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </FeedbackSection>
          )}

          {feedback.explanation && (
            <FeedbackSection icon={Lightbulb} title="Explanation">
              <p className="text-sm leading-7 text-slate-700">
                {feedback.explanation}
              </p>
            </FeedbackSection>
          )}
        </div>
      )}
    </section>
  );
}

function FeedbackSection({ icon: Icon, title, children }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="text-sky-600" size={17} />
        {title}
      </h3>
      <div className="mt-2 border-l border-slate-200 pl-6">{children}</div>
    </section>
  );
}

function formatFeedbackValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") {
    return Object.values(value).map(formatFeedbackValue).join(", ");
  }
  return String(value ?? "");
}

function emptyFeedback() {
  return {
    summary: "",
    details: [],
    errors: [],
    explanation: "",
    observations: [],
  };
}

/**
 * @description Maps backend subsection codes to display titles for the mock-test header.
 * @param {string} sub - Backend subsection identifier (e.g., "read_aloud", "mc_single").
 * @returns {string} Human-friendly title string for the current question type.
 */
function titleFor(subStr, q) {
  if (!subStr && !q) return "Mock Test Question";
  
  const section = q?.mocktest_section?.section_name || "";
  const sub = subStr || q?.subsection || "";

  const map = {
    read_aloud: "Read Aloud",
    describe_image: "Describe Image",
    answer_short_question: "Answer Short Question",
    respond_to_a_situation: "Respond to a Situation",
    summarise_group_discussion: "Summarize Group Discussion",
    summarize_written_text: "Summarize Written Text",
    write_essay: "Essay",
    mc_multiple: "Multiple Choice Multiple Answers",
    fib_drag_drop: "Fill in the Blanks Drag and Drop",
    reorder_paragraphs: "Reorder Paragraphs",
    mc_single: "Multiple Choice Single Answer",
    fib_dropdown: "Fill in the Blanks",
    retell_lecture: "Retell Lecture",
    repeat_sentence: "Repeat Sentence",
    "mcq-multi": "Multiple Choice (Multiple)",
    "mcq-single": "Multiple Choice (Single)",
    "reorder-paragraphs": "Reorder Paragraphs",
    "Write-from-Dictation": "Write from Dictation",
    "summarize-spoken-text": "Summarize Spoken Text",
    "summarize_spoken_text": "Summarize Spoken Text",
    write_from_dictation: "Write From Dictation",
    l_mc_multiple: "Multiple Choice Multiple Answers",
    highlight_correct_summary: "Highlight Correct Summary",
    l_mc_single: "Multiple Choice Single Answer",
    select_missing_word: "Select Missing Word",
    l_fill_in_blanks: "Fill in the Blanks",
    highlight_incorrect_words: "Highlight Incorrect Words",
  };
  
  let formattedSub = map[sub] || map[sub.replace(/_/g, '-')] || sub.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  
  if (formattedSub.startsWith("L ")) {
    formattedSub = formattedSub.replace(/^L\s+/, "");
  }
  
  if (section && formattedSub) {
    return `${section} : ${formattedSub}`;
  }
  return formattedSub || "Mock Test Question";
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
          name={q.name}
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
          name={q.name}
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
          name={q.name}
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
          name={q.name}
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
          name={q.name}
        />
      );

    case "mc_multiple":
      return (
        <MultipleChoiceMulti
          key={id}
          paragraphs={q.text}
          // questionText={q.questionText}
          options={q.options}
          name={q.name}
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
          name={q.name}
          onNext={onNext}
        />
      );

    case "reorder_paragraphs":
      return <ReorderParagraphs key={id} items={q.options} name={q.name} onNext={onNext} />;

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
          name={q.name}
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
          type={sub.replace(/_/g, '-')}
          audioSrc={q.audio}
          options={q.options}
          text={q.text}
          name={q.name}
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
          name={q.name}
          onNext={onNext}
        />
      );

    case "highlight_incorrect_words":
      return (
        <AudioHighlightBox
          key={id}
          audioSrc={q.audio}
          text={q.text}
          name={q.name}
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
