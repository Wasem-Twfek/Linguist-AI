# Testing Revalidation Flow

This guide helps verify that UI updates immediately after mutations without manual refresh.

## Prerequisites

1. Start the dev server: `npm run dev`
2. Have two browser windows/tabs open:
   - **Window 1**: Teacher account logged in at `/teacher/dashboard`
   - **Window 2**: Student account logged in at `/student/dashboard`

## Test Cases

### 1. Group Creation ✅

**Steps:**
1. In Teacher window, click "Создать группу" (Create Group)
2. Enter a group name (e.g., "Test Group 1")
3. Click "Создать" (Create)

**Expected Results:**
- ✅ Group appears immediately in "Мои группы" (My Groups) panel
- ✅ Group appears immediately in "Generate with AI" dropdown
- ✅ No page refresh needed
- ✅ Student count shows "0 студентов"

**What to check:**
- Groups panel updates instantly
- Generate Assignment form dropdown updates instantly

---

### 2. Group Deletion ✅

**Steps:**
1. In Teacher window, find a group in "Мои группы" panel
2. Click the trash icon next to the group
3. Confirm deletion in the dialog

**Expected Results:**
- ✅ Group disappears immediately from "Мои группы" panel
- ✅ Group disappears immediately from "Generate with AI" dropdown
- ✅ No page refresh needed
- ✅ In Student window: If student was in that group, assignments disappear immediately

**What to check:**
- Groups list updates instantly
- Dropdown updates instantly
- Student dashboard reflects deletion

---

### 3. Add Student to Group ✅

**Steps:**
1. In Teacher window, click "Участники" (Members) on a group
2. Enter student email in the "Add Student" field
3. Click "Добавить" (Add)

**Expected Results:**
- ✅ Student appears immediately in the members list
- ✅ Group student count updates immediately (e.g., "1 студент")
- ✅ In Student window: New assignments for that group appear immediately
- ✅ No page refresh needed

**What to check:**
- Member count updates in groups panel
- Member count updates in dropdown (e.g., "Group Name (1 студентов)")
- Student dashboard shows new assignments

---

### 4. Remove Student from Group ✅

**Steps:**
1. In Teacher window, open group members dialog
2. Click remove/delete button next to a student
3. Confirm removal

**Expected Results:**
- ✅ Student disappears immediately from members list
- ✅ Group student count decreases immediately
- ✅ In Student window: Assignments for that group disappear immediately
- ✅ No page refresh needed

**What to check:**
- Member count updates instantly
- Student dashboard reflects removal

---

### 5. Create Assignment (Manual) ✅

**Steps:**
1. In Teacher window, go to `/teacher/assignments/create`
2. Fill in the form:
   - Select a group
   - Enter title
   - Select type (reading/essay)
   - Enter text content
3. Click "Создать" (Create)

**Expected Results:**
- ✅ Redirects to `/teacher/dashboard`
- ✅ Assignment appears immediately in assignments table
- ✅ In Student window: Assignment appears immediately if student is in the group
- ✅ No manual refresh needed

**What to check:**
- Teacher dashboard assignments table updates
- Student dashboard shows new assignment card

---

### 6. Generate Assignment with AI ✅

**Steps:**
1. In Teacher window, in "Generate with AI" form:
   - Enter topic (e.g., "Coffee Shop")
   - Select level (e.g., "Intermediate")
   - Select a group from dropdown
2. Click "Сгенерировать урок" (Generate Lesson)

**Expected Results:**
- ✅ Assignment appears immediately in assignments table
- ✅ Success toast appears
- ✅ In Student window: Assignment appears immediately if student is in the group
- ✅ No manual refresh needed

**What to check:**
- Assignments table updates instantly
- Student dashboard shows new assignment

---

### 7. Delete Assignment ✅

**Steps:**
1. In Teacher window, find an assignment in the table
2. Click the trash icon
3. Confirm deletion

**Expected Results:**
- ✅ Assignment disappears immediately from table
- ✅ In Student window: Assignment disappears immediately
- ✅ No manual refresh needed

**What to check:**
- Teacher assignments table updates
- Student dashboard removes assignment card

---

### 8. Submit Assignment Attempt ✅

**Steps:**
1. In Student window, click on an assignment
2. Record audio (or use test audio)
3. Click "Отправить" (Submit)

**Expected Results:**
- ✅ Redirects to `/student/dashboard`
- ✅ Assignment card shows score immediately
- ✅ "Посмотреть отчет" (View Report) button appears
- ✅ In Teacher window: Analytics update immediately (if viewing)
- ✅ No manual refresh needed

**What to check:**
- Student dashboard shows updated score
- Assignment card reflects completion status
- Teacher analytics reflect new attempt

---

## Quick Test Checklist

Run this quick sequence to verify everything works:

1. ✅ Create group → Appears instantly
2. ✅ Add student → Count updates instantly
3. ✅ Generate assignment → Appears in both dashboards instantly
4. ✅ Submit attempt → Score appears instantly
5. ✅ Delete assignment → Disappears instantly
6. ✅ Delete group → Disappears instantly

## Debugging Tips

If updates don't appear immediately:

1. **Check browser console** for errors
2. **Check Network tab** - should see requests after mutations
3. **Verify `revalidatePath` calls** - check server action logs
4. **Check page exports** - ensure `export const dynamic = 'force-dynamic'` is present
5. **Hard refresh** - Sometimes browser cache needs clearing (Ctrl+Shift+R)

## Expected Behavior

- ✅ **No manual refresh needed** - UI updates automatically
- ✅ **Immediate updates** - Changes appear within 1-2 seconds
- ✅ **Consistent state** - Teacher and student views stay in sync
- ✅ **No errors** - Console should be clean

## Common Issues

### Issue: Updates don't appear
**Solution:** Check that `revalidatePath` is called after successful mutations

### Issue: Groups don't update in dropdown
**Solution:** Verify `revalidatePath('/teacher/assignments/create')` is called in `createGroup`

### Issue: Student dashboard doesn't update
**Solution:** Verify `revalidatePath('/student/dashboard')` is called in all relevant mutations

### Issue: Build errors
**Solution:** Run `npm run typecheck` and `npm run lint` to find issues

