import { redirect } from 'next/navigation'

export default function SignupTeacherPage() {
  redirect('/signup?role=teacher')
}

