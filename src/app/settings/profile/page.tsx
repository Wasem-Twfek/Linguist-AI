import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { ProfileEditForm } from './profile-edit-form'
import { AuthGuard } from '@/components/auth-guard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch current profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('Error fetching profile:', error)
    redirect('/login')
  }

  return (
    <AuthGuard requiredRole={profile.role as 'student' | 'teacher'}>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Профиль</h1>
          <ProfileEditForm 
            currentFullName={profile.full_name}
            email={profile.email || ''}
          />
        </main>
      </div>
    </AuthGuard>
  )
}

