"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useExamStore } from "@/store";

// Components
import ReadAloud from "@/components/questions/ReadAloud";
import WriteEssay from "@/components/questions/WriteEssay";
import FillBlanksDropdown from "@/components/questions/FillBlanksDropdown";
import MultipleChoiceMulti from "@/components/questions/MultipleChoiceMulti";
import ReorderParagraphs from "@/components/questions/ReorderParagraphs";
import RetellLecture from "./questions/RetellLecture";
import DescribeImage from "./questions/DescribeImage";
import MultipleChoiceSingle from "./questions/MultipleChoiceSingle";
import SummerizeTheEssay from "./questions/SummerizeTheEssay";
import AudioToMCQ from "./questions/AudioToMCQ";
import FillBlanksTyped from "./questions/FillBlanksTyped";
import AudioHighlightBox from "./questions/AudioHighlightBox";
import AreyousureModal from "./modals/AreyousureModal";
import NotificationMessage from "./sections/NotificationMessage";
import CategoryMessage from "./sections/CategoryMessage";
import NameGate from "./NameGate";

// UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import FillBlanksDragDrop from "./questions/FillBlanksDragDrop";
import SummarizeTheText from "./questions/SummarizeTheText";
import ExamCompleteScreen from "./ui/ExamCompleteScreen";
import PTEReadinessCheck from "./questions/PTEReadinessCheck";
import PreExam from "./questions/PreExam";

