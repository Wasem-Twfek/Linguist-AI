# Linguist AI Frontend Thesis Report

## UI Reference

The presentation analysis in this report is aligned with the saved interface screenshots in `docs/reference-ui-screens/`.

## 1. Project Overview

### What the system does

Linguist AI is a web application for English reading and pronunciation practice. The teacher creates reading assignments for a student group, and the student reads the text aloud inside the browser. The system records the audio, sends it for AI evaluation, and returns a structured report with scores, highlighted mistakes, and written feedback.

### Target users

- Teachers who create lessons, organize groups, assign tasks, and monitor performance.
- Students who complete reading tasks and receive immediate feedback.

### Main value of the system

- It reduces the teacher's manual workload by generating reading content with AI.
- It gives students immediate pronunciation and grammar feedback after each attempt.
- It gives teachers a simple dashboard with group management and assignment analytics.

## 2. User Roles and Scenarios

### Role 1: Teacher

#### Main teacher flow

1. The teacher opens the landing page and chooses the teacher role.
2. The teacher logs in with email/password or Google OAuth.
3. If the account was created with OAuth and has no role yet, the teacher chooses the role on the role-selection page.
4. The teacher enters the teacher dashboard.
5. The teacher creates a study group.
6. The teacher adds students to the group by email.
7. The teacher creates a lesson in one of two ways:
   - AI generation from topic + level + target group.
   - Manual creation with custom title, text, level, and target group.
8. The new assignment becomes visible for students in that group.
9. The teacher tracks assignment results in the analytics table.
10. If needed, the teacher duplicates the assignment to another group or hides it with soft delete.

#### Teacher dashboard scenario

- Group management: create group, open members dialog, add/remove students, delete group.
- Assignment management: generate lesson, create lesson manually, view existing lessons, duplicate lesson, delete lesson.
- Monitoring: view average score, attempt count, score trend, score distribution, and last activity.

### Role 2: Student

#### Main student flow

1. The student opens the landing page and chooses the student role.
2. The student signs up or logs in.
3. The teacher adds the student to a study group.
4. The student opens the student dashboard and sees active assignments from the groups they belong to.
5. The student opens one assignment.
6. The student reads the provided text and records audio in the browser.
7. The student submits the recording.
8. The system uploads the audio, sends it to Gemini for analysis, stores the result, and redirects the student back to the dashboard.
9. The student opens the result report modal, reviews scores and highlighted text, and can retry the assignment.

### Shared account flow

- Email/password authentication is supported.
- Google OAuth is supported.
- Profile completion is supported through the profile settings page.
- Role-based redirection sends teachers and students to different dashboards.

## 3. Frontend Structure

### Main routes in the app

#### Public routes

- `/` - landing page with role selection.
- `/login` - login page.
- `/signup` - registration page.
- `/signup/choose-role` - role selection after OAuth when role is still empty.
- `/auth/callback` - client-side OAuth callback flow.

#### Protected shared route

- `/settings/profile` - profile update page.

#### Teacher routes

- `/teacher/dashboard` - main teacher workspace.
- `/teacher/assignments/create` - separate fallback page for manual lesson creation.

#### Student routes

- `/student/dashboard` - student assignment list.
- `/student/assignments/[id]` - assignment detail page with audio recording.

#### Technical routes

- `/api/test-models` - diagnostic route for checking available Gemini models.
- `/logout` - server logout route.

### Main frontend components

#### Shared components

- `DashboardHeader` - common authenticated header.
- `AuthGuard` - client-side protection against showing cached protected pages after logout.
- `LogoutButton` - signs the user out from Supabase.

#### Auth components

- `SocialAuth` - Google OAuth entry point.
- `ChooseRoleForm` - role selection after OAuth.

#### Teacher components

- `TeacherDashboardClient` - teacher dashboard state container.
- `GenerateAssignmentForm` - AI lesson generation form.
- `CreateManualAssignmentForm` - inline manual lesson creation form.
- `AssignmentsTable` - assignment list, analytics view, duplicate action, delete action.
- `GroupsPanel` - group list and group creation entry point.
- `CreateGroupDialog` - create group modal.
- `GroupMembersDialog` - add/remove students inside a group.

#### Student components

