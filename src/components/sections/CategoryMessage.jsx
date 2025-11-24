import React, { useEffect, useState } from "react";
import { Progress } from "../ui/progress";

const CategoryMessage = ({ categoryName, message, duration, onNext }) => {
  const [recLeft, setRecLeft] = useState(duration);

  // Handle recording countdown
  useEffect(() => {
    if (recLeft <= 0) {
      return;
    }

    const t = setTimeout(() => setRecLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [recLeft]);

  const handleComplete = () => {
    onNext();
  };

  const recProgress = Math.round(
    ((duration - recLeft) / duration) * 100
  );

  return (
    <div className="space-y-6">
      <h1>Category: {categoryName}</h1>
      <div className="space-y-2">
        <h1>{message}</h1>
      </div>
      <div className="space-y-2">
        <Progress value={recProgress} onComplete={handleComplete} />
      </div>
    </div>
  );
};

export default CategoryMessage;

