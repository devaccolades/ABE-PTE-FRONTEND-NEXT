"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";
import { RotateCcw } from "lucide-react";

export default function ReorderParagraphs({
  items = [],
  subsection,
  name = "Reorder Paragraphs",
}) {
  const setGlobalPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);

  // --- Timer Logic ---
  const handleSectionTimeExpired = useCallback(() => {
    console.log("Section time expired.");
  }, []);

  const { formattedTime, isExpired } = useSectionTimer(handleSectionTimeExpired);

  // --- Data Initialization ---
  const initialSource = useMemo(() =>
    items.map((it, i) => ({
      id: it.id ?? String(i),
      text: it.option_text ?? String(it),
      label: it.label ?? indexToLabel(i),
    })), [items]
  );

  const [source, setSource] = useState(initialSource);
  const [target, setTarget] = useState([]);

  // Sync to Store & Phase Management
  useEffect(() => {
    const answerMapping = target.reduce((acc, item, index) => {
      acc[index + 1] = item.id;
      return acc;
    }, {});
    
    setAnswerKey("answer", answerMapping);

    if (isExpired) {
      setGlobalPhase("finished");
    } else if (source.length === 0 && target.length > 0) {
      setGlobalPhase("finished");
    } else {
      setGlobalPhase("prep");
    }
  }, [source, target, setGlobalPhase, setAnswerKey, isExpired]);

  // --- Mobile Reset ---
  const handleReset = () => {
    if (isExpired) return;
    setSource(initialSource);
    setTarget([]);
  };

  // --- Click/Touch Move (Mobile/Tab Support) ---
  const handleMoveItem = (item, from) => {
    if (isExpired) return;
    if (from === "source") {
      setSource((s) => s.filter((x) => x.id !== item.id));
      setTarget((t) => [...t, item]);
    } else {
      setTarget((t) => t.filter((x) => x.id !== item.id));
      setSource((s) => [...s, item]);
    }
  };

  // --- Drag-n-Drop Handlers (Desktop Support) ---
  function onDragStart(e, payload) {
    if (isExpired) return e.preventDefault();
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
  }

  function onDropToSource(e) {
    e.preventDefault();
    if (isExpired) return;
    const data = safeParse(e.dataTransfer.getData("application/json"));
    if (data?.from === "target") {
      setTarget((t) => t.filter((x) => x.id !== data.item.id));
      setSource((s) => [...s, data.item]);
    }
  }

  function onDropToTargetAtPosition(e, position) {
    e.preventDefault(); e.stopPropagation();
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
        const filtered = t.filter((x) => x.id !== data.item.id);
        let adjPos = currentIndex < position ? position - 1 : position;
        const copy = [...filtered];
        copy.splice(adjPos, 0, data.item);
        return copy;
      });
    }
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 uppercase">
          {subsection?.replace(/_/g, " ") || name}
        </h2>
        <div className="flex items-center gap-4">
           {!isExpired && target.length > 0 && (
             <button 
               onClick={handleReset}
               className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
             >
               <RotateCcw className="w-3 h-3" /> Reset
             </button>
           )}
           <SectionTimerDisplay formattedTime={formattedTime} isExpired={isExpired} />
        </div>
      </div>

      <p className="block md:hidden text-[10px] text-sky-600 font-bold uppercase text-center bg-sky-50 py-1 rounded">
        Tap a paragraph to move it
      </p>

      {/* Main Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 transition-all ${isExpired ? "opacity-60" : ""}`}>
        <Column
          title="Source"
          items={source}
          onDropContainer={onDropToSource}
          onDragStart={onDragStart}
          onTapItem={(item) => handleMoveItem(item, "source")}
          isExpired={isExpired}
        />
        <Column
          title="Target"
          items={target}
          onDropAtPosition={onDropToTargetAtPosition}
          onDragStart={onDragStart}
          onTapItem={(item) => handleMoveItem(item, "target")}
          isExpired={isExpired}
        />
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function Column({ title, items, onDropContainer, onDropAtPosition, onDragStart, onTapItem, isExpired }) {
  const isSource = title.toLowerCase() === "source";
  return (
    <div 
      className="rounded-xl border border-gray-200 bg-white p-3 md:p-4 min-h-[300px] lg:h-[500px] flex flex-col"
      onDragOver={(e) => isSource && e.preventDefault()}
      onDrop={isSource ? onDropContainer : undefined}
    >
      <div className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest border-b pb-2">{title}</div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
        {!isSource && !isExpired && (
          <DropZone onDrop={(e) => onDropAtPosition?.(e, 0)} label={items.length === 0 ? "Drop here" : ""} />
        )}
        {items.map((item, idx) => (
          <div key={item.id}>
            <DraggableCard 
              item={item} 
              origin={title.toLowerCase()} 
              onDragStart={onDragStart} 
              onTap={() => onTapItem(item)} 
              isExpired={isExpired} 
            />
            {!isSource && !isExpired && (
              <DropZone onDrop={(e) => onDropAtPosition?.(e, idx + 1)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ item, origin, onDragStart, onTap, isExpired }) {
  return (
    <div
      draggable={!isExpired}
      onDragStart={(e) => onDragStart(e, { from: origin, item })}
      onClick={onTap}
      className={`group rounded-lg border border-gray-200 bg-slate-50 p-3 md:p-4 shadow-sm transition-all cursor-pointer md:cursor-grab active:scale-95 md:active:scale-100 ${isExpired ? "opacity-70" : "hover:border-sky-400 hover:bg-white"}`}
    >
      <div className="flex items-start gap-3">
        <div className={`h-6 w-6 shrink-0 rounded-full text-white grid place-items-center text-[10px] font-bold ${isExpired ? "bg-gray-300" : "bg-sky-600 group-hover:bg-sky-500"}`}>
          {item.label}
        </div>
        <div className="text-sm md:text-base text-gray-800 leading-snug">{item.text}</div>
      </div>
    </div>
  );
}

function DropZone({ onDrop, label = "" }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`h-6 md:h-10 rounded-lg border-2 border-dashed transition-all flex items-center justify-center ${over ? "border-sky-500 bg-sky-50 h-12" : "border-gray-100 opacity-40"}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); onDrop?.(e); }}
    >
      {label && <span className="text-[10px] text-gray-400 uppercase">{label}</span>}
    </div>
  );
}

// --- HELPER FUNCTIONS ---

/**
 * Converts index to Letter label (0=A, 1=B, 2=C...)
 */
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

/**
 * Safely parse JSON string
 */
function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}