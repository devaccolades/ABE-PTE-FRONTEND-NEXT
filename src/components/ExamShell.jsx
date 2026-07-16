"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useExamStore } from "@/store";

// Primary responsibility: Orchestrates the exam runtime (fetch current question, persist/rehydrate session, submit answers).
// Architecture role: Coordinates global store state with per-question components and backend pagination/navigation.

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

/**
 * @description Top-level exam container responsible for loading questions, persisting exam session state,
 * coordinating timers, and submitting answers before routing to the next question.
 *
 * Exam lifecycle (high level):
 * - Session rehydrates from localStorage (`sessionId`, current/next question URLs, remaining section time).
 * - A "heartbeat" distinguishes hard closes vs refresh to avoid stale local exam state.
 * - `loadQuestion()` fetches the current question, updates global state, and initializes section timers.
 * - `handleModalNext()` submits the current answer and then navigates using `nextQuestionUrl` pagination.
 *
 * @param {Object} props - Component props.
 * @param {any[]} props.mocktestList - Mock test list passed down for name-gating / selection flows.
 * @returns {JSX.Element} Rendered exam experience or gating/completion screens.
 */
export default function ExamShell({ mocktestList }) {
  const {
    sessionId,
    setSessionId,
    baseUrl,
    // Global lifecycle controls from the exam store:
    // - `phase`: current question interaction phase (prep/recording/typing/etc.) that gates actions like "Next".
    // - `stopSignal`: broadcast flag used to tell active question components to stop (finalize recording/timers) before submit.
    // - `nextQuestion`: backend pagination "next" URL that drives question-to-question navigation.
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
  const [examCompleted, setExamCompleted] = useState(false);
  const [timeSpent, setTimeSpent] = useState("00:00:00");

  const { startExam, setStartExam } = useExamStore();

  // Record exam start time in localStorage the first time startExam flips to true.
  useEffect(() => {
    if (startExam) {
      if (!localStorage.getItem("exam_start_time")) {
        localStorage.setItem("exam_start_time", String(Date.now()));
      }
    }
  }, [startExam]);

  // Submission lock: prevents duplicate submissions caused by double-clicks, fast re-renders, or timer-triggered auto-submit.
  const isSubmittingRef = useRef(false);
  const handleModalNextRef = useRef(null);

  /**
   * @description Clears all exam-related localStorage keys used for refresh survival and session resume.
   * @returns {void}
   */
  const clearExamLocalStorage = useCallback(() => {
    const keysToClear = [
      "exam_session_id",
      "exam_user_name",
      "current_question",
      "next_question",
      "exam_remaining_time",
      "exam_remaining_time_section",
      "exam_heartbeat",
      "exam_completed",
      "exam_completed_at",
      "exam_start_time",
      "startExam",
      // keep section_time_left for old timer logic too
      "section_time_left",
    ];
    keysToClear.forEach((k) => localStorage.removeItem(k));
  }, []);

  const persistCompletedExam = useCallback((completedAt = null) => {
    localStorage.setItem("exam_completed", "true");
    if (completedAt) {
      localStorage.setItem("exam_completed_at", completedAt);
    }
    [
      "current_question",
      "next_question",
      "exam_remaining_time",
      "exam_remaining_time_section",
      "section_time_left",
    ].forEach((key) => localStorage.removeItem(key));

    // Compute actual time spent from the stored start timestamp.
    const startTime = parseInt(localStorage.getItem("exam_start_time") || "0", 10);
    if (startTime > 0) {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const hh = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0");
      const mm = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0");
      const ss = String(elapsedSeconds % 60).padStart(2, "0");
      setTimeSpent(`${hh}:${mm}:${ss}`);
    }

    setExamCompleted(true);
    setCurrentQuestion(null);
    setLoading(false);
  }, []);

  const completeSession = useCallback(async () => {
    let lastError = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(`${baseUrl}complete-session/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const payload = await response.json().catch(() => ({}));

        const completedSession = payload.session || payload;
        const isCompleted = Boolean(
          payload.is_completed ?? completedSession?.is_completed,
        );

        if (!response.ok || !isCompleted) {
          console.error("Complete session failed:", {
            status: response.status,
            payload,
          });
          throw new Error(payload.error || "Could not complete the exam session.");
        }

        persistCompletedExam(completedSession.completed_at || payload.completed_at);
        return payload;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error("Could not complete the exam session.");
  }, [baseUrl, sessionId, persistCompletedExam]);

  // Heartbeat: helps distinguish "refresh" vs "tab closed then revisit"
  useEffect(() => {
    const now = Date.now();
    const lastBeat = parseInt(
      localStorage.getItem("exam_heartbeat") || "0",
      10,
    );

    let navType = "unknown";
    try {
      const navEntry = performance.getEntriesByType("navigation")?.[0];
      if (navEntry && typeof navEntry.type === "string")
        navType = navEntry.type;
    } catch {
      // ignore
    }

    const isStale = !lastBeat || now - lastBeat > 30_000;

    // Why this exists: localStorage persists across browser restarts and tab closes.
    // If we detect a "navigate" into the app after the heartbeat is stale, we assume prior exam state is not reliable
    // and proactively clear it to prevent resuming an outdated session.
    // If this is a fresh navigation and prior heartbeat is stale,
    // assume previous tab was closed and clear any stale exam state.
    if (navType === "navigate" && isStale) {
      clearExamLocalStorage();
    }

    localStorage.setItem("exam_heartbeat", String(Date.now()));
    // Keep the heartbeat fresh while this tab is alive so a normal refresh does not get treated as a stale revisit.
    const id = setInterval(() => {
      localStorage.setItem("exam_heartbeat", String(Date.now()));
    }, 5_000);

    return () => clearInterval(id);
  }, [clearExamLocalStorage]);

  useEffect(() => {
    // Refresh survival: restore the candidate name if the store was reset but localStorage still has it.
    if (!userName) {
      const storedName = localStorage.getItem("exam_user_name");
      if (storedName) setUserName(storedName);
    }
  }, [userName, setUserName]);

  /**
   * @description Fetches the next question when a section timer expires and backend requires a "timer-exceeded" jump.
   * This function polls until the backend provides a `next` URL.
   *
   * @returns {Promise<string|null>} Next question URL or null if the request fails.
   */
  const sectionJump = async (attempts = 0) => {
    if (attempts > 5) return null;

    const response = await fetch(
      `${baseUrl}question/?session_id=${sessionId}`,
      {
        method: "GET",
        headers: { "timer-exceeded": "true" },
      },
    );

    console.log("response is", response);

    if (!response.ok) return null;

    const data = await response.json();
    console.log("data is", data);
    console.log("response.url", response.url);

    // Backend may need time to calculate the next question after a forced section jump.
    // We poll briefly to avoid advancing to a null/undefined URL.
    if (data.is_completed) {
      return null;
    }

    if (!data.next) {
      await new Promise((r) => setTimeout(r, 500));
      return sectionJump(attempts + 1);
    }

    setNextQuestion(data.next);
    return response.url;
  };

  useEffect(() => {
    // Persisted exam-start gate: allows refresh without returning the candidate to the pre-exam screen.
    const savedStatus = localStorage.getItem("startExam");
    if (savedStatus === "true") {
      setStartExam(true);
    }
  }, [setStartExam]);

  /**
   * @description Loads a question from the backend and initializes store state for the new question.
   * Also persists resume URLs and section timer state for refresh survival.
   *
   * @param {string|null|undefined} targetUrl - Fully-qualified URL for the question endpoint to fetch.
   * @returns {Promise<void>}
   */
  const loadQuestion = useCallback(
    async (targetUrl) => {
      if (!targetUrl) {
        setCurrentQuestion(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(targetUrl);
        if (!res.ok) {
          if (res.status === 404) {
            await completeSession();
            return;
          }
          throw new Error("Failed to fetch question");
        }
        const data = await res.json();

        const q = data?.results?.[0];
        if (!q) {
          await completeSession();
          return;
        }

        // Console log Reading section question data when fetched
        const isReadingQuestion =
          q.mocktest_section?.section_name?.toLowerCase().includes("reading") ||
          [
            "fib_dropdown",
            "fib_drag_drop",
            "mc_multiple",
            "mc_single",
            "reorder_paragraphs",
            "mcq-multi",
            "mcq-single",
            "reorder-paragraphs",
          ].includes(q.subsection);

        if (isReadingQuestion) {
          console.log("📖 [API Fetch] Loaded Reading Question Data:", q);
        }

        // Reset per-question global flags before handing off to the next question component.
        setStopSignal(false);
        setPhase("prep");
        resetAnswer();

        setCurrentQuestion(q);
        setQuestionSection(q.mocktest_section.section_name);
        setNextQuestion(data.next);

        // Persist resume pointers so the candidate can refresh without losing their place.
        localStorage.setItem("current_question", targetUrl);
        localStorage.setItem("next_question", data.next);
        localStorage.setItem("startExam", startExam);

        const newSectionName = q.mocktest_section.section_name;
        const isWritingQuestion =
          q.subsection === "write_essay" ||
          q.subsection === "summarize_written_text";

        if (
          q.mocktest_section.section_name !== questionSection ||
          isWritingQuestion
        ) {
          const isListeningSection = newSectionName
            ?.toLowerCase()
            .includes("listening");

          const newSectionTotal =
            isWritingQuestion && Number.isFinite(q.answering_time)
              ? q.answering_time
              : isListeningSection
                ? Math.max(0, q.mocktest_section.total_duration - 600)
                : q.mocktest_section.total_duration;

          // If we have a persisted timer for THIS section, prefer it (refresh survival).
          // But for writing questions, always use the current question's answering_time.
          const persistedSection = localStorage.getItem(
            "exam_remaining_time_section",
          );
          const persistedTimeRaw = localStorage.getItem("exam_remaining_time");
          const persistedTime =
            persistedTimeRaw !== null ? parseInt(persistedTimeRaw, 10) : NaN;

          const shouldUsePersisted =
            !isWritingQuestion &&
            persistedSection === newSectionName &&
            Number.isFinite(persistedTime) &&
            persistedTime >= 0;

          setQuestionSection(newSectionName);
          setQuestionTimer(newSectionTotal);

          const nextRemaining = shouldUsePersisted
            ? persistedTime
            : newSectionTotal;

          setRemainingTime(nextRemaining);

          // Section reset: if this is a natural new section, persist the new total immediately.
          // If it's a refresh in the same section, we keep the persisted value.
          localStorage.setItem("exam_remaining_time", String(nextRemaining));
          localStorage.setItem("exam_remaining_time_section", newSectionName);
          // Clear the local precise timer so the new question component picks up the new global time
          localStorage.removeItem("section_time_left");
        }

        // Ensure the outgoing answer payload contains stable metadata needed by the backend for submission.
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
      completeSession,
    ],
  );

  useEffect(() => {
    // Rehydration: restore the session id and display name from localStorage for refresh survival.
    const storedSession = localStorage.getItem("exam_session_id");
    const storedName = localStorage.getItem("exam_user_name");
    const storedCompleted = localStorage.getItem("exam_completed") === "true";
    if (storedSession && !sessionId) setSessionId(storedSession);
    if (storedName) setDisplayName(storedName);
    if (storedCompleted) {
      setExamCompleted(true);
      setLoading(false);
    }

    // Hydrate remaining time from persisted value (refresh survival)
    const persistedTimeRaw = localStorage.getItem("exam_remaining_time");
    const persistedTime =
      persistedTimeRaw !== null ? parseInt(persistedTimeRaw, 10) : NaN;
    if (Number.isFinite(persistedTime) && persistedTime >= 0) {
      setRemainingTime(persistedTime);
    }

    setRehydrated(true);
  }, [sessionId, setSessionId, setRemainingTime]);

  useEffect(() => {
    // Only attempt to load questions after store state has been rehydrated and we have a session id available.
    if (!rehydrated || !sessionId || examCompleted) return;
    const resumeUrl = localStorage.getItem("current_question");
    loadQuestion(
      resumeUrl || `${baseUrl}get-question/?session_id=${sessionId}`,
    );
  }, [rehydrated, sessionId, baseUrl, loadQuestion, examCompleted]);

  // Persist remainingTime whenever it updates (separate from 10-min local timers)
  useEffect(() => {
    // Why this exists: section timers may run in components; persisting here centralizes refresh survival.
    if (!Number.isFinite(remainingTime)) return;
    localStorage.setItem("exam_remaining_time", String(remainingTime));
    if (questionSection) {
      localStorage.setItem(
        "exam_remaining_time_section",
        String(questionSection),
      );
    }
  }, [remainingTime, questionSection]);

  // --- Submission Logic ---
  /**
   * @description Submits the current answer, advances to the next question, and handles forced section-jump flows.
   * This is invoked both by the "Next" confirmation modal and by timer-expiry auto-advance.
   *
   * @returns {Promise<void>}
   */
  const handleModalNext = async () => {
    // Guard: do not allow concurrent submissions (manual click + timer expiry or double clicks).
    if (isSubmittingRef.current) return;
    
    const initialAnswer = useExamStore.getState().answer;
    // Guard: Prevent double-submission of an empty/reset answer payload
    if (!initialAnswer || !initialAnswer.question_name) {
      console.log("handleModalNext blocked: empty question_name. Likely double-trigger.");
      return;
    }

    isSubmittingRef.current = true;

    setCallAreYouSure(false);

    const currentPhase = useExamStore.getState().phase;

    if (currentPhase === "recording" || currentPhase === "prep") {
      // When leaving a recording/prep phase, broadcast a stop signal so the active question component can finalize.
      setStopSignal(true);
      setLoading(true);
    }

    if (currentQuestion?.ai_input_type === "audio") {
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
        isSubmittingRef.current = false;
        window.alert(
          "Your recording could not be saved. Please check microphone access and record this answer again.",
        );
        return;
      }
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

    // Console log Reading section question answer when submitted
    const isReadingQuestion =
      currentQuestion?.mocktest_section?.section_name
        ?.toLowerCase()
        .includes("reading") ||
      [
        "fib_dropdown",
        "fib_drag_drop",
        "mc_multiple",
        "mc_single",
        "reorder_paragraphs",
        "mcq-multi",
        "mcq-single",
        "reorder-paragraphs",
      ].includes(currentQuestion?.subsection);

    if (isReadingQuestion) {
      console.log("📝 [API Submit] Submitting Reading Answer:", {
        question_name: finalAnswer.question_name,
        answer: finalAnswer.answer,
      });
    }

    try {
      const postRes = await fetch(`${baseUrl}user-response/`, {
        method: "POST",
        body: formData,
      });

      if (!postRes.ok) {
        const payload = await postRes.json().catch(() => ({}));
        throw new Error(payload.error || "Submission failed");
      }
      const submission = await postRes.json();

      setStopSignal(false);
      resetAnswer();

      if (isTimeExpired) {
        // console.log("Section timer expired");
        // Timer expiry path: backend may require a special jump to the correct next question for the next section.
        const jumpedNextUrl = await sectionJump();
        console.log(
          "Jumped to next question URL after timer expiry:",
          jumpedNextUrl,
        );

        if (jumpedNextUrl) {
          await loadQuestion(jumpedNextUrl);
        } else {
          await completeSession();
        }

        // Reset the expiry flag after handling so we don't repeatedly auto-advance on subsequent renders.
        useExamStore.getState().setIsTimeExpired(false);

        return;
      }

      if (nextQuestionUrl) {
        await loadQuestion(nextQuestionUrl);
      } else {
        if (submission.session?.is_completed) {
          persistCompletedExam(submission.session.completed_at);
        } else {
          await completeSession();
        }
      }
    } catch (error) {
      console.error("Submission Error:", error);
      window.alert(error.message || "Submission failed. Please try again.");
      setLoading(false);
      setStopSignal(false);
    } finally {
      // Release submission lock after success/failure to allow the candidate to retry or proceed.
      isSubmittingRef.current = false;
    }
  };

  useEffect(() => {
    handleModalNextRef.current = handleModalNext;
  });

  // Auto‑advance when a speaking/recording question finishes (global phase === "finished")
  useEffect(() => {
    if (phase === "finished" && !isSubmittingRef.current) {
      handleModalNextRef.current?.();
    }
  }, [phase]);

  useEffect(() => {
    // Auto-advance when the section timer expires. Using a timeout avoids calling submission logic during render.
    if (!isTimeExpired) return;

    const id = setTimeout(() => {
      handleModalNextRef.current?.();
    }, 0);

    return () => clearTimeout(id);
  }, [isTimeExpired]);

  if (!displayName) return <NameGate mocktestList={mocktestList} />;
  if (loading && !currentQuestion) return <ExamLoadingSkeleton />;
  if (!startExam) return <PreExam />;
  if (examCompleted) return <ExamCompleteScreen userName={userName} timeSpent={timeSpent} />;
  if (!currentQuestion) return <ExamLoadingSkeleton />;

  return (
    <>
      <Card className="w-full max-w-6xl mx-auto shadow-lg border-none md:border sm:rounded-xl rounded-none my-8 ">
        {/* Header: Adjusted padding and text size for mobile */}
        <CardHeader className="bg-slate-50 p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 w-full">
            <CardTitle className="text-sky-800 text-lg md:text-xl">
              {titleFor(currentQuestion)}
            </CardTitle>
            <div className="text-xs md:text-sm text-gray-500">
              Candidate:{" "}
              <span className="font-bold text-gray-700">{userName}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {/* Instruction: Responsive font size and margin */}
          <h2 className="font-bold text-base md:text-lg mb-3 md:mb-4 leading-tight">
            {currentQuestion.subsection_instruction}
          </h2>
          <Separator className="mb-4 md:mb-5" />

          {/* Question Container: Flexible height */}
          <div className="min-h-[200px] md:min-h-[250px]">
            {renderQuestionComponent(
              currentQuestion,
              handleModalNext,
              remainingTime,
            )}
          </div>

          {/* Footer: Full-width button on mobile for better thumb reach */}
          <div className="mt-6 pt-4 border-t flex justify-end">
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
 * @description Consolidated router that selects the appropriate question component using `q.subsection`.
 * @param {any} q - Current question payload from backend.
 * @param {Function} onNext - Callback to submit and advance to the next question.
 * @param {number} remainingTime - Current remaining section time (seconds) for timed writing/listening tasks.
 * @returns {JSX.Element} The rendered question component for the given payload.
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
          type={q.subsection}
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

/**
 * @description Maps backend subsection codes to display titles for the UI header.
 * @param {string} sub - Backend subsection identifier (e.g., "read_aloud", "mc_single").
 * @returns {string} Human-friendly title string for the current question type.
 */
function titleFor(q) {
  if (!q) return "Mock Test Question";
  
  const section = q.mocktest_section?.section_name || "";
  const sub = q.subsection || "";

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
 * @description Lightweight skeleton UI displayed while the first question is loading.
 * @returns {JSX.Element} Loading placeholder UI.
 */
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