- `StudentDashboardClient` - assignment list refresh logic.
- `AssignmentCard` - each student assignment card.
- `AudioRecorder` - in-browser recording and submission flow.
- `FeedbackModal` - result report dialog.
- `InlineHighlightedText` - word-level error highlighting.
- `TTSButton` - browser text-to-speech playback for the original text.

### How components are organized

- The project uses the Next.js App Router and keeps route-specific UI close to each route folder.
- Server-rendered pages load authenticated data and pass it into client components as initial props.
- Shared reusable components live in `src/components`.
- shadcn/ui primitives live in `src/components/ui`.
- Server-side data logic is mostly implemented as route-local server actions.
- Shared utility logic is placed in `src/lib` and `src/utils`.

### State management approach

The frontend uses a hybrid state model:

- Server Components load the initial page data from Supabase.
- Server Actions handle mutations such as login-related role completion, lesson creation, group changes, profile update, and audio submission.
- Client Components use local `useState`, `useEffect`, `useCallback`, and `useRef` for dialogs, forms, polling, recording state, and optimistic UI updates.
- `router.refresh()` and `revalidatePath()` keep server-rendered data in sync after mutations.
- `localStorage` storage events are used as a lightweight cross-tab or cross-window refresh signal.
- There is no global store such as Redux or Zustand in the current implementation.

## 4. Frontend Requirements Based on the Implementation

Based on the current code, the frontend must support the following:

- Public landing page with role selection.
- Email/password login and signup.
- Google OAuth login.
- Post-OAuth role selection.
- Role-based route protection for teacher and student pages.
- Profile editing for full name.
- Teacher dashboard for creating and managing study groups.
- Teacher ability to add and remove students by email.
- Teacher ability to generate reading assignments with AI.
- Teacher ability to create reading assignments manually.
- Teacher ability to duplicate assignments to another group.
- Teacher ability to soft delete assignments and groups.
- Student dashboard that shows only assignments for the student's active groups.
- Assignment page with readable lesson content.
- Browser audio recording with microphone access.
- Audio preview, rerecord, and submission actions.
- AI-based evaluation of reading attempts.
- Result visualization with score circles, highlighted text, and written feedback.
- Basic text-to-speech support for hearing the reference text.
- Assignment-level analytics for the teacher dashboard.
- Error handling, loading states, and validation messages.

## 5. Technology Stack Justification

### Why Next.js is used

Next.js fits this system because it provides:

- App Router structure for separating public, teacher, and student routes.
- Server Components for protected page rendering and initial data fetching.
- Server Actions for secure mutations without building a separate REST backend for every operation.
- Middleware for route protection and role-based redirects.
- Easy integration with Supabase SSR.

For this project, Next.js reduces backend boilerplate while keeping the frontend and server-side logic in one codebase.

### Why React is used

React is a good match because the interface is highly interactive:

- forms,
- modals,
- dashboard tables,
- recording controls,
- analytics expansion panels,
- real-time refresh behavior.

React components make it easier to reuse and compose these interface pieces.

### Why TypeScript is used

TypeScript improves reliability in a system with many structured data flows:

- Supabase table rows,
- AI response payloads,
- component props,
- analytics objects,
- role-based logic.

The codebase clearly relies on typed interfaces for assignments, sessions, results, analytics, and Supabase responses.

### Why Supabase is used

Supabase is used as the backend platform because it gives the project several services in one stack:

- authentication,
- PostgreSQL database,
- storage for uploaded audio,
- SSR-friendly client libraries,
- row-level security support,
- fast CRUD development.

This is a practical choice for a graduation project because it reduces infrastructure complexity while still supporting real user accounts and stored results.

### Why Gemini API is used

Gemini is used for two core AI tasks:

- generating reading lesson content for teachers,
- evaluating student audio submissions.

This makes Gemini a strong fit because the project needs both language generation and multimodal analysis. The implementation also uses structured JSON schema output, which is useful for predictable frontend rendering.

## 6. System Architecture

### High-level architecture

The system is organized as a web frontend with integrated server-side logic:

1. The browser renders the Next.js frontend.
2. Protected pages and server actions communicate with Supabase for auth, database access, and storage.
3. AI-related server actions call Gemini.
4. The result is saved in Supabase and rendered back in the frontend.

### How frontend communicates with backend

- The browser talks to Supabase Auth on login/logout and during client auth checks.
- Next.js Server Components query Supabase on the server for protected page data.
- Next.js Server Actions perform write operations such as:
  - create group,
  - add student,
  - create assignment,
  - submit attempt,
  - update profile.
