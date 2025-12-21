"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/**
 * MultipleChoiceSingle
 * - same props as your multi-select sample
 * - singleSelect: only one option can be selected at a time
 * - allowDeselect (optional): if true, clicking the already-selected option will clear selection
 */
export default function MultipleChoiceSingle({
  paragraphs = [],
  questionText = "Which one is correct?",
  options,
  durationSeconds = 0,
  onNext,
  allowDeselect = false,
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [left, setLeft] = useState(durationSeconds);

  const hasTimer = durationSeconds && durationSeconds > 0;

  useEffect(() => {
    if (!hasTimer) return;
    if (left <= 0) {
      onNext?.(selectedIndex);
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, hasTimer, onNext, selectedIndex]);

  const progress = useMemo(() => {
    if (!hasTimer) return 0;
    return Math.round(((durationSeconds - left) / durationSeconds) * 100);
  }, [durationSeconds, left, hasTimer]);

  function handleSelect(index) {
    setSelectedIndex((prev) => {
      if (prev === index) {
        return allowDeselect ? null : prev; // keep selected if deselect not allowed
      }
      return index;
    });
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

      <div className="rounded-lg border border-gray-200 p-6 bg-gray-50 text-gray-900 leading-relaxed space-y-3">
        {paragraphs.map((p, i) => (
          <p key={`p-${i}`} className="text-base">
            {p}
          </p>
        ))}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-800">{questionText}</div>
        <div className="grid gap-2">
          {options.map((opt, i) => {
            const checked = selectedIndex === i;
            return (
              <label
                key={`opt-${i}`}
                onClick={() => handleSelect(i)}
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-shadow
                  ${
                    checked
                      ? "border-sky-600 bg-sky-50 shadow-sm"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
              >
                <input
                  type="radio"
                  name="single-choice"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-600"
                  checked={checked}
                  onChange={() => handleSelect(i)}
                />
                <span className="text-sm text-gray-900 leading-relaxed">
                  {opt}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
