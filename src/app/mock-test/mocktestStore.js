import { create } from "zustand";

export const mocktestStore = create((set) => ({
  currentQuestion: null,
  currentQuestionName: null,
  selectedQuestion: null,
  isSideOpen: false,
  isMockTest: false,
  answer: {
    name: "",
    question_name: "",
    answer: "",
    asnwer_audio: "",
  },

  setIsSideOpen: (value) => set({ isSideOpen: value }),
  setCurrentQuestionName: (name) => set({ currentQuestionName: name }),
  setSelectedQuestion: (selected) => set({ selectedQuestion: selected }),
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setIsMockTest: (mockTest) => set({ isMockTest: mockTest }),
  setAnswer: (key, value) =>
    set((state) => ({
      answer: {
        ...state.answer,
        [key]: value, // Updates top-level: session_id, answer_audio, question_name
      },
    })),

  baseUrl: "https://admin.pte.abeedu.com/mocktest/",
  // baseUrl: "https://admin.abepte.accoladesweb.com/mocktest/",
}));
