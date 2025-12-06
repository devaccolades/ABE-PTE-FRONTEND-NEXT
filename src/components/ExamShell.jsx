"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useExamStore, apiClient } from "@/store";
import ReadAloud from "@/components/questions/ReadAloud";
import WriteEssay from "@/components/questions/WriteEssay";
import FillBlanksDropdown from "@/components/questions/FillBlanksDropdown";
import MultipleChoiceMulti from "@/components/questions/MultipleChoiceMulti";
import ReorderParagraphs from "@/components/questions/ReorderParagraphs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import FillBlanksDragDrop from "./questions/FillBlanksDragDrop";
import RetellLecture from "./questions/RetellLecture";
import DescribeImage from "./questions/DescribeImage";
import MultipleChoiceSingle from "./questions/MultipleChoiceSingle";
import NotificationMessage from "./sections/NotificationMessage";
import CategoryMessage from "./sections/CategoryMessage";
import SummerizeTheEssay from "./questions/SummerizeTheEssay";
import AudioToMCQ from "./questions/AudioToMCQ";
import FillBlanksTyped from "./questions/FillBlanksTyped";
import AudioToMCQRadio from "./questions/AudioToMCQRadio";
import AudioHighlightBox from "./questions/AudioHighlightBox";
import AreyousureModal from "./modals/AreyousureModal";
import next from "next";

