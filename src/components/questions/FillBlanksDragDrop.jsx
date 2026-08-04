"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

const AUTO_SCROLL_EDGE_PX = 110;
const AUTO_SCROLL_MAX_STEP = 24;

function getScrollParent(node) {
  let current = node instanceof Element ? node : null;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const canScrollY =
      /(auto|scroll|overlay)/.test(style.overflowY) &&
      current.scrollHeight > current.clientHeight;

    if (canScrollY) {
      return current;
    }

    current = current.parentElement;
  }

  return document.scrollingElement || document.documentElement;
}

function getScrollRect(scrollTarget) {
  if (
    scrollTarget === document.scrollingElement ||
    scrollTarget === document.documentElement ||
    scrollTarget === document.body
  ) {
    return {
      top: 0,
      bottom: window.innerHeight,
    };
  }

  return scrollTarget.getBoundingClientRect();
}

function scrollByY(scrollTarget, top) {
  if (
    scrollTarget === document.scrollingElement ||
    scrollTarget === document.documentElement ||
    scrollTarget === document.body
  ) {
    window.scrollBy(0, top);
    return;
  }

  scrollTarget.scrollBy({ top, behavior: "auto" });
}

function runAutoScrollFrame({
  isDraggingRef,
  autoScrollFrameRef,
  autoScrollYRef,
  autoScrollTargetRef,
}) {
  autoScrollFrameRef.current = null;

  if (!isDraggingRef.current) return;

  const scrollTarget =
    autoScrollTargetRef.current ||
    document.scrollingElement ||
    document.documentElement;
  const pointerY = autoScrollYRef.current;
  const { top, bottom } = getScrollRect(scrollTarget);
  const distanceToTop = pointerY - top;
  const distanceToBottom = bottom - pointerY;
  let scrollStep = 0;

  if (distanceToTop < AUTO_SCROLL_EDGE_PX) {
    scrollStep =
      -AUTO_SCROLL_MAX_STEP *
      ((AUTO_SCROLL_EDGE_PX - distanceToTop) / AUTO_SCROLL_EDGE_PX);
  } else if (distanceToBottom < AUTO_SCROLL_EDGE_PX) {
    scrollStep =
      AUTO_SCROLL_MAX_STEP *
      ((AUTO_SCROLL_EDGE_PX - distanceToBottom) / AUTO_SCROLL_EDGE_PX);
  }

  if (scrollStep !== 0) {
    scrollByY(scrollTarget, scrollStep);
  }

  autoScrollFrameRef.current = requestAnimationFrame(() =>
    runAutoScrollFrame({
      isDraggingRef,
      autoScrollFrameRef,
      autoScrollYRef,
      autoScrollTargetRef,
    }),
  );
}

