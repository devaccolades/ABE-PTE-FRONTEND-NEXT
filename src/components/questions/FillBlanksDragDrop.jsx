"use client";
import { useEffect, useState, useMemo } from "react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function FillBlanksDragDrop({
  segments = "", // Raw text with "----"
  options = [],  // Array of option objects
  subsection = "Reading: Fill in the Blanks",
  questionId
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);

  // 1. LOCAL STATE
  const [answers, setAnswers] = useState({}); // { 1: {id, text}, 2: {id, text} }

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  // 2. PARSE PLAIN TEXT INTO BLANKS
  // Splits text by "----". The resulting array will have text, then a blank, then text.
  const textParts = useMemo(() => {
    return segments.split(/----/g);
  }, [segments]);

  const totalBlanks = textParts.length - 1;

  // 3. CALCULATE AVAILABLE OPTIONS
  const availableOptions = useMemo(() => {
    const usedIds = Object.values(answers).map((a) => a.id);
    return options.filter((opt) => !usedIds.includes(opt.id));
  }, [options, answers]);

  const isAllFilled = useMemo(() => {
    return Object.keys(answers).length === totalBlanks;
  }, [answers, totalBlanks]);

  // 4. SYNC TO GLOBAL STORE
  useEffect(() => {
    const formattedAnswers = Object.keys(answers).reduce((acc, key) => {
      acc[key] = answers[key].id;
      return acc;
    }, {});

    setAnswerKey("answer", formattedAnswers);

    if (isSectionExpired || isAllFilled) {
      setPhase("writing");
    } else {
      setPhase("prep");
    }
  }, [answers, isAllFilled, isSectionExpired, setAnswerKey, setPhase]);

  // --- DRAG & DROP LOGIC ---
  const onDragStart = (e, option, fromBlank = null) => {
    e.dataTransfer.setData("option", JSON.stringify(option));
    if (fromBlank) e.dataTransfer.setData("fromBlank", fromBlank);
  };

  const onDropOnBlank = (e, targetBlankNumber) => {
    e.preventDefault();
    if (isSectionExpired) return;

    const option = JSON.parse(e.dataTransfer.getData("option"));
    const fromBlank = e.dataTransfer.getData("fromBlank");

    setAnswers((prev) => {
      const next = { ...prev };
      if (fromBlank) delete next[fromBlank];
      next[targetBlankNumber] = option;
      return next;
    });
  };

  const onDropOnPool = (e) => {
    e.preventDefault();
    const fromBlank = e.dataTransfer.getData("fromBlank");
    if (fromBlank) {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[fromBlank];
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight uppercase">
          {subsection}
        </h2>
        <SectionTimerDisplay formattedTime={formattedTime} isExpired={isSectionExpired} />
      </div>

      {/* TEXT AREA WITH DRAGGABLE BOXES */}
      <div className="rounded-xl border border-gray-200 p-8 bg-white text-gray-900 text-lg leading-[3.5rem] shadow-sm">
        {textParts.map((part, index) => (
          <span key={index}>
            <span className="whitespace-pre-wrap">{part}</span>
            {index < totalBlanks && (
              <DropTarget
                blankNumber={index + 1}
                filledValue={answers[index + 1]}
                onDrop={onDropOnBlank}
                onDragStart={onDragStart}
                disabled={isSectionExpired}
              />
            )}
          </span>
        ))}
      </div>

      {/* OPTIONS POOL */}
      <div 
        className="p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropOnPool}
      >
        <div className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest text-center">
          DRAG OPTIONS BELOW INTO THE BLANKS
        </div>
        <div className="flex flex-wrap gap-3 justify-center min-h-[60px]">
          {availableOptions.map((opt) => (
            <DraggableOption
              key={opt.id}
              option={opt}
              onDragStart={(e) => onDragStart(e, opt)}
              disabled={isSectionExpired}
            />
          ))}
          {availableOptions.length === 0 && (
            <div className="text-slate-400 text-sm italic py-4 animate-in fade-in">
              All items have been placed
            </div>
          )}
        </div>
      </div>

      {!isAllFilled && !isSectionExpired && (
        <div className="text-amber-600 text-sm font-medium bg-amber-50 p-4 rounded-lg border border-amber-100 flex justify-center items-center gap-2 animate-in slide-in-from-bottom-2">
          <span>⚠️</span> Complete the text by dragging all options to enable the Next button.
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function DropTarget({ blankNumber, filledValue, onDrop, onDragStart, disabled }) {
  const [isOver, setIsOver] = useState(false);

  return (
    <span
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { setIsOver(false); onDrop(e, blankNumber); }}
      className={`
        mx-2 inline-flex items-center justify-center align-middle
        min-w-[140px] h-10 px-3 rounded-md border-2 transition-all duration-200
        ${filledValue 
          ? "bg-sky-600 border-sky-600 text-white font-medium shadow-md" 
          : "bg-gray-50 border-gray-300 border-dashed"}
        ${isOver ? "border-sky-500 bg-sky-100 scale-110" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-default"}
      `}
    >
      {filledValue ? (
        <span
          draggable={!disabled}
          onDragStart={(e) => onDragStart(e, filledValue, blankNumber)}
          className="cursor-grab active:cursor-grabbing w-full text-center truncate"
        >
          {filledValue.option_text}
        </span>
      ) : (
        <span className="text-gray-300 text-xs font-bold">DROP HERE</span>
      )}
    </span>
  );
}

function DraggableOption({ option, onDragStart, disabled }) {
  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      className={`
        px-5 py-2.5 bg-white border-2 border-gray-200 rounded-lg shadow-sm
        text-base font-semibold text-gray-700 select-none
        transition-all hover:border-sky-500 hover:shadow-sky-100 hover:shadow-lg
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-grab active:cursor-grabbing active:scale-90 hover:-translate-y-1"}
      `}
    >
      {option.option_text}
    </div>
  );
}