"use client";
import { useState } from "react";
import { useExamStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NameGate({ mocktestList }) {
  const [name, setName] = useState("");
  const [selectedTest, setSelectedTest] = useState(null);

  const setSessionId = useExamStore((s) => s.setSessionId);
  const setMockTestId = useExamStore((s) => s.setMockTestId);
  const baseUrl = useExamStore((s) => s.baseUrl);

  const { setUserName } = useExamStore();

  const canContinue = name.trim().length >= 2 && selectedTest;

  // 🔹 Start exam
  const handleContinue = async () => {
    if (!canContinue) return;
    localStorage.setItem("exam_user_name", name);
    setUserName(name);
    setMockTestId(selectedTest);

    try {
      const res = await fetch(`${baseUrl}start-test/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mocktest_id: selectedTest,
        }),
      });

      if (!res.ok) throw new Error("Failed to start exam");

      const data = await res.json();

      // ✅ Store session
      setSessionId(data.session_id);
      localStorage.setItem("exam_session_id", data.session_id);
    } catch (err) {
      console.error("Start exam error:", err);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Your name</label>
          <Input
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleContinue()}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {mocktestList &&
            mocktestList.map((item) => (
              <button
                key={item.test_id}
                className={`px-4 py-1 rounded border text-sm ${
                  selectedTest === item.test_id
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-800"
                }`}
                onClick={() => setSelectedTest(item.test_id)}
              >
                {item.title}
              </button>
            ))}
        </div>

        <Button
          className="w-full"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          Start Exam
        </Button>
      </CardContent>
    </Card>
  );
}
