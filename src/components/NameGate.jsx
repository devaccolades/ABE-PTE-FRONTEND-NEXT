"use client";
import { useState } from "react";
import { useExamStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NameGate() {
  const [name, setName] = useState("");
  const setUserName = useExamStore((s) => s.setUserName);

  const canContinue = name.trim().length >= 2;

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
  }
}


