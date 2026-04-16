# MVP Defense Checklist

**Duration**: ~30 minutes | **Audience**: Judges, investors, advisors  
**Goal**: Demonstrate core functionality without crashes, with security baseline met.

---

## 📱 STUDENT FLOW (10 min)

> Use a student account. Pre-create 1 assignment in a group with this student.

### Signup / Login
- [ ] Click "Signup as Student"
- [ ] Fill email, password, full name
- [ ] System creates profile and redirects to student dashboard
- [ ] Can log out and log back in

### Dashboard
- [ ] Student dashboard loads (title: "Панель студента")
- [ ] See at least 1 active assignment in a group student is in
- [ ] Assignment shows: title, status, score (if completed)
- [ ] Can click on assignment card → opens assignment page

### Record & Submit
- [ ] Open assignment detail page
- [ ] See assignment text displayed
- [ ] Click "🎤 Record"
- [ ] Record for **at least 3 seconds** (red button lights up during recording)
- [ ] Click "Stop" when done
- [ ] See "Preview" of recording (can replay if implemented)
- [ ] Click "Submit" → shows loading spinner
- [ ] **Wait max 30 seconds** for Gemini response
- [ ] Feedback modal appears with:
  - [ ] Overall score (circular progress, 0-100)
  - [ ] Grammar score (circular progress)
  - [ ] Pronunciation score (circular progress)
  - [ ] Word-by-word highlighting (green/yellow/red)
  - [ ] Text-to-speech button (🔊) to hear reference pronunciation

### Multiple Attempts
- [ ] Close feedback modal
- [ ] See "Record Again" button
- [ ] Click to record second attempt
- [ ] Verify new submission works (different feedback or same)
- [ ] Go back to dashboard → assignment shows latest score

---

## 👨‍🏫 TEACHER FLOW (12 min)

> Use a teacher account.

### Login & Dashboard
- [ ] Click "Login" → enter teacher email/password
- [ ] Redirects to teacher dashboard (title: "Панель преподавателя")
- [ ] See "Мои группы" (My Groups) panel on left
- [ ] See "Мои задания" (My Assignments) table

### Group Management
- [ ] Click "Создать группу" (Create Group)
- [ ] Enter group name (e.g., "Test Group A")
- [ ] Click "Сохранить" (Save)
- [ ] **VERIFY**: Group appears immediately in "Мои группы" panel
- [ ] Group shows "0 студентов" (0 students)
- [ ] Click group → see members dialog
- [ ] Enter student email in "Add Student" field
- [ ] Click "Добавить" (Add)
- [ ] **VERIFY**: Student appears in members list
- [ ] **VERIFY**: Student count updates (e.g., "1 студент")

### Create Assignment (Manual)
- [ ] Click "Create Assignment" or button in dashboard
- [ ] Fill form:
  - [ ] Title: "Read the paragraph" (or any text)
  - [ ] Group: Select the group just created
  - [ ] Text type: "Reading"
  - [ ] Content: Paste a 3-4 sentence English paragraph
  - [ ] Click "Создать" (Create)
- [ ] **VERIFY**: Assignment appears immediately in "Мои задания" table
- [ ] **VERIFY**: Assignment shows created group

### Generate Assignment (AI)
- [ ] Click "Генерировать с помощью ИИ" (Generate with AI) button
- [ ] Fill form:
  - [ ] Topic: "Animals" (or any topic)
  - [ ] Group: Select a group
  - [ ] Difficulty: "Intermediate"
  - [ ] Click "Генерировать" (Generate)
- [ ] **WAIT**: Shows loading spinner (5-10 sec for Gemini)
- [ ] **VERIFY**: Assignment modal opens with generated title, content, vocabulary hints
- [ ] Click "Сохранить" (Save)
- [ ] **VERIFY**: New assignment appears in table

### View Analytics
- [ ] Click assignment row → see analytics panel expand below
- [ ] Analytics show:
  - [ ] "Completed: X submissions"
  - [ ] "Average score: YY.Y"
  - [ ] "Min / Max scores"
  - [ ] "Average attempts per student"
