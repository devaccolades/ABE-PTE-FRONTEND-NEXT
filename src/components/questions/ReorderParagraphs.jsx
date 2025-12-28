"use client";
import { useEffect, useMemo, useState } from "react";
import { useExamStore } from "@/store";

export default function ReorderParagraphs({
  items = [], // [{ id, text, label? }]
  subsection,
  questionId, // Ensure you pass the questionId to map the answer correctly
}) {
  const setGlobalPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);

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

  // --- Logic: Sync Answer and Next Button ---
  useEffect(() => {
    if (source.length === 0 && target.length > 0) {
      // 1. Create the position mapping (Position : ID)
      // Result format: { "1": "15", "2": "12", ... }
      const answerMapping = target.reduce((acc, item, index) => {
        acc[index + 1] = item.id;
        return acc;
      }, {});

      // 2. Save to global store
      setAnswerKey(questionId, answerMapping);
      console.log("answer order", questionId, answerMapping);

      // 3. Enable Next Button
      setGlobalPhase("finished");
    } else {
      setGlobalPhase("prep");
    }
  }, [source, target, setGlobalPhase, setAnswerKey, questionId]);

  // Drag-n-drop handlers
  function onDragStart(e, payload) {
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropToSource(e) {
    e.preventDefault();
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
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase">
          {subsection?.replace(/_/g, " ") || "Reorder Paragraphs"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Column
          title="Source"
          items={source}
          onDropContainer={onDropToSource}
          onDragStart={onDragStart}
        />
        <Column
          title="Target"
          items={target}
          onDropAtPosition={onDropToTargetAtPosition}
          onDragStart={onDragStart}
        />
      </div>

      {source.length > 0 && (
        <p className="text-sm text-amber-600 font-medium animate-pulse text-center bg-amber-50 py-2 rounded-lg border border-amber-100">
          ⚠️ Move all paragraphs to the Target box to save your answer.
        </p>
      )}
    </div>
  );
}

// ... Column, DraggableCard, and DropZone components remain same as previous response ...
// (Ensure they are included below in your actual file)

function Column({
  title,
  items,
  onDropContainer,
  onDropAtPosition,
  onDragStart,
}) {
  const isSource = title.toLowerCase() === "source";
  return (
    <div
      className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 h-[500px] flex flex-col"
      onDragOver={isSource ? (e) => e.preventDefault() : undefined}
      onDrop={isSource ? onDropContainer : undefined}
    >
      <div className="text-sm font-bold text-gray-700 mb-3 uppercase border-b pb-2">
        {title}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {!isSource && (
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
            />
            {!isSource && (
              <DropZone onDrop={(e) => onDropAtPosition?.(e, idx + 1)} />
            )}
          </div>
        ))}
        {items.length === 0 && isSource && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <span className="text-sm italic">All items moved</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ item, origin, onDragStart }) {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-gray-50 p-4 cursor-grab active:cursor-grabbing select-none hover:border-sky-400 transition-all shadow-sm"
      draggable
      onDragStart={(e) => onDragStart(e, { from: origin, item })}
    >
      <div className="flex items-start gap-4">
        <div className="h-7 w-7 shrink-0 rounded-full bg-sky-600 text-white grid place-items-center text-xs font-bold">
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
      className={`h-10 rounded-lg border-2 border-dashed transition-all ${
        over ? "border-sky-500 bg-sky-50 h-14" : "border-gray-200 opacity-40"
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
        <span className="text-[11px] font-bold text-gray-500 uppercase">
          {label}
        </span>
      )}
    </div>
  );
}

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
