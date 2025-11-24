import React, { useEffect, useMemo, useState } from "react";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";

/**
 * segments: array of strings (sentence pieces). Placeholders exist between segments.
 * blanks: array of strings (options in the bottom bank).
 */
const FillBlanksDragDrop = ({
  segments = [],
  blanks = [],
  durationSeconds = 60,
  onNext,
}) => {
  const [left, setLeft] = useState(durationSeconds);

  useEffect(() => {
    if (left <= 0) {
      // auto-advance when time is up
      onNext?.();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onNext]);

  // Represent bank items as objects with id + label so identical labels are still unique.
  const initialBank = useMemo(
    () => blanks.map((label, i) => ({ id: `b-${i}-${label}`, label })),
    [blanks]
  );
  const [bank, setBank] = useState(initialBank);

  // placeholders length = segments.length - 1
  const placeholderCount = Math.max(0, segments.length - 1);
  // placements: array of either null or { id, label }
  const [placements, setPlacements] = useState(() =>
    Array(placeholderCount).fill(null)
  );

  const progress = useMemo(() => {
    if (durationSeconds <= 0) return 100;
    return Math.round(((durationSeconds - left) / durationSeconds) * 100);
  }, [durationSeconds, left]);

  /* Drag start handlers:
     - For bank items, send { type: 'bank', id }
     - For placed items, send { type: 'placement', fromIndex, id }
  */
  const handleBankDragStart = (e, itemId) => {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ type: "bank", id: itemId })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handlePlacementDragStart = (e, fromIndex) => {
    const item = placements[fromIndex];
    if (!item) return;
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ type: "placement", id: item.id, fromIndex })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const allowDrop = (e) => e.preventDefault();

  /**
   * Drop on placeholder (targetIndex)
   * Cases:
   *  - payload.type === 'bank'   => remove the bank item, put it in target, if target had something return it to bank
   *  - payload.type === 'placement' => move item from fromIndex to target, if target had something return it to bank
   *
   * Implementation note: compute new arrays from current state and then set both states once each.
   */
  const handleDropOnPlaceholder = (e, targetIndex) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    // copy current arrays
    const currBank = [...bank];
    const currPlacements = [...placements];

    if (payload.type === "bank") {
      const bankIndex = currBank.findIndex((b) => b.id === payload.id);
      if (bankIndex === -1) {
        // item not present in bank (already used) — nothing to do
        return;
      }

      const item = currBank.splice(bankIndex, 1)[0]; // remove from bank
      const existing = currPlacements[targetIndex]; // may be null or object

      // place the new item into target
      currPlacements[targetIndex] = item;

      // if there was an existing item, return it to the end of the bank
      if (existing != null) {
        currBank.push(existing);
      }

      // commit both states
      setPlacements(currPlacements);
      setBank(currBank);
    } else if (payload.type === "placement") {
      const { fromIndex } = payload;
      if (typeof fromIndex !== "number") return;
      if (fromIndex === targetIndex) return; // nothing to do if dropped in same slot

      const moving = currPlacements[fromIndex];
      if (!moving) return; // nothing to move

      const existing = currPlacements[targetIndex]; // may be null or object

      // move item into target and clear source
      currPlacements[targetIndex] = moving;
      currPlacements[fromIndex] = null;

      // if target had an existing item, return it to bank
      if (existing != null) {
        currBank.push(existing);
      }

      setPlacements(currPlacements);
      setBank(currBank);
    }
  };

  // Drop onto bank area: if dragging a placement item, return it to bank
  const handleDropOnBank = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    if (payload.type === "placement") {
      const { fromIndex } = payload;
      if (typeof fromIndex !== "number") return;

      const currBank = [...bank];
      const currPlacements = [...placements];

      const moving = currPlacements[fromIndex];
      if (!moving) return;

      currPlacements[fromIndex] = null;
      currBank.push(moving);

      setPlacements(currPlacements);
      setBank(currBank);
    }
    // if payload.type === 'bank' and dropped to bank, no-op
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="font-medium">Time remaining</div>
          <div>{left}s</div>
        </div>
        <Progress value={progress} />
      </div>

      {/* Top paragraph with inline placeholders */}
      <div className="rounded-lg border border-gray-200 p-6 bg-gray-50 text-gray-900 leading-relaxed text-lg">
        {segments.map((seg, idx) => (
          <span key={`seg-${idx}`} className="inline">
            {seg}
            {idx !== segments.length - 1 && (
              <span
                className="inline-block align-baseline rounded bg-[#d9d9d933] h-[30px] border-[0.05px] border-[#0000004d] min-w-[80px] mx-1 px-1 text-center text-sm leading-[30px] select-none"
                onDragOver={allowDrop}
                onDrop={(e) => handleDropOnPlaceholder(e, idx)}
              >
                {placements[idx] ? (
                  <span
                    draggable
                    onDragStart={(e) => handlePlacementDragStart(e, idx)}
                    className="inline-block px-1 cursor-grab"
                    title="Drag to move"
                  >
                    {placements[idx].label}
                  </span>
                ) : (
                  <span className="opacity-40 text-xs">drop here</span>
                )}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Bank area */}
      <div
        className="rounded-lg border border-gray-200 p-6 bg-gray-50 text-gray-900 leading-relaxed text-lg flex flex-wrap gap-3 min-h-[64px]"
        onDragOver={allowDrop}
        onDrop={handleDropOnBank}
      >
        {bank.length === 0 ? (
          <div className="text-sm opacity-60">No available blanks</div>
        ) : (
          bank.map((item) => (
            <span
              key={item.id}
              draggable
              onDragStart={(e) => handleBankDragStart(e, item.id)}
              className="border-[0.5px] py-2 px-4 rounded cursor-grab select-none bg-white"
            >
              {item.label}
            </span>
          ))
        )}
      </div>
      
    </div>
  );
};

export default FillBlanksDragDrop;