- [ ] **VERIFY**: Scores update after student submits (if student submitted during demo)

### Delete Assignment
- [ ] Right-click or find delete button on assignment row
- [ ] Click "Delete" / trash icon
- [ ] Confirm deletion
- [ ] **VERIFY**: Assignment disappears from table (soft-delete, students see it as archived)

---

## 🔐 SECURITY CHECKS (5 min)

### Credentials & Environment
- [ ] **No hardcoded API keys visible in code**
  ```bash
  grep -r "NEXT_PUBLIC_SUPABASE_ANON_KEY" src/
  # Should return 0 results in actual code files (only in .env.local)
  ```
- [ ] **`.env.local` is git-ignored**
  ```bash
  cat .gitignore | grep ".env.local"
  # Should return: .env.local
  ```
- [ ] **Environment variables loaded in `server.ts`**
  ```bash
  grep "process.env" src/utils/supabase/server.ts | head -3
  # Should show process.env.NEXT_PUBLIC_SUPABASE_URL
  ```

### Route Protection
- [ ] **Students cannot access `/teacher` routes**
  - [ ] Login as student
  - [ ] Try to navigate to `/teacher/dashboard` manually
  - [ ] Should redirect to `/student/dashboard`
- [ ] **Teachers cannot access `/student` routes**
  - [ ] Login as teacher
  - [ ] Try to navigate to `/student/dashboard` manually
  - [ ] Should redirect to `/teacher/dashboard`

### Role-Based Access
- [ ] **Assignments are group-filtered**
  - [ ] Student A is in Group 1
  - [ ] Student B is in Group 2
  - [ ] Log in as Student A
  - [ ] Student A should NOT see assignments for Group 2
  - [ ] If Student A tries `/student/assignments/{group2_assignment_id}`, should redirect

### Input Validation
- [ ] **Assignment title cannot be empty**
  - [ ] Try to create assignment with blank title
  - [ ] Should show error message
- [ ] **Audio submission requires 3+ seconds**
  - [ ] Record for 1 second
  - [ ] Try to submit
  - [ ] Should show error: "Recording too short (minimum 3 seconds)"

---

## 🎙️ AUDIO CHECKS (3 min)

### Recording
- [ ] **MediaRecorder starts on "Record" click**
  - [ ] Click "🎤 Record"
  - [ ] Microphone permission popup (if first time)
  - [ ] Timer starts counting up: 0s, 1s, 2s...
  - [ ] Red "Stop" button appears

### Duration & File Validation
- [ ] **3-second recording is accepted**
  - [ ] Record exactly 3 seconds
  - [ ] Click "Stop"
  - [ ] Click "Submit"
  - [ ] Should submit successfully
- [ ] **2-second recording is rejected**
  - [ ] Record exactly 2 seconds
  - [ ] Click "Stop"
  - [ ] Click "Submit"
  - [ ] Error message: "Recording too short"

### Upload & Playback
- [ ] **Recording uploads to Supabase**
  - [ ] After submission, check browser Network tab
  - [ ] Should see POST request to `supabase.co` with audio blob
  - [ ] Response status: 200
- [ ] **Text-to-Speech works** (if implemented)
  - [ ] In feedback modal, click 🔊 button
  - [ ] Browser TTS speaks the assignment text
  - [ ] Plays within 1-2 seconds

---

## 📊 ANALYTICS CHECKS (3 min)

### Per-Assignment Analytics
- [ ] Have **at least 2 students submit the same assignment**
- [ ] Teacher dashboard → expand assignment row
- [ ] Analytics panel shows:
  - [ ] ✅ "Completed: 2 submissions"
  - [ ] ✅ "Average score: XX.X"
  - [ ] ✅ "Min score: XX, Max score: YY"
  - [ ] ✅ "Average attempts: X.X"
- [ ] **Numbers are accurate**
  - [ ] If Student A scored 80, Student B scored 60
  - [ ] Average should be 70