export default function ExamShell() {
  const userName = useExamStore((s) => s.userName);
  const questionIndex = useExamStore((s) => s.questionIndex);
  // const nextQuestion = useExamStore((s) => s.nextQuestion);
  const sessionId = useExamStore((s) => s.sessionId);
  const url = useExamStore((s) => s.baseUrl);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const setNextQuestion = useExamStore((s) => s.setNextQuestion);
  const [areYouSure, setAreYouSure] = useState(false);
  const [callAreYouSure, setCallAreYouSure] = useState(false);
  const nextPhase = useExamStore((s) => s.phase);
  const setAnswerKey = useExamStore((state) => state.setAnswerKey);
  const answer = useExamStore((state) => state.answer);
  const nextQuestionStore = useExamStore((s) => s.nextQuestion);
  const setPhase = useExamStore((s) => s.setPhase);

  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   let mounted = true;
  //   (async () => {
  //     const start = Date.now();
  //     const data = await apiClient.fetchExam();
  //     const MIN_LOAD_MS = 500;
  //     const elapsed = Date.now() - start;
  //     const remaining = Math.max(0, MIN_LOAD_MS - elapsed);
  //     setTimeout(() => {
  //       if (!mounted) return;
  //       setExam(data);
  //       setLoading(false);
  //     }, remaining);
  //   })();
  //   return () => {
  //     mounted = false;
  //   };
  // }, []);

  useEffect(() => {
    if (!sessionId) return;
    console.log(sessionId, "session_id");
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${url}get-question/?session_id=${sessionId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch questions");
        }
        const data = await res.json();
        setCurrentQuestion(data.results[0]);
        setNextQuestion(data.next);
        setAnswerKey("session_id", sessionId);
        setAnswerKey("question_name", data.results[0].name);
        setLoading(false);
        console.log("Fetched questions:", data);
      } catch (error) {
        console.error("Error fetching questions:", error);
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [sessionId]);

  useEffect(() => {
    if (currentQuestion !== null) {
      console.log(currentQuestion.subsection, "currentQuestion");
    }
  }, [currentQuestion]);

  const onClose = () => {
    setCallAreYouSure(false);
    setAreYouSure(false);
  };

  const onNext = () => {
    setPhase("prep");
    setCallAreYouSure(false);
    handleModalNext();
  };

  const handleNext = () => {
    setCallAreYouSure(true);
  };

  const handleModalNext = async () => {
    // We need the answer at this exact moment
    const currentAnswer = useExamStore.getState().answer;
    const currentAnswerAudioBlob = currentAnswer.answer_audio; // Get the Blob

    useExamStore.getState().setStopSignal(true);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Re-fetch the final state of the answer object after the potential delay
    const finalAnswerAfterStop = useExamStore.getState().answer;
    const finalAudioBlob = finalAnswerAfterStop.answer_audio;

    console.log(finalAnswerAfterStop, "final answer after stop");

    // Check if the Blob exists before proceeding
    if (!finalAudioBlob || !(finalAudioBlob instanceof Blob)) {
      console.error(
        "Answer submission failed: Audio Blob is missing or invalid."
      );
      // You should handle this user-facing (e.g., show an error message)
      setLoading(false);
      return;
    }
    // 2. BUILD THE FormData OBJECT
    const formData = new FormData();

    formData.append("answer_audio", finalAudioBlob, "answer.webm");
    formData.append("session_id", finalAnswerAfterStop.session_id);
    formData.append("question_name", finalAnswerAfterStop.question_name);
    formData.append("answer", finalAnswerAfterStop.answer || "");

    // C. Append fields from the NESTED 'answer' object
    // -----------------------------------------------------------
    const nestedAnswer = finalAnswerAfterStop.answer;
    if (nestedAnswer && typeof nestedAnswer === "object") {
      // Iterate over the key-value pairs inside the nested 'answer' object
      for (const key in nestedAnswer) {
        if (Object.prototype.hasOwnProperty.call(nestedAnswer, key)) {
          // Ensure the value is not a complex object/array itself before converting to string
          const value = nestedAnswer[key];
          // You might need to adjust the value formatting depending on the data type
          if (value !== null && value !== undefined) {
            // Append the key/value pair. e.g., 'text_response': 'The quick brown fox...'
            formData.append(key, String(value));
          }
        }
      }
    }

    setLoading(true);
    try {
      // 3a. POST current answer
      console.log(formData, "current answer formdata");
      const postRes = await fetch(`${url}user-response/`, {
        method: "POST",
        body: formData,
      });

      if (!postRes.ok) {
        const errorText = await postRes.text();
        throw new Error(
          `Failed to post answer: ${postRes.status} - ${errorText}`
        );
      }

      console.log(postRes, "Answer posted successfully.");

      // 4. UPDATE Parent/Store State for the Next Question
      // setCurrentQuestion(data.results[0]);
      // setNextQuestion(data.next); // Update the store's 'next' state
      // setAnswerKey("question_name", data.results[0].name);
      setCurrentQuestion(null);

      // 5. Close the Modal
      onClose();
    } catch (error) {
      console.error("Error during Next Question process:", error);
    } finally {
      setLoading(false);
    }
    fetchNextQuestion();
  };

  const fetchNextQuestion = async () => {
    setLoading(true);
    if (!sessionId) return;
    try {
      console.log(nextQuestionStore, "next question store");
      const res = await fetch(nextQuestionStore);

      if (!res.ok) {
        throw new Error("Failed to fetch next question");
      }

      const data = await res.json();
      setCurrentQuestion(data.results[0]);
      setNextQuestion(data.next);
      setAnswerKey("session_id", sessionId);
      setAnswerKey("question_name", data.results[0].name);
      setLoading(false);

      console.log("Fetched next question:", data);
    } catch (error) {
      console.error("Error fetching next question:", error);
    }
  };

  // const nextQuestion = () => {
  //   console.log(answer, "data inside next question");
  //   useEffect(() => {
  //     const postAnswer = async () => {
  //       try {
  //         const res = await fetch(`${url}user-response/`, {
  //           method: "POST",
  //           // headers: { "Content-Type": "application/json" },
  //           body: JSON.stringify(answer),
  //         });

  //         if (!res.ok) {
  //           throw new Error("Failed to post answer");
  //         }

  //         const data = await res.json();
  //         console.log(data, "response after posting answer");
  //       } catch (error) {
  //         console.error("Error posting answer:", error);
  //       }
  //       console.log("answer posted ");
  //     };

  //     postAnswer();
  //   }, []);
  // };

  // const currentQuestion = useMemo(() => {
  //   const sec = exam?.sections?.[0];
  //   const q = sec?.questions?.[questionIndex];
  //   return q ?? null;
  // }, [exam, questionIndex]);

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 animate-pulse">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <div className="h-4 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
          <div className="h-24 w-full bg-gray-200 rounded mb-4" />
          <div className="h-2 w-full bg-gray-200 rounded mb-2" />
          <div className="h-2 w-5/6 bg-gray-200 rounded" />
          <div className="mt-6 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-sky-600 border-t-transparent animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle>Exam complete</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            Thank you, {userName}. You have completed all questions.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sessionId) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            Session ID is missing. Please restart the exam.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{titleFor(currentQuestion?.subsection)}</CardTitle>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Candidate:{" "}
              <span className="font-medium text-gray-900">{userName}</span>
            </div>
          </div>
        </CardHeader>
        <h2 className="px-6 pt-6 font-semibold">
          {currentQuestion.subsection_instruction}
        </h2>
        <CardContent>
          <Separator className="my-4" />

          {currentQuestion.type === "notification" && (
            <NotificationMessage
              message={currentQuestion.message}
              duration={currentQuestion.durationSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "category" && (
            <CategoryMessage
              categoryName={currentQuestion.categoryName}
              message={currentQuestion.message}
              duration={currentQuestion.durationSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {/* {currentQuestion.type === "category" && (
          <CategoryMessage
            categoryName={currentQuestion.categoryName}
            message={currentQuestion.message}
            duration={currentQuestion.durationSeconds}
            onNext={() => nextQuestion()}
          />
        )} */}

          {currentQuestion !== null &&
            currentQuestion?.subsection === "read_aloud" && (
              <ReadAloud
                key={currentQuestion.id}
                promptText={currentQuestion.text}
                prepSeconds={currentQuestion.reading_time}
                recordSeconds={currentQuestion.answering_time}
                onNext={onNext}
              />
            )}

          {currentQuestion !== null &&
            currentQuestion?.subsection === "repeat_sentence" && (
              <RetellLecture
                key={currentQuestion.id}
                audioUrl={currentQuestion.audio}
                videoUrl={currentQuestion.video}
                prepSeconds={currentQuestion.reading_time}
                recordSeconds={currentQuestion.answering_time}
                onNext={onNext}
              />
            )}

          {currentQuestion !== null &&
            currentQuestion?.subsection === "describe_image" && (
              <DescribeImage
                key={currentQuestion.id}
                imageUrl={currentQuestion.image}
                prepSeconds={currentQuestion.reading_time}
                recordSeconds={currentQuestion.answering_time}
                questionId={currentQuestion.id}
                onNext={onNext}
              />
            )}

          {/* re-telling lecture  */}
          {currentQuestion.type === "Respond-to-a-Situation" && (
            <RetellLecture
              key={currentQuestion.id}
              audioUrl={currentQuestion.audioUrl}
              videoUrl={currentQuestion.videoUrl}
              audioSum={currentQuestion.audioSum}
              prepSeconds={currentQuestion.prepSeconds}
              recordPrepSeconds={currentQuestion.recordPrep}
              recordSeconds={currentQuestion.recordSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {/* Answer Short Question */}

          {currentQuestion.type === "Answer-Short-Question" && (
            <RetellLecture
              key={currentQuestion.id}
              audioUrl={currentQuestion.audioUrl}
              prepSeconds={currentQuestion.prepSeconds}
              recordSeconds={currentQuestion.recordSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "retell-lecture" && (
            <RetellLecture
              key={currentQuestion.id}
              audioUrl={currentQuestion.audioUrl}
              videoUrl={currentQuestion.videoUrl}
              prepSeconds={currentQuestion.prepSeconds}
              recordSeconds={currentQuestion.recordSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "Summarize-Written-Text" && (
            <WriteEssay
              key={currentQuestion.id}
              promptText={currentQuestion.prompt}
              durationSeconds={currentQuestion.durationSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "write-essay" && (
            <WriteEssay
              key={currentQuestion.id}
              promptText={currentQuestion.prompt}
              durationSeconds={currentQuestion.durationSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "fill-blanks-dropdown" && (
            <FillBlanksDropdown
              key={currentQuestion.id}
              segments={currentQuestion.segments}
              blanks={currentQuestion.blanks}
              durationSeconds={currentQuestion.durationSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "mcq-multi" && (
            <MultipleChoiceMulti
              key={currentQuestion.id}
              paragraphs={currentQuestion.paragraphs}
              questionText={currentQuestion.questionText}
              options={currentQuestion.options}
              durationSeconds={currentQuestion.durationSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "reorder-paragraphs" && (
            <ReorderParagraphs
              key={currentQuestion.id}
              items={currentQuestion.items}
              durationSeconds={currentQuestion.durationSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "fill-in-the-blanks-drag-and-drop" && (
            <FillBlanksDragDrop
              segments={currentQuestion.segments}
              blanks={currentQuestion.blanks}
              durationSeconds={currentQuestion.durationSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "mcq-single" && (
            <MultipleChoiceSingle
              key={currentQuestion.id}
              paragraphs={currentQuestion.paragraphs}
              questionText={currentQuestion.questionText}
              options={currentQuestion.options}
              durationSeconds={currentQuestion.durationSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "audio-to-text" && (
            <SummerizeTheEssay
              key={currentQuestion.id}
              output={currentQuestion.output}
              prepSeconds={currentQuestion.prepSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "audio-to-mcq" && (
            <AudioToMCQ
              key={currentQuestion.id}
              audioSrc={currentQuestion.output}
              prepSeconds={currentQuestion.prepSeconds}
              options={currentQuestion.options}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "fill-in-the-blanks-typable" && (
            <FillBlanksTyped
              key={currentQuestion.id}
              segments={currentQuestion.segments}
              prepSeconds={currentQuestion.prepSeconds}
              output={currentQuestion.output}
              durationSeconds={currentQuestion.durationSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "audio-to-mcq-radio" && (
            <AudioToMCQRadio
              key={currentQuestion.id}
              output={currentQuestion.output}
              prepSeconds={currentQuestion.prepSeconds}
              options={currentQuestion.options}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "highlight-incorrect-words" && (
            <AudioHighlightBox
              key={currentQuestion.id}
              audioSrc={currentQuestion.output}
              prepSeconds={currentQuestion.prepSeconds}
              text={currentQuestion.prompt}
              onNext={() => nextQuestion()}
            />
          )}

          {currentQuestion.type === "Write-from-Dictation" && (
            <SummerizeTheEssay
              key={currentQuestion.id}
              output={currentQuestion.output}
              prepSeconds={currentQuestion.prepSeconds}
              onNext={() => nextQuestion()}
            />
          )}

          {/* {currentQuestion.type === "read-aloud" && ( */}
          <div className="mt-6">
            <button
              disabled={nextPhase === "prep"}
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 ${
                nextPhase === "prep"
                  ? "bg-sky-100 text-gray-300 cursor-none"
                  : " bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
              }   `}
              onClick={handleNext}
            >
              Next
            </button>
          </div>
          {/* // )} */}
        </CardContent>
      </Card>
      {callAreYouSure && <AreyousureModal onClose={onClose} onNext={onNext} />}
    </>
  );
}

function titleFor(q) {
  switch (q.type) {
    case "read-aloud":
      return "Speaking — Read Aloud";
    case "write-essay":
      return "Writing — Write an Essay";
    case "notification":
      return "Notification";
    case "category":
      return "category";
    default:
      return "Question";
  }
}
