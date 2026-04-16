# Figma Presentation Spec

This document converts the uploaded application screenshots into a Figma-ready structure for a graduation thesis presentation.

## Status

The screenshot analysis and frame/page plan are complete. In this session, the Figma plugin bundle is present locally, but the required Figma MCP write tools are not exposed, so the actual Figma file could not be created from here.

## Page 1: Screens

Create one Figma page named `Screens`.

Use one separate frame per screen and place the corresponding screenshot inside each frame.

### Frame 1

- Frame name: `Landing Page`
- Title text: `Landing Page`
- Screenshot: [image_2025-12-25_01-01-27.png](G:\VKR BACKUP\readingo\linguist-ai\docs\reference-ui-screens\image_2025-12-25_01-01-27.png)
- Suggested annotations:
  - `Project branding and value proposition`
  - `Role entry point: Teacher`
  - `Role entry point: Student`

### Frame 2

- Frame name: `Login Page`
- Title text: `Login Page`
- Screenshot: [image_2025-12-25_01-02-00.png](G:\VKR BACKUP\readingo\linguist-ai\docs\reference-ui-screens\image_2025-12-25_01-02-00.png)
- Suggested annotations:
  - `Email input`
  - `Password input`
  - `Authentication action`
  - `Registration link`

### Frame 3

- Frame name: `Teacher Dashboard - AI Lesson Generation`
- Title text: `Teacher Dashboard: AI Lesson Generation`
- Screenshot: [image_2025-12-25_01-02-24.png](G:\VKR BACKUP\readingo\linguist-ai\docs\reference-ui-screens\image_2025-12-25_01-02-24.png)
- Suggested annotations:
  - `Role-based teacher workspace`
  - `Topic input for AI generation`
  - `Difficulty level selector`
  - `Target student group selector`
  - `Generate assignment with AI`

### Frame 4

- Frame name: `Teacher Dashboard - Manual Lesson Creation`
- Title text: `Teacher Dashboard: Manual Lesson Creation`
- Screenshot: [image_2025-12-25_01-02-32.png](G:\VKR BACKUP\readingo\linguist-ai\docs\reference-ui-screens\image_2025-12-25_01-02-32.png)
- Suggested annotations:
  - `Manual lesson title`
  - `Optional lesson topic`
  - `Difficulty level selector`
  - `Group selector`
  - `Reading text input area`
  - `Create assignment action`

### Frame 5

- Frame name: `Teacher Dashboard - Groups and Assignments`
- Title text: `Teacher Dashboard: Groups and Existing Assignments`
- Screenshot: [image_2025-12-25_01-02-49.png](G:\VKR BACKUP\readingo\linguist-ai\docs\reference-ui-screens\image_2025-12-25_01-02-49.png)
- Suggested annotations:
  - `Teacher group management section`
  - `Create group action`
  - `Group member management entry point`
  - `Assignment list`
  - `Assignment analytics summary`
  - `Assignment actions`

### Frame 6

- Frame name: `Teacher Dashboard - Create Group Dialog`
- Title text: `Create Group Dialog`
- Screenshot: [image_2025-12-25_01-03-12.png](G:\VKR BACKUP\readingo\linguist-ai\docs\reference-ui-screens\image_2025-12-25_01-03-12.png)
- Suggested annotations:
  - `Modal for creating a new student group`
  - `Group name field`
  - `Save group action`

### Frame 7

- Frame name: `Teacher Dashboard - Assignment Analytics`
- Title text: `Assignment Analytics Panel`
- Screenshot: [image_2025-12-25_01-03-27.png](G:\VKR BACKUP\readingo\linguist-ai\docs\reference-ui-screens\image_2025-12-25_01-03-27.png)
- Suggested annotations:
  - `Expanded analytics section`
  - `Total students`
  - `Completed attempts`
  - `Minimum score`
  - `Maximum score`
  - `Average attempts per student`

### Frame 8

- Frame name: `Teacher Dashboard - Duplicate Assignment`
- Title text: `Assign Existing Lesson to Another Group`
- Screenshot: [image_2025-12-25_01-03-42.png](G:\VKR BACKUP\readingo\linguist-ai\docs\reference-ui-screens\image_2025-12-25_01-03-42.png)
- Suggested annotations:
  - `Assignment duplication modal`
  - `Target group selector`
  - `Editable assignment title`
  - `Editable topic`
  - `Editable level`
  - `Assign copy action`

### Frame 9

