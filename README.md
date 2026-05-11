# Linguist AI

Linguist AI is a browser-based web platform for English pronunciation training with AI feedback. It is designed for teachers who need a practical way to assign reading tasks and monitor progress, and for students who need fast, clear feedback on spoken English without leaving the browser.

This repository contains the application code, database migrations, automated tests, and supporting project materials used for the VKR work around the product.

## What the project does

The current implementation is centered on guided reading and pronunciation practice.

Teachers can:

- create and manage study groups;
- add students to groups by email;
- create reading assignments manually;
- generate reading assignments with Google Gemini;
- duplicate assignments between groups;
- archive assignments with soft delete behavior;
- review dashboard metrics and recent student results;
- open detailed pronunciation reports for completed submissions.

Students can:

- sign in with email/password or Google OAuth;
- access only the assignments available to their groups;
- record speech directly in the browser;
- submit audio for AI evaluation;
- view detailed result reports with scores, feedback, and word-level analysis;
- replay original text with text-to-speech support;
- listen to stored submission audio when access is allowed;
- review submission history and update profile information.

## How the workflow looks

1. A teacher creates a group in the teacher dashboard.
2. The teacher adds students and prepares a reading assignment, either manually or through Gemini-based generation.
3. A student opens the assignment page and records a reading attempt in the browser.
4. The audio is uploaded to Supabase Storage and evaluated through the Google Gemini API.
5. The system saves the result, builds a report, and makes it available to the student and the assignment owner.

## Verified implementation details

- Stable AI generation and evaluation use Google Gemini through `@google/generative-ai`.
- The current production workflow is implemented in [`src/app/teacher/dashboard/actions.ts`](src/app/teacher/dashboard/actions.ts) and [`src/app/student/assignments/[id]/actions.ts`](src/app/student/assignments/%5Bid%5D/actions.ts).
- Role-based route protection is enforced in [`middleware.ts`](middleware.ts).
- Result audio is served through a protected internal route at [`src/app/api/results/[id]/audio/route.ts`](src/app/api/results/%5Bid%5D/audio/route.ts), not exposed as a public storage URL.
- Tests cover access control, audio handling, and security-sensitive server actions in the `tests/` directory.

## Current scope and limitations

- The implemented learning flow is focused on reading aloud and pronunciation analysis.
- Google Gemini is the current stable AI integration.
- Experimental model checking exists in [`src/app/api/test-models/route.ts`](src/app/api/test-models/route.ts), but alternative model support should be treated as testing or future work unless additional production code is added.
- Database setup depends on the Supabase schema, storage rules, and helper SQL files in the `migrations/` folder.

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Database, and Storage
- Google Gemini API
- Vitest

## Key application areas

- Landing page: `src/app/page.tsx`
- Login and sign-up flow: `src/app/(auth)/`
- Teacher dashboard: `src/app/teacher/dashboard/`
- Student dashboard: `src/app/student/dashboard/`
- Assignment submission flow: `src/app/student/assignments/[id]/`
- Result pages: `src/app/student/results/[id]/` and `src/app/teacher/results/[id]/`
- Profile settings: `src/app/settings/profile/`
- Shared report UI: `src/components/report-view.tsx`
- Supabase utilities: `src/utils/supabase/`

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a local `.env.local` file with the variables required by the current codebase:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_API_KEY=
```

Notes:

- `GOOGLE_API_KEY` is required for assignment generation and pronunciation evaluation.
- `SUPABASE_SERVICE_ROLE_KEY` is used by server-side audio access helpers.
- Google OAuth sign-in also requires the corresponding Supabase auth provider configuration and redirect URL setup.

### 3. Apply database setup

Apply the SQL files from `migrations/` to the Supabase project. These migrations include helper functions, profile and group support updates, AI generation logging, and private audio storage policies.

### 4. Run the development server

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
```

## Repository structure

```text
src/
  app/                 Next.js App Router pages, routes, and server actions
  components/          Shared UI and domain components
  lib/                 Analytics, audio, validation, and helper logic
  utils/               Supabase and browser utility modules
migrations/            SQL changes for Supabase
tests/                 Vitest coverage for security and audio flows
public/                Static assets
types/                 Shared TypeScript types
```

## Why this repository exists

The project aims to make pronunciation practice more structured and more scalable. Teachers get a simpler way to assign and review spoken reading tasks, while students get immediate feedback in a format that is easier to revisit than a one-time classroom correction.

For this repository, the priority is accuracy over hype: the README reflects the functionality that is currently implemented in code and tested in the project structure above.
