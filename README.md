# ABE-PTE-FRONTEND-NEXT

Next.js frontend for the ABE PTE mock tests.

```bash
npm install
npm run dev
```

## Backend URL

The app calls the production backend (`https://admin.pte.abeedu.com/mocktest/`)
by default. To use another backend, for example a local Django server, create
`.env.local`:

```bash
NEXT_PUBLIC_MOCKTEST_BASE_URL=http://localhost:8000/mocktest/
```

Keep the trailing slash. `NEXT_PUBLIC_` values are built into the bundle, so
restart `npm run dev` or rebuild after changing it.
