import { useCallback, useEffect, useState } from "react"
import { BookOpen, Newspaper, Award } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function SubmitBox({ assignment, studentId, existing, onDone }) {
  const [answer, setAnswer] = useState("")
  const [error, setError] = useState(null)

  if (existing) {
    return (
      <div className="rounded-md bg-slate-50 p-3 text-sm">
        <Badge variant={existing.status === "graded" ? "default" : "secondary"}>{existing.status}</Badge>
        <p className="mt-2 whitespace-pre-wrap">{existing.student_answer}</p>
      </div>
    )
  }
  async function submit() {
    const { error } = await supabase.from("submissions").insert({
      assignment_id: assignment.id, student_id: studentId, student_answer: answer,
    })
    setError(error)
    if (!error) onDone()
  }
  return (
    <div className="space-y-2">
      <Textarea placeholder="Type your answer..." value={answer} onChange={(e) => setAnswer(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <Button size="sm" disabled={!answer.trim()} onClick={submit}>Submit answer</Button>
    </div>
  )
}

export default function StudentDashboard({ profile }) {
  const [courses, setCourses] = useState([])
  const [materials, setMaterials] = useState([])
  const [assignments, setAssignments] = useState([])
  const [subs, setSubs] = useState([])

  const load = useCallback(async () => {
    const { data: enr } = await supabase.from("enrollments")
      .select("courses(*)").eq("student_id", profile.id)
    const cs = (enr ?? []).map((e) => e.courses).filter(Boolean)
    setCourses(cs)
    const ids = cs.map((c) => c.id)
    if (ids.length) {
      const [m, a] = await Promise.all([
        supabase.from("materials").select("*").in("course_id", ids).order("created_at", { ascending: false }),
        supabase.from("assignments").select("*").in("course_id", ids).order("due_date"),
      ])
      setMaterials(m.data ?? []); setAssignments(a.data ?? [])
    }
    const { data: s } = await supabase.from("submissions")
      .select("*, assignments(title, max_points)").eq("student_id", profile.id)
    setSubs(s ?? [])
  }, [profile.id])

  useEffect(() => { load() }, [load])

  // Live report card: refresh when a teacher grades one of my submissions
  useEffect(() => {
    const ch = supabase.channel("my-submissions")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "submissions", filter: `student_id=eq.${profile.id}` },
        () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile.id, load])

  const graded = subs.filter((s) => s.status === "graded")

  return (
    <Tabs defaultValue="courses">
      <TabsList>
        <TabsTrigger value="courses"><BookOpen className="mr-1 h-4 w-4" />My Courses</TabsTrigger>
        <TabsTrigger value="stream"><Newspaper className="mr-1 h-4 w-4" />Classwork</TabsTrigger>
        <TabsTrigger value="report"><Award className="mr-1 h-4 w-4" />Report Card</TabsTrigger>
      </TabsList>

      <TabsContent value="courses" className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.length === 0 && <p className="text-sm text-slate-500">You are not enrolled in any course yet.</p>}
        {courses.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-base">{c.title}</CardTitle>
              <CardDescription>{c.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="stream" className="space-y-6 pt-4">
        {courses.map((c) => (
          <section key={c.id} className="space-y-3">
            <h2 className="text-lg font-semibold">{c.title}</h2>
            {materials.filter((m) => m.course_id === c.id).map((m) => (
              <Card key={m.id}>
                <CardHeader><CardTitle className="text-base">{m.title}</CardTitle></CardHeader>
                <CardContent className="whitespace-pre-wrap text-sm">{m.content}</CardContent>
              </Card>
            ))}
            {assignments.filter((a) => a.course_id === c.id).map((a) => (
              <Card key={a.id} className="border-indigo-200">
                <CardHeader>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <CardDescription>
                    {a.max_points} points{a.due_date ? ` · due ${a.due_date}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="whitespace-pre-wrap text-sm">{a.instructions}</p>
                  <SubmitBox
                    assignment={a}
                    studentId={profile.id}
                    existing={subs.find((s) => s.assignment_id === a.id)}
                    onDone={load}
                  />
                </CardContent>
              </Card>
            ))}
          </section>
        ))}
      </TabsContent>

      <TabsContent value="report" className="grid gap-4 pt-4 md:grid-cols-2">
        {graded.length === 0 && <p className="text-sm text-slate-500">No graded work yet.</p>}
        {graded.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base">{s.assignments?.title}</CardTitle>
              <CardDescription>
                Score: <span className="font-semibold text-slate-900">{s.grade}</span> / {s.assignments?.max_points}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">{s.feedback || "No feedback provided."}</CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  )
}
