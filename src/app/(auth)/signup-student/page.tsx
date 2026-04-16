import { redirect } from 'next/navigation'

export default function SignupStudentPage() {
  redirect('/signup?role=student')
}

