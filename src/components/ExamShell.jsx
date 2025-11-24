"use client";
import { useEffect, useMemo, useState } from "react";
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

export default function ExamShell() {
  const userName = useExamStore((s) => s.userName);
  const questionIndex = useExamStore((s) => s.questionIndex);
  const nextQuestion = useExamStore((s) => s.nextQuestion);

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const start = Date.now();
      const data = await apiClient.fetchExam();
      const MIN_LOAD_MS = 500;
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_LOAD_MS - elapsed);
      setTimeout(() => {
        if (!mounted) return;
        setExam(data);
        setLoading(false);
      }, remaining);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const currentQuestion = useMemo(() => {
    const sec = exam?.sections?.[0];
    const q = sec?.questions?.[questionIndex];
    return q ?? null;
  }, [exam, questionIndex]);

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

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{titleFor(currentQuestion)}</CardTitle>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Candidate:{" "}
            <span className="font-medium text-gray-900">{userName}</span>
          </div>
        </div>
      </CardHeader>
      <h2 className="px-6 pt-6 font-semibold">
        {currentQuestion.notification}
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

        {currentQuestion.type === "read-aloud" && (
          <ReadAloud
            key={currentQuestion.id}
            promptText={currentQuestion.prompt}
            prepSeconds={currentQuestion.prepSeconds}
            recordSeconds={currentQuestion.recordSeconds}
            onNext={() => nextQuestion()}
          />
        )}

        {currentQuestion.type === "Repeat-Sentence" && (
          <RetellLecture
            key={currentQuestion.id}
            audioUrl={currentQuestion.audioUrl}
            videoUrl={currentQuestion.videoUrl}
            prepSeconds={currentQuestion.prepSeconds}
            recordSeconds={currentQuestion.recordSeconds}
            onNext={() => nextQuestion()}
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

        {currentQuestion.type === "describe-image" && (
          <DescribeImage
            key={currentQuestion.id}
            imageUrl={currentQuestion.imageUrl}
            prepSeconds={currentQuestion.prepSeconds}
            recordSeconds={currentQuestion.recordSeconds}
            questionId={currentQuestion.id}
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
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 bg-sky-600 text-white hover:bg-sky-700"
            onClick={() => nextQuestion()}
          >
            Next
          </button>
        </div>
        {/* // )} */}
      </CardContent>
    </Card>
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
