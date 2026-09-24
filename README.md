# Linguist AI

**Linguist AI** is a browser-based English pronunciation training platform that combines guided reading exercises with AI-generated feedback.

The application is built around two roles: teachers create and review assignments, while students record spoken responses and receive structured pronunciation results.

## Product workflow

~~~text
Teacher
  │
  ├── Create group
  ├── Add students
  └── Create / generate assignment
            │
            ▼
Student ──► Read aloud in browser
            │
            ▼
       Audio upload
            │
            ▼
       AI evaluation
       (Google Gemini)
            │
            ▼
     Pronunciation report
       ├── score
       ├── feedback
       └── word-level analysis
~~~

Submission audio is stored in Supabase Storage. Result audio is accessed through a protected application route rather than exposing a public storage URL.

## Key capabilities

### Teachers
- Create and manage study groups
- Add students to groups
- Create reading assignments manually
- Generate assignment content with Google Gemini
- Duplicate and archive assignments
- Review student results and dashboard metrics

### Students
- Sign up and sign in with email/password or Google OAuth
- Access assignments associated with their groups
- Record speech directly in the browser
- Submit audio for AI evaluation
- Review pronunciation scores, feedback, and analysis
- Replay supported audio and text-to-speech content
- Review submission history and manage profile data

## Engineering highlights

- Next.js App Router with server actions
- TypeScript throughout the application
- Role-aware routing and access control
- Supabase Auth, PostgreSQL-backed data, and private Storage
- AI generation/evaluation through Google Gemini
- Protected server-side audio access
- Form validation with Zod and React Hook Form
- Automated tests with Vitest
- Responsive UI built with Tailwind CSS

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS 4, Radix UI, Framer Motion, Lucide |
| Backend | Next.js Server Actions / Route Handlers |
| Data | Supabase PostgreSQL |
| Authentication | Supabase Auth, Google OAuth |
| Storage | Supabase Storage |
| AI | Google Gemini |
| Validation | Zod |
| Testing | Vitest |
| Charts | Recharts |

## Architecture

~~~text
src/
├── app/
│   ├── (auth)/                 # Sign-in and sign-up flows
│   ├── teacher/                # Teacher dashboard and assignment workflows
│   ├── student/                # Student learning and result workflows
│   ├── api/                    # Protected API routes
│   └── settings/               # Profile settings
├── components/                 # Shared UI and domain components
├── lib/                        # Application helpers and domain logic
├── utils/supabase/             # Supabase clients and helpers
└── types/                      # Shared TypeScript types

tests/                          # Automated tests
public/                         # Static assets
~~~

## Getting started

### Prerequisites

- Node.js 20+
- npm
- A Supabase project
- A Google Gemini API key

### 1. Install dependencies

~~~bash
npm install
~~~

### 2. Configure environment variables

Create a local environment file:

~~~env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_API_KEY=
~~~

Never commit local environment files or service credentials.

### 3. Configure Supabase

Configure the authentication providers and database/storage policies required by the application.

The current repository does not include the historical migrations directory referenced by older documentation, so database setup should be aligned with the schema and configuration available in the Supabase project used for development.

### 4. Run locally

~~~bash
npm run dev
~~~

Open the local development server at http://localhost:3000.

## Quality checks

~~~bash
npm run lint
npm run typecheck
npm run test
npm run build
~~~

## Security considerations

- Keep the Supabase service-role key server-side.
- Keep Gemini credentials server-side.
- Do not publish private audio storage URLs.
- Validate role and resource ownership on server-side actions.
- Keep local environment files out of version control.

## Current limitations

The product is focused on English reading and pronunciation practice. AI evaluation quality depends on the selected model, audio quality, and the reference text supplied for each assignment.

Experimental model-checking code exists for development purposes and should not be interpreted as a commitment to multiple production AI providers.

## Roadmap

- Expand pronunciation analytics
- Improve teacher reporting and progress visualization
- Strengthen automated end-to-end coverage
- Improve production deployment and observability
- Continue refining the AI evaluation pipeline
