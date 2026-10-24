import { useState } from "react"
import { GraduationCap } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function AuthForm({ mode }) {
  // mode: "login" | "student" | "teacher"
  const [f, setF] = useState({ name: "", email: "", password: "", code: "" })
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
      if (error) setMsg({ err: true, text: error.message })
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: f.email,
        password: f.password,
        options: { data: { name: f.name, teacher_code: mode === "teacher" ? f.code : "" } },
      })
      if (error) {
        setMsg({ err: true, text: mode === "teacher" ? "Signup failed. Check your teacher verification code." : error.message })
      } else if (!data.session) {
        setMsg({ err: false, text: "Check your email to confirm your account, then log in." })
      }
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode !== "login" && (
        <div className="space-y-1">
          <Label>Full name</Label>
          <Input required value={f.name} onChange={set("name")} />
        </div>
      )}
      <div className="space-y-1">
        <Label>Email</Label>
        <Input type="email" required value={f.email} onChange={set("email")} />
      </div>
      <div className="space-y-1">
        <Label>Password</Label>
        <Input type="password" minLength={6} required value={f.password} onChange={set("password")} />
      </div>
      {mode === "teacher" && (
        <div className="space-y-1">
          <Label>Teacher verification code</Label>
          <Input required value={f.code} onChange={set("code")} />
        </div>
      )}
      {msg && <p className={msg.err ? "text-sm text-red-600" : "text-sm text-green-700"}>{msg.text}</p>}
      <Button className="w-full" disabled={busy}>
        {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
      </Button>
    </form>
  )
}

export default function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-indigo-600" />
          <CardTitle>Learning Management System</CardTitle>
          <CardDescription>Log in or create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="teacher">Teacher</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="pt-4"><AuthForm mode="login" /></TabsContent>
            <TabsContent value="student" className="pt-4"><AuthForm mode="student" /></TabsContent>
            <TabsContent value="teacher" className="pt-4"><AuthForm mode="teacher" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