- Gemini calls are made only inside server actions, not directly from the browser.

### Data flow for assignment evaluation

1. Student opens assignment page.
2. Frontend requests microphone access and records audio.
3. Frontend sends the audio blob, assignment id, original text, and duration to the server action.
4. Server action uploads the audio file to Supabase Storage.
5. Server action converts the audio to Base64 and sends it to Gemini with the original text and evaluation prompt.
6. Gemini returns transcript, scores, feedback, and word-level analysis.
7. Server action stores the session in `sessions` and the evaluation in `results`.
8. Teacher dashboard analytics are refreshed from the saved data.
9. Student dashboard and report modal show the stored result.

## 7. Key Features Implemented

### Authentication

- Email/password signup and login.
- Google OAuth login.
- OAuth callback flow with role completion for first-time users.
- Logout handling and redirect.

### Role-based access

- Middleware checks whether the route belongs to the teacher or student area.
- Protected pages also re-check the role server-side.
- `AuthGuard` adds a client-side layer to avoid showing protected cached content after logout.

### Audio recording

- Recording is done in the browser through `MediaRecorder`.
- The student can start, stop, preview, rerecord, and submit the audio.
- Duration and file size are validated before AI evaluation.

### AI evaluation

- Gemini evaluates the reading attempt.
- The server expects structured output with:
  - transcript,
  - overall score,
  - grammar score,
  - pronunciation score,
  - written feedback,
  - word-level analysis.

### Result visualization

- Circular score indicators for overall, grammar, and pronunciation scores.
- Inline text highlighting for correct words, words needing improvement, and wrong words.
- Text-to-speech button for hearing the reference text.
- Written feedback block in Russian for the learner.

### Analytics

- Assignment-level analytics on the teacher dashboard.
- Total students, completed attempts, min and max score, average attempts.
- Trend line chart over time.
- Score distribution bands.
- Last activity indicator.

## 8. API and Data Interaction

### Main frontend-server interactions

#### Authentication interactions

- `signUp`
- `signInWithPassword`
- `signInWithOAuth`
- `exchangeCodeForSession`
- `signOut`
- `getUser`

#### Teacher actions

- `generateAssignment(topic, level, groupId)`
- `createManualAssignment(...)`
- `duplicateAssignmentToGroup(...)`
- `deleteAssignment(assignmentId)`
- `createGroup(name)`
- `getTeacherGroups()`
- `getGroupMembers(groupId)`
- `addStudentToGroup(groupId, studentEmail)`
- `removeStudentFromGroup(groupId, memberId)`
- `deleteGroup(groupId)`
- `refreshAssignmentAnalytics(assignmentIds)`

#### Student actions

- `getStudentAssignments()`
- `submitAttempt(assignmentId, audioBlob, originalText, audioDurationSeconds)`

#### Shared or profile actions

- `updateProfileName(fullName)`

#### Technical endpoint

- `GET /api/test-models`

### What data is sent and received

#### Teacher lesson generation

Sent:

- topic,
- difficulty level,
- target group id.

Received:

- assignment title,
- generated text,
- vocabulary hints,
- saved assignment record.

#### Manual lesson creation

Sent:

- title,
- topic,
- level,
- group id,
- lesson text.

Received:

- saved assignment record.

#### Student attempt submission

Sent:

- assignment id,
- audio blob,
- original text,
- optional recording duration.

Gemini returns:

- transcript,
- overall score,
- grammar score,
- pronunciation score,
- written feedback,
- `word_analysis`.

Stored result returned to frontend:

- success/error state,
- score values,
- transcript,
- feedback,
- analysis data.

### How results are stored

The implementation stores data across several tables:

- `profiles` - user identity, name, email, role.
- `study_groups` - teacher-owned groups.
- `group_members` - student membership in groups.
- `assignments` - reading lessons linked to groups.
- `sessions` - each student attempt, including audio URL and attempt number.
- `results` - scores, feedback, and analysis for a session.
- `ai_generation_logs` - teacher-side AI generation rate limiting.

Audio files are stored in the Supabase Storage bucket `assignment-audio`.

## 9. Important Technical Decisions

The codebase shows several important design decisions:

### 1. Group-based assignment visibility

Assignments are not global. Each assignment is linked to one study group, and students only see assignments from the active groups they belong to. This is the core access model of the application.

