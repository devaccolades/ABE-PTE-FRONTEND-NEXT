"use client";
import { useEffect, useState, useCallback } from "react";
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

export default function ExamShell({ mocktestList }) {
  const {
    userName,
    sessionId,
    setSessionId,
    baseUrl,
    phase,
    setPhase,
    setAnswerKey,
    nextQuestion: nextQuestionUrl,
    setNextQuestion,
    setQuestionSection,
    setQuestionTimer,
    setRemainingTime,
    setStopSignal,
    questionSection,
  } = useExamStore();

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callAreYouSure, setCallAreYouSure] = useState(false);
  const [rehydrated, setRehydrated] = useState(false);
  const [displayName, setDisplayName] = useState("");

  // --- 1. Consolidated Loader ---
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

        setCurrentQuestion(q);
        console.log("current Question", q);
        console.log("next Question URL", data.next);
        setNextQuestion(data.next);

        localStorage.setItem("current_question", targetUrl);
        localStorage.setItem("next_question", data.next);

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
    ]
  );

  // --- 2. Rehydration ---
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
      resumeUrl || `${baseUrl}get-question/?session_id=${sessionId}`
    );
  }, [rehydrated, sessionId, baseUrl, loadQuestion]);

  // --- 3. Submission Logic ---
  const handleModalNext = async () => {
    setStopSignal(true);
    setCallAreYouSure(false);

    // 1. Immediately clear the UI to show the skeleton
    setCurrentQuestion(null);
    setLoading(true);

    // 2. Buffer for Audio/State finalization
    await new Promise((resolve) => setTimeout(resolve, 500));

    const finalAnswer = useExamStore.getState().answer;
    console.log("answer", finalAnswer);
    const formData = new FormData();
    formData.append("session_id", finalAnswer.session_id);
    formData.append("question_name", finalAnswer.question_name);

    if (finalAnswer.answer_audio instanceof Blob) {
      formData.append("answer_audio", finalAnswer.answer_audio, "answer.webm");
    }

    if (finalAnswer.answer !== undefined) {
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

      // --- CRITICAL STEP ---
      // Clear the answer key in the store so the NEXT question
      // doesn't inherit the OLD answer/audio.
      setAnswerKey("answer", {});
      setAnswerKey("answer_audio", null);

      if (nextQuestionUrl) {
        // Adding a tiny delay here ensures the backend has
        // fully committed the previous response to the DB.
        setTimeout(() => {
          loadQuestion(nextQuestionUrl);
        }, 100);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Submission Error:", error);
      alert("Failed to save answer.");
      setLoading(false);
      // Optional: Restore current question if fetch fails so user can retry
    }
  };

  if (!displayName) return <NameGate mocktestList={mocktestList} />;
  if (loading && !currentQuestion) return <ExamLoadingSkeleton />;
  if (!currentQuestion) return <ExamCompleteScreen userName={userName} />;

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto shadow-lg border-none">
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-sky-800">
            {titleFor(currentQuestion.subsection)}
          </CardTitle>
          <div className="text-sm text-gray-500">
            Candidate:{" "}
            <span className="font-bold text-gray-700">{userName}</span>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">
            {currentQuestion.subsection_instruction}
          </h2>
          <Separator className="mb-6" />

          <div className="min-h-[250px]">
            {renderQuestionComponent(currentQuestion, handleModalNext)}
          </div>

          <div className="mt-8 pt-4 border-t flex justify-end">
            <button
              disabled={phase === "prep"}
              onClick={() => setCallAreYouSure(true)}
              className={`px-8 py-2 rounded-md font-bold transition-all ${
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
function renderQuestionComponent(q, onNext) {
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
          videoUrl={q.video}
          prepSeconds={q.reading_time}
          recordSeconds={q.answering_time}
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
          durationSeconds={q.reading_time}
          onNext={onNext}
        />
      );

    case "audio-to-text":
    case "Write-from-Dictation":
      return (
        <SummerizeTheEssay
          key={id}
          output={q.output}
          prepSeconds={q.prepSeconds}
          onNext={onNext}
        />
      );

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

    case "highlight-incorrect-words":
      return (
        <AudioHighlightBox
          key={id}
          audioSrc={q.output}
          text={q.prompt}
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
    fib_dropdown: "Reading: Fill in the Blanks",
    retell_lecture: "Speaking: Retell Lecture",
    repeat_sentence: "Speaking: Repeat Sentence",
    "mcq-multi": "Reading: Multiple Choice (Multiple)",
    "mcq-single": "Reading: Multiple Choice (Single)",
    "reorder-paragraphs": "Reading: Reorder Paragraphs",
    "Write-from-Dictation": "Listening: Write from Dictation",
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
