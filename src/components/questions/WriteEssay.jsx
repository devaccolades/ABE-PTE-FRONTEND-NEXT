"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

export default function WriteEssay({
  promptText,
  durationSeconds,
  onNext,
}) {
  const [left, setLeft] = useState(durationSeconds);
  const [text, setText] = useState("");

  useEffect(() => {
    if (left <= 0) return; // timer done
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const progress = Math.round(
    ((durationSeconds - left) / durationSeconds) * 100
  );
  const disabled = left <= 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 text-gray-900">
        {promptText.map((text) => (
          <p className="leading-relaxed pt-4">{text}</p>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="font-medium">Time remaining</div>
          <div>{left}s</div>
        </div>
        <Progress value={progress} />
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Start writing your essay here..."
        disabled={disabled}
        rows={10}
      />

    </div>
  );

  function handleNext() {
    // As requested: do not submit; clear local data and move on
    setText("");
    onNext?.();
  }
}