export default function ExamShell({ mocktestList }) {
  const {
    sessionId,
    setSessionId,
    baseUrl,
    phase,
    setPhase,
    setAnswerKey,
    nextQuestion: nextQuestionUrl,
    setNextQuestion,
    setStopSignal,
    resetAnswer,
  } = useExamStore();

  const userName = useExamStore((state) => state.userName);
  const setUserName = useExamStore((s) => s.setUserName);
  const isTimeExpired = useExamStore((s) => s.isTimeExpired);
  const setIsTimeExpired = useExamStore((s) => s.setIsTimeExpired);

  const questionSection = useExamStore((state) => state.questionSection);
  const setQuestionSection = useExamStore((state) => state.setQuestionSection);
  const setQuestionTimer = useExamStore((state) => state.setQuestionTimer);
  const setRemainingTime = useExamStore((state) => state.setRemainingTime);
  const remainingTime = useExamStore((state) => state.remainingTime);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callAreYouSure, setCallAreYouSure] = useState(false);
  const [rehydrated, setRehydrated] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const { startExam, setStartExam } = useExamStore();

  // 🔒 ADDITION: submission lock
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!userName) {
      const storedName = localStorage.getItem("exam_user_name");
      if (storedName) setUserName(storedName);
    }
  }, [userName, setUserName]);

  const sectionJump = async () => {
    const response = await fetch(
      `${baseUrl}question/?session_id=${sessionId}`,
      {
        method: "GET",
        headers: { "timer-exceeded": "true" },
      },
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.next) {
      await new Promise((r) => setTimeout(r, 500));
      return sectionJump();
    }

    setNextQuestion(data.next);
    return data.next;
  };

  useEffect(() => {
    const savedStatus = localStorage.getItem("startExam");
    if (savedStatus === "true") {
      setStartExam(true);
    }
  }, [setStartExam]);

  const loadQuestion = useCallback(
    async (targetUrl) => {
      if (!targetUrl) {
        setCurrentQuestion(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error("Failed to fetch question");
        const data = await res.json();

        const q = data.results[0];
        if (!q) {
          setCurrentQuestion(null);
          return;
        }

        setStopSignal(false);
        setPhase("prep");
        resetAnswer();

        setCurrentQuestion(q);
        setQuestionSection(q.mocktest_section.section_name);
        setNextQuestion(data.next);

        localStorage.setItem("current_question", targetUrl);
        localStorage.setItem("next_question", data.next);
        localStorage.setItem("startExam", startExam);

        if (q.mocktest_section.section_name !== questionSection) {
          setQuestionSection(q.mocktest_section.section_name);
          setQuestionTimer(q.mocktest_section.total_duration);
          setRemainingTime(q.mocktest_section.total_duration);
        }

        setAnswerKey("session_id", sessionId);
        setAnswerKey("question_name", q.name);
        setPhase("prep");
      } catch (error) {
        console.error("Load Question Error:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      sessionId,
      setAnswerKey,
      setNextQuestion,
      setQuestionSection,
      setQuestionTimer,
      setRemainingTime,
      questionSection,
      setPhase,
    ],
  );

  useEffect(() => {
    const storedSession = localStorage.getItem("exam_session_id");
    const storedName = localStorage.getItem("exam_user_name");
    if (storedSession && !sessionId) setSessionId(storedSession);
    if (storedName) setDisplayName(storedName);
    setRehydrated(true);
  }, [sessionId, setSessionId]);

  useEffect(() => {
    if (!rehydrated || !sessionId) return;
    const resumeUrl = localStorage.getItem("current_question");
    loadQuestion(
      resumeUrl || `${baseUrl}get-question/?session_id=${sessionId}`,
    );
  }, [rehydrated, sessionId, baseUrl, loadQuestion]);

  // --- Submission Logic ---
  const handleModalNext = async () => {
    // 🔒 ADDITION: guard
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setCallAreYouSure(false);

    const currentPhase = useExamStore.getState().phase;

    if (currentPhase === "recording" || currentPhase === "prep") {
      setStopSignal(true);
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const finalAnswer = useExamStore.getState().answer;

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("question_name", finalAnswer.question_name);

    if (finalAnswer.answer_audio instanceof Blob) {
      formData.append("answer_audio", finalAnswer.answer_audio, "answer.webm");
    }

    if (finalAnswer.answer !== undefined && finalAnswer.answer !== null) {
      const answerVal =
        typeof finalAnswer.answer === "object"
          ? JSON.stringify(finalAnswer.answer)
          : finalAnswer.answer;
      formData.append("answer", answerVal);
    }

    try {
      const postRes = await fetch(`${baseUrl}user-response/`, {
        method: "POST",
        body: formData,
      });

      if (!postRes.ok) throw new Error("Submission Failed");

      setStopSignal(false);
      resetAnswer();

      if (isTimeExpired) {
        const jumpedNextUrl = await sectionJump();

        if (jumpedNextUrl) {
          await loadQuestion(jumpedNextUrl);
        } else {
          setLoading(false);
          setCurrentQuestion(null);
        }

        // ✅ RESET HERE (IMPORTANT)
        useExamStore.getState().setIsTimeExpired(false);

        return;
      }

      if (nextQuestionUrl) {
        loadQuestion(nextQuestionUrl);
      } else {
        setLoading(false);
        setCurrentQuestion(null);
      }
    } catch (error) {
      console.error("Submission Error:", error);
      setLoading(false);
      setStopSignal(false);
    } finally {
      // 🔓 ADDITION: release lock
      isSubmittingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isTimeExpired) return;

    const id = setTimeout(() => {
      handleModalNext();
    }, 0);

    return () => clearTimeout(id);
  }, [isTimeExpired, handleModalNext]);

  if (!displayName) return <NameGate mocktestList={mocktestList} />;
  if (loading && !currentQuestion) return <ExamLoadingSkeleton />;
  if (!startExam) return <PreExam />;
  if (!currentQuestion) return <ExamCompleteScreen userName={userName} />;

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto shadow-lg border-none md:border sm:rounded-xl rounded-none">
        {/* Header: Adjusted padding and text size for mobile */}
        <CardHeader className="bg-slate-50 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 w-full">
            <CardTitle className="text-sky-800 text-lg md:text-xl">
              {titleFor(currentQuestion.subsection)}
            </CardTitle>
            <div className="text-xs md:text-sm text-gray-500">
              Candidate:{" "}
              <span className="font-bold text-gray-700">{userName}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-8">
          {/* Instruction: Responsive font size and margin */}
          <h2 className="font-bold text-base md:text-lg mb-3 md:mb-4 leading-tight">
            {currentQuestion.subsection_instruction}
          </h2>
          <Separator className="mb-4 md:mb-6" />

          {/* Question Container: Flexible height */}
          <div className="min-h-[200px] md:min-h-[250px]">
            {renderQuestionComponent(
              currentQuestion,
              handleModalNext,
              remainingTime,
            )}
          </div>

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
    </>
  );
}

/**
 * Consolidated Router using ONLY q.subsection
 */
function renderQuestionComponent(q, onNext, remainingTime) {
  const id = q.id;
  const sub = q.subsection;

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

function ExamLoadingSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto p-10 bg-white rounded-xl animate-pulse shadow-sm border border-gray-100">
      {/* Title Bar Placeholder */}
      <div className="h-8 w-1/3 bg-gray-200 rounded mb-6"></div>

      {/* Main Content Area Placeholder */}
      <div className="space-y-4">
        <div className="h-40 w-full bg-gray-100 rounded"></div>
        <div className="h-4 w-full bg-gray-100 rounded"></div>
        <div className="h-4 w-5/6 bg-gray-100 rounded"></div>
      </div>

      {/* Button Placeholder */}
      <div className="mt-10 flex justify-end">
        <div className="h-10 w-28 bg-gray-200 rounded-md"></div>
      </div>
    </div>
  );
}

// ... ExamLoadingSkeleton and ExamCompleteScreen remain the same ...
