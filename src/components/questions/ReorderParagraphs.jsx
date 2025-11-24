"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ReorderParagraphs({
  items = [], // [{ id, text, label? }]
  durationSeconds = 0,
  onNext,
}) {
  const initialSource = useMemo(
    () =>
      items.map((it, i) => ({
        id: it.id ?? String(i),
        text: it.text ?? String(it),
        label: it.label ?? indexToLabel(i),
      })),
    [items]
  );

  const [source, setSource] = useState(initialSource);
  const [target, setTarget] = useState([]);

  const [left, setLeft] = useState(durationSeconds);
  const hasTimer = durationSeconds && durationSeconds > 0;

  useEffect(() => {
    if (!hasTimer) return;
    if (left <= 0) {
      onNext?.();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, hasTimer, onNext]);

  const progress = useMemo(() => {
    if (!hasTimer) return 0;
    return Math.round(((durationSeconds - left) / durationSeconds) * 100);
  }, [durationSeconds, left, hasTimer]);

  // Drag-n-drop handlers
  function onDragStart(e, payload) {
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }
  function onDropToTargetEnd(e) {
    e.preventDefault();
    if (left <= 0 && hasTimer) return;
    const data = safeParse(e.dataTransfer.getData("application/json"));
    if (!data) return;
    if (data.from === "source") {
      setSource((s) => s.filter((x) => x.id !== data.item.id));
      setTarget((t) => [...t.filter((x) => x.id !== data.item.id), data.item]);
    } else if (data.from === "target") {
      setTarget((t) => [...t.filter((x) => x.id !== data.item.id), data.item]);
    }
  }
  function onDropToSource(e) {
    e.preventDefault();
    if (left <= 0 && hasTimer) return;
    const data = safeParse(e.dataTransfer.getData("application/json"));
    if (!data) return;
    if (data.from === "target") {
      setTarget((t) => t.filter((x) => x.id !== data.item.id));
      setSource((s) => [...s, data.item]);
    }
  }
  function onDropBefore(e, beforeId) {
    e.preventDefault();
    if (left <= 0 && hasTimer) return;
    const data = safeParse(e.dataTransfer.getData("application/json"));
    if (!data) return;
    if (data.from === "target") {
      setTarget((t) =>
        insertBefore(
          t.filter((x) => x.id !== data.item.id),
          data.item,
          beforeId
        )
      );
    } else if (data.from === "source") {
      setSource((s) => s.filter((x) => x.id !== data.item.id));
      setTarget((t) => insertBefore(t, data.item, beforeId));
    }
  }

  return (
    <div className="space-y-6">
      {hasTimer && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium">Time remaining</div>
            <div>{left}s</div>
          </div>
          <Progress value={progress} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Column
          title="Source"
          items={source}
          droppable
          onDropContainer={onDropToSource}
          onDragStart={onDragStart}
          disabled={hasTimer && left <= 0}
          equalHeight
        />
        <Column
          title="Target"
          items={target}
          droppable={false}
          onDropBefore={onDropBefore}
          onDragStart={onDragStart}
          disabled={hasTimer && left <= 0}
          onDropEnd={onDropToTargetEnd}
          showDropZones
          equalHeight
          targetItemCount={target.length}
        />
      </div>
    </div>
  );
}

function Column({
  title,
  items,
  droppable,
  onDropContainer,
  onDropBefore,
  onDragStart,
  onDropEnd,
  showDropZones,
  disabled,
  equalHeight,
  targetItemCount,
}) {
  const showDropZonesBoxes =
    showDropZones && targetItemCount !== undefined && targetItemCount < 3;
  const isTarget = title.toLowerCase() === "target";
  const enableCardDrop =
    isTarget && targetItemCount !== undefined && targetItemCount >= 3;

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm p-4 ${
        equalHeight ? "h-96 flex flex-col" : ""
      }`}
      onDragOver={
        droppable || enableCardDrop
          ? (e) => {
              e.preventDefault();
            }
          : undefined
      }
      onDrop={
        droppable ? onDropContainer : enableCardDrop ? onDropEnd : undefined
      }
    >
      <div className="text-sm font-medium text-gray-700 mb-3">{title}</div>
      <div
        className={`space-y-3 ${
          equalHeight ? "flex-1 overflow-y-auto" : "min-h-40"
        }`}
      >
        {showDropZonesBoxes && (
          <DropZone
            onDrop={(e) => onDropBefore?.(e, items[0]?.id)}
            label="Drop here to place first"
          />
        )}
        {items.map((item, idx) => (
          <div key={item.id}>
            <DraggableCard
              item={item}
              origin={title.toLowerCase()}
              onDragStart={onDragStart}
              disabled={disabled}
              enableDrop={enableCardDrop}
              onDropBefore={
                enableCardDrop ? (e) => onDropBefore?.(e, item.id) : undefined
              }
            />
            {showDropZonesBoxes && (
              <DropZone
                onDrop={(e) =>
                  idx === items.length - 1
                    ? onDropEnd?.(e)
                    : onDropBefore?.(e, items[idx + 1].id)
                }
              />
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-400">(empty)</div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  item,
  origin,
  onDragStart,
  disabled,
  enableDrop,
  onDropBefore,
}) {
  const [over, setOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setOver(false);
    if (onDropBefore) {
      onDropBefore(e);
    }
  };

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gray-50 p-3 cursor-move select-none hover:border-sky-300 ${
        over && enableDrop ? "border-sky-400 bg-sky-50" : ""
      }`}
      draggable={!disabled}
      onDragStart={(e) => onDragStart(e, { from: origin, item })}
      onDragOver={
        enableDrop
          ? (e) => {
              e.preventDefault();
              setOver(true);
            }
          : (e) => e.preventDefault()
      }
      onDragLeave={enableDrop ? () => setOver(false) : undefined}
      onDrop={enableDrop ? handleDrop : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="h-6 w-6 shrink-0 rounded-full bg-sky-600 text-white grid place-items-center text-xs font-semibold">
          {item.label}
        </div>
        <div className="text-sm text-gray-900 leading-relaxed">{item.text}</div>
      </div>
    </div>
  );
}

function DropZone({ onDrop, label = "Drop here" }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`mt-2 h-10 rounded border-2 border-dashed ${
        over ? "border-sky-400 bg-sky-50" : "border-gray-300"
      } grid place-items-center transition-colors`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        onDrop?.(e);
      }}
    >
      <span className="text-[11px] text-gray-400">{label}</span>
    </div>
  );
}

function insertBefore(list, item, beforeId) {
  const idx = list.findIndex((x) => x.id === beforeId);
  if (idx === -1) return [...list, item];
  const copy = [...list];
  copy.splice(idx, 0, item);
  return copy;
}

function indexToLabel(i) {
  // A, B, C ... Z, AA, AB ...
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
