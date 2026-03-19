import { create } from "zustand";

// Primary responsibility: Holds client-side state for the mock-test practice route.
// Architecture role: Lightweight store for selecting categories/questions and capturing single-question answers.

/**
 * @typedef {Object} MockTestAnswerState
 * @property {string} name - Candidate name used when submitting a single-question response.
 * @property {string} question_name - Selected question identifier/name used by the backend.
 * @property {string|Object} answer - Textual/structured answer payload (string or object depending on question type).
 * @property {Blob|string} asnwer_audio - Optional audio payload for speaking tasks (kept as a Blob while recording).
 */

/**
 * @typedef {Object} MockTestStoreState
 * @property {string|null} currentQuestion - Currently selected question category/subsection id (e.g., "read_aloud").
 * @property {string|null} currentQuestionName - Human-friendly title for the selected category shown in the sidebar.
 * @property {any|null} selectedQuestion - Concrete question chosen from the sidebar list (backend payload).
 * @property {boolean} isSideOpen - Controls the sidebar overlay visibility.
 * @property {boolean} isMockTest - Flag indicating the app is in mock-test mode (used by other components as needed).
 * @property {MockTestAnswerState} answer - Current single-question answer payload.
 * @property {string} baseUrl - Backend base URL used for mock-test endpoints.
 * @property {(value: boolean) => void} setIsSideOpen - Opens/closes the sidebar overlay.
 * @property {(name: string|null) => void} setCurrentQuestionName - Sets the display title for the selected category.
 * @property {(selected: any|null) => void} setSelectedQuestion - Sets the selected question payload.
 * @property {(question: string|null) => void} setCurrentQuestion - Sets the selected category id (subsection).
 * @property {(mockTest: boolean) => void} setIsMockTest - Enables/disables mock-test mode.
 * @property {(key: keyof MockTestAnswerState, value: any) => void} setAnswer - Updates a top-level property of `answer`.
 */

/**
 * @description Zustand store for mock-test mode (category selection, question selection, and answer payload).
 * @returns {(selector?: Function) => any} Zustand hook with state and actions.
 */
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

  /**
   * @description Opens/closes the sidebar overlay.
   * @param {boolean} value - True to show sidebar; false to hide it.
   * @returns {void}
   */
  setIsSideOpen: (value) => set({ isSideOpen: value }),
  /**
   * @description Sets the title for the currently selected question category.
   * @param {string|null} name - Display label shown in the sidebar header.
   * @returns {void}
   */
  setCurrentQuestionName: (name) => set({ currentQuestionName: name }),
  /**
   * @description Stores the selected concrete question payload (picked from the sidebar list).
   * @param {any|null} selected - Backend question object or null.
   * @returns {void}
   */
  setSelectedQuestion: (selected) => set({ selectedQuestion: selected }),
  /**
   * @description Sets the active question category/subsection id.
   * @param {string|null} question - Category identifier used by the backend to list questions.
   * @returns {void}
   */
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  /**
   * @description Enables/disables mock-test mode.
   * @param {boolean} mockTest - True when running mock-test route; false otherwise.
   * @returns {void}
   */
  setIsMockTest: (mockTest) => set({ isMockTest: mockTest }),
  /**
   * @description Updates a top-level property of the `answer` payload for mock-test submission.
   * @param {keyof MockTestAnswerState} key - Answer field to update.
   * @param {any} value - Value to store for the given key.
   * @returns {void}
   */
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
