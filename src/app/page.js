import ExamShell from "@/components/ExamShell";
import Header from "@/components/Header";

// Primary responsibility: Render the exam shell; live question-paper discovery happens in NameGate.

/**
 * @description Home route for the full exam experience.
 * @returns {JSX.Element} Rendered home page content.
 */
export default function Home() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-sky-50 to-white text-gray-900">
        {/* Application Header */}
        <Header variant="home" />

      <div className="container mx-auto py-6 min-h-dvh flex items-center justify-center ">
        <ExamShell />
      </div>
    </main>
  );
}