- Frame name: `Student Dashboard`
- Title text: `Student Dashboard`
- Screenshot: [image_2025-12-25_01-08-06.png](G:\VKR BACKUP\readingo\linguist-ai\docs\reference-ui-screens\image_2025-12-25_01-08-06.png)
- Suggested annotations:
  - `Student assignment overview`
  - `Completion status`
  - `Result summary`
  - `Open report action`
  - `Retry assignment action`

### Frame 10

- Frame name: `Student Result Report`
- Title text: `Student Result Report`
- Screenshot: [image_2025-12-25_01-08-17.png](G:\VKR BACKUP\readingo\linguist-ai\docs\reference-ui-screens\image_2025-12-25_01-08-17.png)
- Suggested annotations:
  - `Overall score`
  - `Grammar score`
  - `Pronunciation score`
  - `AI feedback panel`
  - `Inline highlighted text analysis`
  - `Reference text playback`

### Frame 11

- Frame name: `Student Assignment Recording Page`
- Title text: `Assignment Page with Audio Recording`
- Screenshot: [image_2025-12-25_01-08-51.png](G:\VKR BACKUP\readingo\linguist-ai\docs\reference-ui-screens\image_2025-12-25_01-08-51.png)
- Suggested annotations:
  - `Assignment reading text`
  - `Audio recording control`
  - `Microphone interaction area`
  - `Student submission workflow`

## Page 2: User Flow

Create one Figma page named `User Flow`.

Keep it simple and presentation-ready. Use rectangles for steps and arrows between them.

### Student Flow

Use this sequence:

`Student Login` -> `Student Dashboard` -> `Open Assignment` -> `Record Audio` -> `Submit Attempt` -> `View Result`

Suggested subtitle:

`Student flow: login -> dashboard -> assignment -> record -> submit -> result`

Suggested annotation labels:

- `Role-based access`
- `Assignment selection`
- `Browser audio recording`
- `AI evaluation`
- `Immediate feedback`

### Teacher Flow

Use this sequence:

`Teacher Login` -> `Teacher Dashboard` -> `Create Assignment` -> `Assign to Group` -> `View Analytics`

Suggested subtitle:

`Teacher flow: login -> dashboard -> create assignment -> view analytics`

Suggested annotation labels:

- `Teacher workspace`
- `Manual or AI-based lesson creation`
- `Group-based assignment distribution`
- `Performance monitoring`

## Page 3: Architecture

Create one Figma page named `Architecture`.

Use a simple left-to-right diagram with arrows.

### Main flow

`User` -> `Frontend (Next.js)` -> `Server Actions` -> `Supabase` -> `Gemini API` -> `Result` -> `Frontend`

### Suggested annotations

- `User interacts with browser UI`
- `Frontend handles pages, components, and forms`
- `Server Actions process secure business logic`
- `Supabase stores auth, database records, and audio files`
- `Gemini API generates lessons and evaluates reading attempts`
- `Results are stored and returned to the interface`

### Optional cleaner grouping

If you want the diagram to look more presentation-ready, group it like this:

- Client layer:
  - `User`
  - `Frontend (Next.js)`
- Application layer:
  - `Server Actions`
- Service layer:
  - `Supabase`
  - `Gemini API`
- Output layer:
  - `Result`
  - `Frontend`

## Recommended Layout in Figma

### Screens page

- Use a 3-column or 4-column frame grid.
- Keep equal spacing between frames.
- Put the title at the top of each frame.
- Put annotations around the screenshot using small neutral callout labels.
- Do not crop critical content from the screenshots.

### User Flow page

- Put Student Flow in the upper half.
- Put Teacher Flow in the lower half.
- Use one accent color for student flow and one for teacher flow.
- Keep arrows straight and short.

### Architecture page

- Use simple rounded rectangles and arrows.
- Keep labels short.
- Avoid excessive styling.
- Use a neutral palette suitable for a thesis presentation.

## Minimal Style Guidance

- Do not redesign the UI.
- Use the screenshots exactly as the base visual.
- Use clean annotation labels with small font size.
- Prefer dark text on light background for readability in slides.
- Keep each page suitable for a quick explanation during pre-defense.

## Distinct Screen Inventory Summary

The uploaded screenshots correspond to these distinct presentation screens:

1. Landing Page
2. Login Page
3. Teacher Dashboard - AI Lesson Generation
4. Teacher Dashboard - Manual Lesson Creation
5. Teacher Dashboard - Groups and Assignments
6. Teacher Dashboard - Create Group Dialog
7. Teacher Dashboard - Assignment Analytics
8. Teacher Dashboard - Duplicate Assignment
9. Student Dashboard
10. Student Result Report
11. Student Assignment Recording Page
