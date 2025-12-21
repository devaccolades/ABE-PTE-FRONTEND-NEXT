import NameGate from "@/components/NameGate";
import ExamShell from "@/components/ExamShell";
import { useExamStore } from "@/store";
import HomeWrapper from "@/components/HomeWrapper";

export default async function Home() {
  const res = await getMocktestList();
  const mocktestList = res.data;

  return (
    <main className="min-h-dvh bg-gradient-to-b from-sky-50 to-white text-gray-900">
      <div className="container mx-auto max-w-4xl p-6 min-h-dvh flex items-center justify-center">
        <ExamShell mocktestList={mocktestList} />
      </div>
    </main>
  );
}

async function getMocktestList() {
  try {
    const res = await fetch(
      "https://admin.abepte.accoladesweb.com/mocktest/mocktest-list/"
    );

    if (!res.ok) {
      throw new Error("Failed to fetch mocktest list");
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching mocktest list:", error);
    return { data: [] };
  }
}