export default function FillBlanksDragDrop({
  name = "",
  segments = "",
  options = [],
  subsection = "Reading: Fill in the Blanks",
  questionId,
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);

  const [answers, setAnswers] = useState({}); // { blank_idx: {id, text} }
  const [selectedOption, setSelectedOption] = useState(null); // For Mobile Tap-to-Fill
  const isDraggingRef = useRef(false);
  const autoScrollFrameRef = useRef(null);
  const autoScrollYRef = useRef(0);
  const autoScrollTargetRef = useRef(null);

  const handleSectionTimeExpired = useCallback(() => {
    // Section timer expired; allow parent flow to handle phase changes.
  }, []);

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer(
    handleSectionTimeExpired,
  );

  const textParts = useMemo(() => segments.split(/----|_{2,}/g), [segments]);

  const totalBlanks = textParts.length - 1;

  const availableOptions = useMemo(() => {
    const usedIds = Object.values(answers).map((a) => a.id);
    return options.filter((opt) => !usedIds.includes(opt.id));
  }, [options, answers]);

  // Sync to Store
  useEffect(() => {
    const formattedAnswers = Object.keys(answers).reduce((acc, key) => {
      acc[key] = answers[key].id;
      return acc;
    }, {});
    setAnswerKey("answer", formattedAnswers);

    const hasAtLeastOneAnswer = Object.keys(answers).length > 0;
    if (isSectionExpired || hasAtLeastOneAnswer) {
      setPhase("writing");
    } else {
      setPhase("prep");
    }
  }, [answers, isSectionExpired, setAnswerKey, setPhase]);

  // --- MOBILE TAP LOGIC ---
  const handleOptionClick = (option) => {
    if (isSectionExpired) return;
    // Toggle selection
    setSelectedOption(selectedOption?.id === option.id ? null : option);
  };

  const handleBlankClick = (blankIdx) => {
    if (isSectionExpired) return;

    // If a blank is already filled, move it back to pool
    if (answers[blankIdx]) {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[blankIdx];
        return next;
      });
      return;
    }

    // If an option is selected, place it in this blank
    if (selectedOption) {
      setAnswers((prev) => ({ ...prev, [blankIdx]: selectedOption }));
      setSelectedOption(null);
    }
  };

  const stopAutoScroll = useCallback(() => {
    isDraggingRef.current = false;
    autoScrollTargetRef.current = null;

    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const scheduleAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== null) return;

    autoScrollFrameRef.current = requestAnimationFrame(() =>
      runAutoScrollFrame({
        isDraggingRef,
        autoScrollFrameRef,
        autoScrollYRef,
        autoScrollTargetRef,
      }),
    );
  }, []);

  const handleDragAutoScroll = useCallback(
    (event) => {
      if (!isDraggingRef.current) return;

      autoScrollYRef.current = event.clientY;
      autoScrollTargetRef.current = getScrollParent(event.target);
      scheduleAutoScroll();
    },
    [scheduleAutoScroll],
  );

  useEffect(() => {
    document.addEventListener("dragover", handleDragAutoScroll);
    document.addEventListener("drop", stopAutoScroll);
    document.addEventListener("dragend", stopAutoScroll);

    return () => {
      document.removeEventListener("dragover", handleDragAutoScroll);
      document.removeEventListener("drop", stopAutoScroll);
      document.removeEventListener("dragend", stopAutoScroll);
      stopAutoScroll();
    };
  }, [handleDragAutoScroll, stopAutoScroll]);

  // --- DESKTOP DRAG & DROP LOGIC ---
  const onDragStart = (e, option, fromBlank = null) => {
    if (isSectionExpired) return e.preventDefault();
    isDraggingRef.current = true;
    autoScrollYRef.current = e.clientY;
    autoScrollTargetRef.current = getScrollParent(e.currentTarget);
    scheduleAutoScroll();
    e.dataTransfer.setData("option", JSON.stringify(option));
    if (fromBlank) e.dataTransfer.setData("fromBlank", fromBlank);
  };

  const onDropOnBlank = (e, targetBlankNumber) => {
    e.preventDefault();
    stopAutoScroll();
    if (isSectionExpired) return;
    try {
      const option = JSON.parse(e.dataTransfer.getData("option"));
      const fromBlank = e.dataTransfer.getData("fromBlank");
      setAnswers((prev) => {
        const next = { ...prev };
        if (fromBlank) delete next[fromBlank];
        next[targetBlankNumber] = option;
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const onDropOnPool = (e) => {
    e.preventDefault();
    stopAutoScroll();
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
    <div className="space-y-4 md:space-y-5 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-3">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 uppercase tracking-tight">
            {name}
          </h2>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isSectionExpired}
        />
      </div>

      {/* MOBILE INSTRUCTION */}
      {!isSectionExpired && (
        <p className="block md:hidden text-[10px] text-center text-sky-600 font-bold uppercase bg-sky-50 py-1 rounded">
          {selectedOption
            ? `Now tap a blank to place "${selectedOption.option_text}"`
            : "Tap a word, then tap a blank"}
        </p>
      )}

      {/* TEXT AREA */}
      <div className="rounded-xl border border-gray-200 p-4 md:p-8 bg-white text-gray-900 text-base md:text-lg leading-[2rem] shadow-sm">
        {textParts.map((part, index) => (
          <span key={index} className="inline">
            <span className="whitespace-pre-wrap">{part}</span>
            {index < totalBlanks && (
              <DropTarget
                blankNumber={index + 1}
                filledValue={answers[index + 1]}
                onDrop={onDropOnBlank}
                onDragStart={onDragStart}
                onDragEnd={stopAutoScroll}
                onClick={() => handleBlankClick(index + 1)}
                disabled={isSectionExpired}
                isWaitingForPlacement={!!selectedOption}
              />
            )}
          </span>
        ))}
      </div>

      {/* OPTIONS POOL */}
      <div
        className={`p-4 md:p-5 bg-slate-50 rounded-xl border-2 border-dashed transition-colors ${selectedOption ? "border-sky-400 bg-sky-50/50" : "border-slate-200"}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropOnPool}
      >
        <div className="flex flex-wrap gap-2 md:gap-3 justify-center min-h-[50px]">
          {availableOptions.map((opt) => (
            <DraggableOption
              key={opt.id}
              option={opt}
              isSelected={selectedOption?.id === opt.id}
              onDragStart={(e) => onDragStart(e, opt)}
              onDragEnd={stopAutoScroll}
              onClick={() => handleOptionClick(opt)}
              disabled={isSectionExpired}
            />
          ))}
          {availableOptions.length === 0 && (
            <div className="text-slate-400 text-sm italic py-2">
              All words placed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function DropTarget({
  blankNumber,
  filledValue,
  onDrop,
  onDragStart,
  onDragEnd,
  onClick,
  disabled,
  isWaitingForPlacement,
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <span
      onClick={onClick}
      draggable={!!filledValue && !disabled}
      onDragStart={(e) => {
        if (filledValue) onDragStart(e, filledValue, blankNumber);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        setIsOver(false);
        onDrop(e, blankNumber);
      }}
      className={`
        mx-1 md:mx-2 inline-flex items-center justify-center align-middle
        min-w-[100px] md:min-w-[140px] h-8 md:h-9 px-2 md:px-3 rounded md:rounded-md border-2 transition-all
        ${
          filledValue
            ? "bg-sky-600 border-sky-600 text-white font-medium shadow-sm"
            : "bg-gray-50 border-gray-300 border-dashed"
        }
        ${isOver || (isWaitingForPlacement && !filledValue) ? "border-sky-500 bg-sky-100" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span className="text-sm md:text-base truncate max-w-[120px] md:max-w-[180px]">
        {filledValue ? filledValue.option_text : ""}
      </span>
    </span>
  );
}

function DraggableOption({
  option,
  onDragStart,
  onDragEnd,
  onClick,
  disabled,
  isSelected,
}) {
  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        px-3 py-1.5 md:px-4 md:py-1.5 border-2 rounded-lg shadow-sm
        text-sm md:text-base font-semibold select-none transition-all
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-grab active:scale-95"}
        ${
          isSelected
            ? "bg-sky-500 border-sky-600 text-white ring-2 ring-sky-200"
            : "bg-white border-gray-200 text-gray-700 hover:border-sky-400"
        }
      `}
    >
      {option.option_text}
    </div>
  );
}
