Project: ABE-PTE-FRONTEND-NEXT — Copilot Instructions

Summary
- This is a Next.js (app router) frontend for an exam/mocktest UI. Server components live under `src/app/` and interactive pieces are client components under `src/components/` (they use `"use client"`). State is centrally managed with a `zustand` store at `src/store.js`.

Key workflows & commands
- Start dev server: `npm install` then `npm run dev` (uses Next 16 app-router behavior).
- Build for production: `npm run build` then `npm run start`.
- Lint: `npm run lint` (project uses ESLint and `eslint-config-next`).

Important architectural notes
- App router: `src/app/layout.js` and `src/app/page.js` are server components by default. Use `"use client"` at top of files that need browser-only APIs (see `src/components/ExamShell.jsx`).
- Central state: `src/store.js` exports `useExamStore` (zustand). Mutations happen through methods like `setAnswerKey`, `setNestedAnswer`, `resetAnswer`. Read `useExamStore.getState()` for synchronous access in non-react places.
- API integration points: `store.baseUrl` holds the backend base URL. Many fetch calls use absolute endpoints built from that value (see `src/app/page.js` and `src/components/ExamShell.jsx`). A commented local baseUrl is available in `src/store.js` for local backend testing.

Data & UI patterns to follow
- Question routing: incoming question JSON uses `subsection` (aka `q.subsection`) to determine which question component to mount. The consolidated router is `renderQuestionComponent` in `src/components/ExamShell.jsx`. When adding new question types, add a `case` there and create the component under `src/components/questions/`.
- Answer shape: `useExamStore().answer` is an object with top-level keys `session_id`, `question_name`, `answer` (often an object), and `answer_audio` (Blob). Use `setAnswerKey('answer', {})` and `setAnswerKey('answer_audio', null)` to clear answers between questions — this is critical to prevent audio/answers leaking to next question (see submission logic in `ExamShell`).
- Local persistence: session and progress are rehydrated from localStorage keys: `exam_session_id`, `exam_user_name`, `current_question`, `next_question` (see `ExamShell` rehydration logic). Respect these keys when adding persistence changes.

Networking & submission behavior
- Fetch patterns: server components may use `fetch()` (server-side). Client components use `fetch()` for question loading and submission (see `ExamShell.loadQuestion` and `handleModalNext`). Follow the same error handling pattern: check `res.ok`, throw when needed, and fall back to empty arrays or alerts for UX.
- Submission: `ExamShell` builds a `FormData` and posts to `${baseUrl}user-response/`. If `answer_audio` is a `Blob`, it's appended with filename `answer.webm`. After a successful post the store must be cleared of `answer` and `answer_audio` before loading the next question.

Conventions & code style
- File locations:
  - Interactive UI: `src/components/*` and `src/components/questions/*`.
  - Shared UI primitives: `src/components/ui/*`.
  - App entry: `src/app/*`.
  - Static assets: `public/` (audio/images used by sample questions).
- Naming: question `subsection` values map to components with hyphen/underscore variants; keep `subsection` values stable when changing backend payloads.
- Client/server boundary: avoid using `window`, `localStorage`, or browser APIs inside server components. Move such logic into client components (`"use client"`).

When editing or adding features
- New question types: add renderer in `renderQuestionComponent` and a new component under `src/components/questions/`. Update any mock or `apiClient` stubs in `src/store.js` if you need local dev data.
- State changes: prefer adding methods to `useExamStore` instead of mutating the state object directly. Use `setAnswerKey`/`setNestedAnswer` patterns for answers.

What *not* to change silently
- Do not change localStorage keys (`exam_session_id`, `exam_user_name`, `current_question`, `next_question`) without updating the rehydration logic in `ExamShell`.
- Do not remove the clearing of `answer` / `answer_audio` after submission — this causes the next question to inherit the previous response.

Files to reference for examples
- `src/components/ExamShell.jsx` — question routing, fetch/load/submit flow, rehydration, and important store interactions.
- `src/store.js` — central state shape, mutations, `baseUrl` and `apiClient` stubs.
- `src/app/page.js` — example server-side fetching of mocktest list and composition of `ExamShell`.

If anything here is unclear or you want me to include specific development tips (debugging fetches, mocking backend locally, or adding a unit test for a question component), tell me which area to expand and I'll iterate.
