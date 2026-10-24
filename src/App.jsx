import { useEffect, useState } from "react"
import { GraduationCap, LogOut, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import AuthPage from "@/components/AuthPage"
import TeacherDashboard from "@/components/TeacherDashboard"
import StudentDashboard from "@/components/StudentDashboard"

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = still loading
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return setProfile(null)
    supabase.from("profiles").select("*").eq("id", session.user.id).single()
      .then(({ data }) => setProfile(data))
  }, [session?.user?.id])

  if (session === undefined || (session && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    )
  }
  if (!session) return <AuthPage />

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <GraduationCap className="h-6 w-6 text-indigo-600" /> LMS
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>{profile.name} · <span className="capitalize">{profile.role}</span></span>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        {profile.role === "teacher"
          ? <TeacherDashboard profile={profile} />
          : <StudentDashboard profile={profile} />}
      </main>
    </div>
  )
}
