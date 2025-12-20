"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function FillBlanksDropdown({
  segments = [],
  promptText,
  durationSeconds = 60,
  onNext,
}) {
  // selections by blank index; store selected option value
  const [selections, setSelections] = useState([]);
  const [left, setLeft] = useState(durationSeconds);

  useEffect(() => {
    setSelections(promptText.split(/______\s*\(\d+\)/g));
    console.log(selections);
    console.log(segments);

    // if (left <= 0) {
    //   // auto-advance when time is up
    //   onNext?.();
    //   return;
    // }
    // const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    // return () => clearTimeout(t);
  }, [left, onNext]);

  // const progress = useMemo(() => {
  //   if (durationSeconds <= 0) return 100;
  //   return Math.round(((durationSeconds - left) / durationSeconds) * 100);
  // }, [durationSeconds, left]);

  return (
    <div className="space-y-6">
      {/* <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="font-medium">Time remaining</div>
          <div>{left}s</div>
        </div>
        <Progress value={progress} />
      </div> */}

      <div className="rounded-lg border border-gray-200 p-6 bg-gray-50 text-gray-900 leading-relaxed text-lg">
        {/* {segments.map((seg, idx) => (
          <span key={`seg-${idx}`}>
            {seg}
            {idx < seg.length && (
              <SelectBlank
                idx={idx}
                options={seg[idx]?.options || []}
                value={selections[idx]}
                onChange={(val) => updateSelection(idx, val)}
                disabled={left <= 0}
              />
            )}
          </span>
        ))} */}
        
      </div>
    </div>
  );

  function updateSelection(i, val) {
    setSelections((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  }
}

function SelectBlank({ idx, options, value, onChange, disabled }) {
  return (
    <select
      aria-label={`Blank ${idx + 1}`}
      className="mx-1 inline-flex h-10 min-w-28 rounded-md border border-gray-300 bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:opacity-70"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="" disabled>
        Select…
      </option>
      {options.map((opt, i) => (
        <option key={`opt-${idx}-${i}`} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
