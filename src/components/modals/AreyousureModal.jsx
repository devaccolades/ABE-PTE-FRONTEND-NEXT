import React from "react";

const AreyousureModal = ({
  onClose,
  onNext,
  isLoading,
  content = "Do you want to move on to the next question? You won't be able to return to this one.",
  nextQuestion = "Next Question",
}) => {
  return (
    <div className="fixed inset-0 z-[100] h-full w-full bg-black/60 flex justify-center items-center backdrop-blur-sm">
      <div className="w-[90%] max-w-[450px] bg-white rounded-2xl shadow-2xl p-8 flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
        <div className="space-y-2">
          <p className="text-2xl font-bold text-gray-800 leading-tight">
            Are you sure?
          </p>
          <p className="text-gray-600 text-lg">{content}</p>
        </div>

        <div className="flex justify-end items-center gap-3">
          <button
            disabled={isLoading}
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go Back
          </button>

          <button
            disabled={isLoading}
            onClick={onNext}
            className="min-w-[120px] flex items-center justify-center px-6 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-all shadow-md active:scale-95 disabled:bg-sky-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Saving...</span>
              </div>
            ) : (
              nextQuestion
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AreyousureModal;
