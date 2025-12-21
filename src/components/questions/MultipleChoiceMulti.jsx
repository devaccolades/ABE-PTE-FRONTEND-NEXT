"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function MultipleChoiceMulti({
  paragraphs = [],
  // questionText = "Which of the following statements are true?",
  options = [],
  durationSeconds = 0,
  onNext,
}) {
  const [selected, setSelected] = useState(() => new Set());
  const [left, setLeft] = useState(durationSeconds);

  const hasTimer = durationSeconds && durationSeconds > 0;

  useEffect(() => {
    console.log("paragraphs", paragraphs);
    console.log("options", options);
  }, []);

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

      {/* <div className="rounded-lg border border-gray-200 p-6 bg-gray-50 text-gray-900 leading-relaxed space-y-3">
        {paragraphs.map((p, i) => (
          <p key={`p-${i}`} className="text-base">
            {p}
          </p>
        ))}
      </div> */}

      <div className="space-y-3">
        {/* <div className="text-sm font-medium text-gray-800">{questionText}</div> */}
        <div className="grid gap-2">
          {options.map((opt, i) => (
            <label
              key={`opt-${i}`}
              className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-3 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-600"
                checked={selected.has(i)}
                onChange={(e) => toggle(i, e.target.checked)}
              />
              <span className="text-sm text-gray-900 leading-relaxed">
                {opt}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  function toggle(index, isChecked) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isChecked) next.add(index);
      else next.delete(index);
      return next;
    });
  }
}
