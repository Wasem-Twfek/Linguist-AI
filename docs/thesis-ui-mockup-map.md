# Thesis UI Mockup Map

This file maps each captured UI screenshot to a presentation-ready frame title and suggested annotation labels.

## Screen inventory

1. `image_2025-12-25_01-01-27.png`
   Title: `Role Selection / Landing`
   Notes:
   - role selection entry point
   - dual navigation for teacher and student flows
   - AI-assisted pronunciation learning positioning

2. `image_2025-12-25_01-02-00.png`
   Title: `Teacher Login`
   Notes:
   - email/password authentication form
   - teacher-specific access route
   - account registration link

3. `image_2025-12-25_01-02-24.png`
   Title: `Teacher Dashboard - AI Lesson Generation`
   Notes:
   - teacher dashboard header
   - AI lesson generation form
   - difficulty and group targeting controls
   - automated content generation action

4. `image_2025-12-25_01-02-32.png`
   Title: `Teacher Dashboard - Manual Lesson Creation`
   Notes:
   - manual assignment creation form
   - level and group selectors
   - reading text input area
   - lesson publishing action

5. `image_2025-12-25_01-02-49.png`
   Title: `Teacher Dashboard - Groups And Lessons Overview`
   Notes:
   - group management section
   - participant management action
   - lesson list with analytics summary
   - lesson duplication and deletion actions

6. `image_2025-12-25_01-03-12.png`
   Title: `Teacher Dashboard - Create Group Dialog`
   Notes:
   - modal group creation workflow
   - class/group naming input
   - quick management action from dashboard

7. `image_2025-12-25_01-03-27.png`
   Title: `Teacher Dashboard - Lesson Analytics Expanded`
   Notes:
   - expandable analytics panel
   - student completion count
   - attempt statistics
   - min/max score summary

8. `image_2025-12-25_01-03-42.png`
   Title: `Teacher Dashboard - Assign Lesson To Group`
   Notes:
   - assignment duplication/distribution dialog
   - target group selector
   - lesson metadata editing controls
   - group-specific assignment action

9. `image_2025-12-25_01-08-06.png`
   Title: `Student Dashboard`
   Notes:
   - student task overview
   - assignment status badge
   - result summary card
   - report and retry actions

10. `image_2025-12-25_01-08-17.png`
    Title: `Student Result Report`
    Notes:
    - AI evaluation summary
    - grammar and pronunciation scores
    - color-coded text analysis
    - generated feedback recommendations
    - audio playback for review

11. `image_2025-12-25_01-08-51.png`
    Title: `Student Assignment Recording Page`
    Notes:
    - reading assignment content
    - audio recording control
    - student submission workflow
    - speaking practice interaction area

## Recommended frame order

1. `Role Selection / Landing`
2. `Teacher Login`
3. `Teacher Dashboard - AI Lesson Generation`
4. `Teacher Dashboard - Manual Lesson Creation`
5. `Teacher Dashboard - Groups And Lessons Overview`
6. `Teacher Dashboard - Create Group Dialog`
7. `Teacher Dashboard - Lesson Analytics Expanded`
8. `Teacher Dashboard - Assign Lesson To Group`
9. `Student Dashboard`
10. `Student Assignment Recording Page`
11. `Student Result Report`

## User flow content

Student flow:
`login -> dashboard -> assignment -> record -> submit -> result`

Teacher flow:
`login -> dashboard -> create assignment -> view analytics`

## Architecture content

`User -> Frontend (Next.js) -> Server Actions -> Supabase -> Gemini API -> Result -> Frontend`

## Figma outputs created in this session

- User Flow FigJam: <https://www.figma.com/online-whiteboard/create-diagram/6fe6e648-04fe-4606-83e5-f12f7c9fb8c9?utm_source=chatgpt&utm_content=edit_in_figjam&oai_id=&request_id=a6a27a2e-a96e-45aa-8e4b-2f1f38572456>
- Architecture FigJam: <https://www.figma.com/online-whiteboard/create-diagram/1a99f223-884a-4ccf-b978-b515986b8b48?utm_source=chatgpt&utm_content=edit_in_figjam&oai_id=&request_id=4a833757-766c-4d22-b9a8-3fdf8acbb9c1>
