"use client";
import { useEffect, useState } from "react";
import { useExamStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NameGate({ mocktestList }) {
  const [name, setName] = useState("");
  const setUserName = useExamStore((s) => s.setUserName);
  const setSessioId = useExamStore((s) => s.setSessionId);
  const setMockTestId = useExamStore((s) => s.setMockTestId);
  const url = useExamStore((s) => s.baseUrl);
  const [test, setTest] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const canContinue = name.trim().length >= 2 && selectedTest;
  0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <label className="block text-sm font-medium">Your name</label>
          <Input
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canContinue) handleContinue();
            }}
          />
          <div className="space-x-4">
            {mocktestList?.map((item) => (
              <button
                key={item.test_id}
                className={`border-1 border-blue-200 py-1 px-4 rounded bg-blue-200 text-blue-800 text-semibold cursor-pointer ${
                  selectedTest === item.test_id ? "bg-blue-400 text-white" : ""
                }`}
                onClick={() => handleClick(item.test_id)}
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
            Start exam
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  function handleContinue() {
    if (!canContinue) return;
    setUserName(name);
    setMockTestId(selectedTest);
    fetchTestDetails(name, selectedTest);
  }

  function handleClick(id) {
    setSelectedTest(id);
  }
  async function fetchTestDetails(name, selectedTest) {
    const regularUrl = `https://admin.abepte.accoladesweb.com/mocktest/start-test/`;
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mocktest_id: selectedTest }),
    };

    try {
      const res = await fetch(regularUrl, options);

      if (!res.ok) {
        throw new Error("Failed to fetch test details");
      }

      const responseData = await res.json();
      console.log("success", responseData.session_id);
      setSessioId(responseData.session_id);
    } catch (error) {
      console.error("Error fetching test details:", error);
      return null;
    }
  }
}
