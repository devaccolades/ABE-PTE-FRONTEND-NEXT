"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useExamStore } from "@/store";

// --- Timer Hooks & UI ---
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function ReorderParagraphs({
  items = [],
  subsection,
  name = "Reorder Paragraphs",
}) {
  const setGlobalPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);

  // --- 1. Timer Logic ---
  // This hook handles the sync between LocalStorage and the Global Store
  const handleTimeExpired = useCallback(() => {
    console.log("Section time expired. Locking Reorder Paragraphs.");
  }, []);

  const { formattedTime, isExpired } = useSectionTimer(handleTimeExpired);

  // --- 2. Initial Data Setup ---
  const initialSource = useMemo(
    () =>
      items.map((it, i) => ({
        id: it.id ?? String(i),
        text: it.option_text ?? String(it),
        label: it.label ?? indexToLabel(i),
      })),
    [items]
  );

  const [source, setSource] = useState(initialSource);
  const [target, setTarget] = useState([]);

  // --- 3. Sync Answer and Global Phase ---
  useEffect(() => {
    // We always save the current target arrangement, even if incomplete
    const answerMapping = target.reduce((acc, item, index) => {
      acc[index + 1] = item.id;
      return acc;
    }, {});

    setAnswerKey("answer", answerMapping);

    // If time is up, phase is finished. 
    // Otherwise, check if all items are moved to the target box.
    if (isExpired) {
      setGlobalPhase("finished");
    } else if (source.length === 0 && target.length > 0) {
      setGlobalPhase("finished");
    } else {
      setGlobalPhase("prep");
    }
  }, [source, target, setGlobalPhase, setAnswerKey, isExpired]);

  // --- 4. Drag-n-drop Handlers (Respect isExpired) ---
  function onDragStart(e, payload) {
    if (isExpired) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropToSource(e) {
    e.preventDefault();
    if (isExpired) return;

    const data = safeParse(e.dataTransfer.getData("application/json"));
    if (!data) return;

    if (data.from === "target") {
      setTarget((t) => t.filter((x) => x.id !== data.item.id));
      setSource((s) => [...s, data.item]);
    }
  }

  function onDropToTargetAtPosition(e, position) {
    e.preventDefault();
    e.stopPropagation();
    if (isExpired) return;

    const data = safeParse(e.dataTransfer.getData("application/json"));
    if (!data) return;

    if (data.from === "source") {
      setSource((s) => s.filter((x) => x.id !== data.item.id));
      setTarget((t) => {
        const copy = [...t];
        copy.splice(position, 0, data.item);
        return copy;
      });
    } else if (data.from === "target") {
      setTarget((t) => {
        const currentIndex = t.findIndex((x) => x.id === data.item.id);
        if (currentIndex === -1) return t;

        const filtered = t.filter((x) => x.id !== data.item.id);
        let adjustedPosition = position;
        if (currentIndex < position) {
          adjustedPosition = position - 1;
        }

        const copy = [...filtered];
        copy.splice(adjustedPosition, 0, data.item);
        return copy;
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase">
          {subsection?.replace(/_/g, " ") || name}
        </h2>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isExpired}
        />
      </div>

      {/* DRAG AND DROP AREA */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all ${isExpired ? "opacity-60 grayscale-[0.5]" : ""}`}>
        <Column
          title="Source"
          items={source}
          onDropContainer={onDropToSource}
          onDragStart={onDragStart}
          isExpired={isExpired}
        />
        <Column
          title="Target"
          items={target}
          onDropAtPosition={onDropToTargetAtPosition}
          onDragStart={onDragStart}
          isExpired={isExpired}
        />
      </div>

      {/* STATUS MESSAGES */}
      {isExpired ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center font-bold animate-pulse">
          ⏳ Section time has expired. You can no longer rearrange these items.
        </div>
      ) : (
        source.length > 0 && (
          <p className="text-sm text-amber-600 font-medium animate-pulse text-center bg-amber-50 py-2 rounded-lg border border-amber-100">
            ⚠️ Move all paragraphs to the Target box to save your answer.
          </p>
        )
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function Column({
  title,
  items,
  onDropContainer,
  onDropAtPosition,
  onDragStart,
  isExpired
}) {
  const isSource = title.toLowerCase() === "source";
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm p-4 h-[500px] flex flex-col ${isExpired ? "cursor-not-allowed" : ""}`}
      onDragOver={isSource && !isExpired ? (e) => e.preventDefault() : undefined}
      onDrop={isSource && !isExpired ? onDropContainer : undefined}
    >
      <div className="text-sm font-bold text-gray-700 mb-3 uppercase border-b pb-2">
        {title}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {!isSource && !isExpired && (
          <DropZone
            onDrop={(e) => onDropAtPosition?.(e, 0)}
            label={items.length === 0 ? "Drop here" : "Place at top"}
          />
        )}
        {items.map((item, idx) => (
          <div key={item.id}>
            <DraggableCard
              item={item}
              origin={title.toLowerCase()}
              onDragStart={onDragStart}
              isExpired={isExpired}
            />
            {!isSource && !isExpired && (
              <DropZone onDrop={(e) => onDropAtPosition?.(e, idx + 1)} />
            )}
          </div>
        ))}
        {items.length === 0 && isSource && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <span className="text-sm italic text-gray-300">All items moved</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ item, origin, onDragStart, isExpired }) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm select-none transition-all ${
        isExpired 
          ? "opacity-80 cursor-not-allowed" 
          : "cursor-grab active:cursor-grabbing hover:border-sky-400 hover:bg-white"
      }`}
      draggable={!isExpired}
      onDragStart={(e) => onDragStart(e, { from: origin, item })}
    >
      <div className="flex items-start gap-4">
        <div className={`h-7 w-7 shrink-0 rounded-full text-white grid place-items-center text-xs font-bold ${isExpired ? "bg-gray-400" : "bg-sky-600"}`}>
          {item.label}
        </div>
        <div className="text-[15px] text-gray-800 leading-relaxed font-medium">
          {item.text}
        </div>
      </div>
    </div>
  );
}

function DropZone({ onDrop, label = "" }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`h-10 rounded-lg border-2 border-dashed transition-all flex items-center justify-center ${
        over ? "border-sky-500 bg-sky-50 h-14" : "border-gray-100 opacity-40"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        onDrop?.(e);
      }}
    >
      {label && (
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          {label}
        </span>
      )}
    </div>
  );
}

// --- HELPERS ---

function indexToLabel(i) {
  let n = i;
  let label = "";
  while (true) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return label;
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}