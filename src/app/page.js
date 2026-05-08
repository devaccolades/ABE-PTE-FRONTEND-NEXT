import NameGate from "@/components/NameGate";
import ExamShell from "@/components/ExamShell";
import { useExamStore } from "@/store";
import HomeWrapper from "@/components/HomeWrapper";

// Primary responsibility: Server entry route that fetches mock test data and renders the exam shell.
// Architecture role: Bridges initial server-side data fetching to the client-side exam runtime.

/**
 * @description Home route that fetches the mock test list and renders the exam container.
 * @returns {Promise<JSX.Element>} Rendered home page content.
 */
export default async function Home() {
  const res = await getMocktestList();
  const mocktestList = res.data;

  return (
    <main className="min-h-dvh bg-gradient-to-b from-sky-50 to-white text-gray-900">
      <div className="container mx-auto max-w-4xl p-6 min-h-dvh flex items-center justify-center ">
        <ExamShell mocktestList={mocktestList} />
      </div>
    </main>
  );
}

/**
 * @description Fetches the list of available mock tests from the backend.
 * This is intentionally executed on the server (App Router) to keep initial data loading simple and to
 * provide the client exam shell with the options needed for gating/selection flows.
 * @returns {Promise<{data: any[]}>} API response normalized to include a `data` array (empty on failure).
 */
async function getMocktestList() {
  try {
    const res = await fetch("https://admin.pte.abeedu.com/mocktest/mocktest-list/")

    if (!res.ok) {
      throw new Error("Failed to fetch mocktest list");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching mocktest list:", error);
    return { data: [] };
  }
}
