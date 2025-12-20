// src/components/SectionTimerDisplay.jsx
import { Clock } from "lucide-react"; // Assuming you have lucide-react or similar icons

export default function SectionTimerDisplay({ formattedTime, isExpired }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-md border shadow-sm w-fit ml-auto 
      ${isExpired ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-gray-200 text-gray-700"}`}>
      <Clock className="w-4 h-4" />
      <span className="font-mono font-medium text-sm">
        {isExpired ? "Time's Up" : `Section Time: ${formattedTime}`}
      </span>
    </div>
  );
}