### Assignment-Level Trends
- [ ] Create 2 assignments in same group
- [ ] Both have submissions
- [ ] Analytics show both assignments with different scores
- [ ] Higher-scored assignment stands out visually (or in data)

### (Optional) Per-Student Analytics
- [ ] If implemented: Teacher → "Student Progress" tab
- [ ] Shows table:
  - [ ] Column 1: Student name
  - [ ] Column 2: Assignment 1 score
  - [ ] Column 3: Assignment 2 score
  - [ ] Column 4: Avg score
  - [ ] Click student → see all their attempts with scores

---

## ⚠️ COMMON FAILURE MODES TO AVOID

### Audio Issues
- ❌ "Browser blocked microphone" → Test on HTTPS (or localhost)
- ❌ "Recording takes >30s to evaluate" → Gemini API timeout; check quota
- ❌ "0-byte file uploaded" → MediaRecorder failed; try different browser

### Group/Access Issues
- ❌ "Student sees all assignments, not just their group" → RLS policy not applied
- ❌ "Student can't see new assignment assigned to group" → Cache not revalidated
- ❌ "Assignment title empty error, but field has text" → Form validation state mismatch

### Analytics Issues
- ❌ "Analytics don't update after submission" → Missing `revalidatePath()`
- ❌ "Scores are always 0" → Gemini schema mismatch or parsing failure

### Credentials/Security
- ❌ "404 on Supabase requests" → Wrong URL in .env
- ❌ "403 Forbidden on audio upload" → Storage RLS policy too strict
- ❌ "Credentials visible in browser Network tab" → API key leaked in client code

---

## 🎯 PASS/FAIL CRITERIA

### MUST HAVE (All 3 must pass)
- [ ] **Student Flow**: Record 3s audio → Gemini evaluates → feedback shows (no crash)
- [ ] **Teacher Flow**: Create group → add student → create assignment → view analytics (no crash)
- [ ] **Security**: No hardcoded credentials, role-based access enforced

### NICE TO HAVE (Score higher with 2+)
- [ ] Per-student analytics (teacher can see individual progress)
- [ ] Audio playback (teacher can listen to recordings)
- [ ] Error messages are clear (not "Error" or stack traces)
- [ ] Mobile responsive (looks good on iPhone size)

### WILL FAIL IF
- [ ] Credentials hardcoded and visible
- [ ] Student A can see Student B's assignments
- [ ] Audio recording doesn't work (no microphone detected)
- [ ] Gemini API call timeout (>45 seconds with no error message)
- [ ] TypeScript compilation errors before demo

---

## 📋 PRE-DEMO CHECKLIST (Day-of)

**30 minutes before**:
- [ ] `npm run build` → succeeds with no errors
- [ ] `npm run typecheck` → no errors
- [ ] `npm run lint` → max-warnings 0 (no warnings)
- [ ] Start dev server: `npm run dev`
- [ ] Open `localhost:3000` → homepage loads
- [ ] Test student login → dashboard loads
- [ ] Test teacher login → dashboard loads
- [ ] **Microphone is working** (test in browser Settings → Privacy)

**5 minutes before**:
- [ ] Open 2 browser windows (Incognito for fresh login)
- [ ] Student window: logged in, on dashboard
- [ ] Teacher window: logged in, ready to create group
- [ ] Have a pre-written paragraph ready to paste (for manual assignment)

**During Demo**:
- [ ] Speak clearly and slowly (judges want to understand each action)
- [ ] Pause after each major step (let feedback load, let APIs respond)
- [ ] Have a backup: screenshot of working analytics in case live demo hangs

---

## ✅ AFTER DEMO

**Record what worked / what failed**:
- [ ] All 3 MUST HAVE items passed?
- [ ] Any crashes or errors?
- [ ] Any slow responses (>10 sec)?
- [ ] Any security issues caught?

**Use feedback to prioritize fixes**:
- Security issues → fix immediately (before deployment)
- UX/performance issues → fix for v1.1
- Missing features → log as post-MVP

---

**Total Demo Time**: 15–20 minutes (leaves 10 min for questions)  
**Good luck!** 🚀