### 2. Soft delete instead of hard delete

Assignments and groups are hidden by setting `is_active = true/false` logic instead of deleting records permanently. This preserves student history and avoids breaking relations with sessions and results.

### 3. Role enforcement in multiple layers

The system checks role and authentication in:

- middleware,
- server-rendered pages,
- client-side auth guard,
- server actions.

This layered approach improves safety and user experience.

### 4. Structured AI output

Both AI generation and AI evaluation use Gemini with JSON schema constraints. This is an important design choice because the frontend can reliably render the returned data.

### 5. Fast dashboard refresh without full realtime infrastructure

The system uses:

- `revalidatePath`,
- `router.refresh()`,
- periodic polling,
- `localStorage` storage events.

This is a simple alternative to WebSockets or Supabase Realtime.

### 6. Analytics based on best attempt per student

The analytics logic does not simply average all attempts. It calculates average, min, max, and distribution from each student's best attempt, which makes teacher analytics more meaningful for progress tracking.

### 7. Audio validation before persistence of the result

The student submission flow validates file size, minimum duration, transcript existence, and AI parsing before storing a final result. This prevents low-quality or empty attempts from becoming official results.

## 10. Risks and Limitations

### Missing or incomplete features

- There is no admin role or broader institution management.
- There is no teacher UI for detailed student-by-student history pages.
- There is no file-upload fallback if microphone recording is unsupported.
- The schema includes extra entities such as comments and result errors, but the current UI does not expose them.
- Password reset and deeper account recovery flows are not implemented in the visible frontend.

### Technical weak points visible in the code

#### 1. Submission hardening can be improved

The student assignment page checks that the student belongs to the correct group, but the `submitAttempt` server action does not repeat the same group-membership verification. For a production system, the submission action should validate assignment ownership and active group membership again on the server.

#### 2. Duplicate lesson-creation paths

The project contains both:

- the main inline manual creation form on `/teacher/dashboard`,
- the separate `/teacher/assignments/create` page.

This duplicates business logic and increases maintenance cost.

#### 3. Polling-based synchronization

The dashboards refresh using polling every few seconds plus browser storage events. This is simple and works for a thesis project, but it is less scalable than realtime channels.

#### 4. Strong dependency on external AI availability

Lesson generation and pronunciation evaluation depend on Gemini availability, quota, and network stability. The code includes error handling, but service interruptions still affect the user experience.

#### 5. Browser dependency for media features

Audio recording and text-to-speech rely on browser APIs. Behavior may differ across browsers and devices, especially mobile browsers or browsers with strict permissions.

#### 6. Supabase type drift

The generated TypeScript database types are not fully aligned with the latest migrations, because some code uses `any` casts for fields such as `study_groups.is_active`. This weakens type safety.

## 11. Suggested Diagrams for Presentation

For the pre-defense presentation, the following diagrams would be useful:

### 1. Use case diagram

Show the two main actors:

- Teacher
- Student

Main use cases:

- login/signup,
- create group,
- add student,
- create lesson,
- complete lesson,
- view analytics,
- view report.

### 2. Teacher user flow diagram

Recommended flow:

Landing page -> login/signup -> teacher dashboard -> create group -> add students -> create assignment -> monitor analytics.

### 3. Student user flow diagram

Recommended flow:

Landing page -> login/signup -> student dashboard -> open assignment -> record audio -> submit -> receive report -> retry.

### 4. System architecture diagram

Show:

- Browser frontend,
- Next.js app,
- Supabase Auth,
- Supabase Database,
- Supabase Storage,
- Gemini API.

### 5. Sequence diagram for audio evaluation

Recommended order:

Student -> Frontend -> Server Action -> Supabase Storage -> Gemini -> Supabase Database -> Frontend report.

### 6. Component structure diagram

Show the main route pages and their main child components, especially:

- teacher dashboard,
- student dashboard,
- assignment page,
- feedback modal.

### 7. Data model / ER diagram

Recommended entities:

- profiles,
- study_groups,
- group_members,
- assignments,
- sessions,
- results,
- ai_generation_logs.

## Presentation Summary

If you present this project in a pre-defense, the clearest message is:

Linguist AI is a role-based educational web platform where teachers create English reading tasks for groups, students complete them through browser audio recording, and Gemini-powered evaluation returns instant pronunciation feedback while Supabase stores the academic history and analytics.
