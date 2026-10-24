import { useCallback, useEffect, useState } from "react"
import { BookOpen, Users, FilePlus2, ClipboardCheck, Search } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const Err = ({ e }) => (e ? <p className="text-sm text-red-600">{e.message}</p> : null)

function CourseSelect({ courses, value, onChange }) {
  return (
    <select
      className="h-9 w-full rounded-md border bg-white px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select a course...</option>
      {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
    </select>
  )
}

function CourseCreator({ profile, onDone }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState(null)
  async function submit(e) {
    e.preventDefault()
    const { error } = await supabase.from("courses").insert({ title, description, teacher_id: profile.id })
    setError(error)
    if (!error) { setTitle(""); setDescription(""); onDone() }
  }
  return (
    <Card>
      <CardHeader><CardTitle>Create a course</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Course title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Err e={error} />
          <Button>Create course</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Roster({ courses, students, enrollments, onDone }) {
  const [courseId, setCourseId] = useState("")
  const [q, setQ] = useState("")
  const [error, setError] = useState(null)
  const enrolled = new Set(enrollments.filter((e) => e.course_id === courseId).map((e) => e.student_id))
  const shown = students.filter((s) =>
    (s.name + s.email).toLowerCase().includes(q.toLowerCase()))

  async function enroll(studentId) {
    const { error } = await supabase.from("enrollments").insert({ course_id: courseId, student_id: studentId })
    setError(error); onDone()
  }
  async function unenroll(studentId) {
    const { error } = await supabase.from("enrollments").delete()
      .eq("course_id", courseId).eq("student_id", studentId)
    setError(error); onDone()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student roster</CardTitle>
        <CardDescription>Pick a course, then enroll students.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search students..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Err e={error} />
        <div className="divide-y rounded-md border bg-white">
          {shown.length === 0 && <p className="p-4 text-sm text-slate-500">No students found.</p>}
          {shown.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-slate-500">{s.email}</p>
              </div>
              {courseId && (enrolled.has(s.id)
                ? <Button size="sm" variant="outline" onClick={() => unenroll(s.id)}>Remove</Button>
                : <Button size="sm" onClick={() => enroll(s.id)}>Enroll</Button>)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ContentPost({ courses }) {
  const [courseId, setCourseId] = useState("")
  const [m, setM] = useState({ title: "", content: "" })
  const [a, setA] = useState({ title: "", instructions: "", max_points: 100, due_date: "" })
  const [note, setNote] = useState(null)

  async function addMaterial(e) {
    e.preventDefault()
    const { error } = await supabase.from("materials").insert({ ...m, course_id: courseId })
    setNote(error ? error.message : "Material posted.")
    if (!error) setM({ title: "", content: "" })
  }
  async function addAssignment(e) {
    e.preventDefault()
    const { error } = await supabase.from("assignments").insert({
      ...a, course_id: courseId, max_points: Number(a.max_points), due_date: a.due_date || null,
    })
    setNote(error ? error.message : "Assignment posted.")
    if (!error) setA({ title: "", instructions: "", max_points: 100, due_date: "" })
  }

  return (
    <div className="space-y-4">
      <CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
      {note && <p className="text-sm text-slate-600">{note}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Post study material</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addMaterial} className="space-y-3">
              <Input placeholder="Title" required value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} />
              <Textarea placeholder="Notes / content" rows={6} value={m.content} onChange={(e) => setM({ ...m, content: e.target.value })} />
              <Button disabled={!courseId}>Post material</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Post assignment</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addAssignment} className="space-y-3">
              <Input placeholder="Title" required value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} />
              <Textarea placeholder="Instructions" rows={4} value={a.instructions} onChange={(e) => setA({ ...a, instructions: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Max points</Label>
                  <Input type="number" min={1} value={a.max_points} onChange={(e) => setA({ ...a, max_points: e.target.value })} /></div>
                <div><Label>Due date</Label>
                  <Input type="date" value={a.due_date} onChange={(e) => setA({ ...a, due_date: e.target.value })} /></div>
              </div>
              <Button disabled={!courseId}>Post assignment</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GradeCard({ sub, onDone }) {
  const max = sub.assignments?.max_points ?? 100
  const [grade, setGrade] = useState("")
  const [feedback, setFeedback] = useState("")
  const [error, setError] = useState(null)
  async function save() {
    const g = Number(grade)
    if (grade === "" || g < 0 || g > max) return setError({ message: `Grade must be 0-${max}` })
    const { error } = await supabase.from("submissions")
      .update({ grade: g, feedback, status: "graded" }).eq("id", sub.id)
    setError(error)
    if (!error) onDone()
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{sub.assignments?.title}</CardTitle>
        <CardDescription>{sub.profiles?.name} · {sub.profiles?.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm">{sub.student_answer}</p>
        <div className="flex items-center gap-2">
          <Input className="w-24" type="number" placeholder="Grade" value={grade} onChange={(e) => setGrade(e.target.value)} />
          <span className="text-sm text-slate-500">/ {max}</span>
        </div>
        <Textarea placeholder="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <Err e={error} />
        <Button onClick={save}>Save grade</Button>
      </CardContent>
    </Card>
  )
}

export default function TeacherDashboard({ profile }) {
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [pending, setPending] = useState([])

  const load = useCallback(async () => {
    const [c, s, e, p] = await Promise.all([
      supabase.from("courses").select("*").eq("teacher_id", profile.id).order("title"),
      supabase.from("profiles").select("*").eq("role", "student").order("name"),
      supabase.from("enrollments").select("*"),
      supabase.from("submissions")
        .select("*, assignments(title, max_points), profiles(name, email)")
        .eq("status", "pending"),
    ])
    setCourses(c.data ?? []); setStudents(s.data ?? [])
    setEnrollments(e.data ?? []); setPending(p.data ?? [])
  }, [profile.id])

  useEffect(() => { load() }, [load])

  return (
    <Tabs defaultValue="courses">
      <TabsList>
        <TabsTrigger value="courses"><BookOpen className="mr-1 h-4 w-4" />Courses</TabsTrigger>
        <TabsTrigger value="roster"><Users className="mr-1 h-4 w-4" />Roster</TabsTrigger>
        <TabsTrigger value="content"><FilePlus2 className="mr-1 h-4 w-4" />Materials & Assignments</TabsTrigger>
        <TabsTrigger value="grading">
          <ClipboardCheck className="mr-1 h-4 w-4" />Grading
          {pending.length > 0 && <Badge className="ml-2">{pending.length}</Badge>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="courses" className="grid gap-4 pt-4 md:grid-cols-2">
        <CourseCreator profile={profile} onDone={load} />
        <div className="space-y-3">
          {courses.length === 0 && <p className="text-sm text-slate-500">No courses yet.</p>}
          {courses.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base">{c.title}</CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">
                  {enrollments.filter((e) => e.course_id === c.id).length} students
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="roster" className="pt-4">
        <Roster courses={courses} students={students} enrollments={enrollments} onDone={load} />
      </TabsContent>

      <TabsContent value="content" className="pt-4"><ContentPost courses={courses} /></TabsContent>

      <TabsContent value="grading" className="grid gap-4 pt-4 md:grid-cols-2">
        {pending.length === 0 && <p className="text-sm text-slate-500">No pending submissions.</p>}
        {pending.map((s) => <GradeCard key={s.id} sub={s} onDone={load} />)}
      </TabsContent>
    </Tabs>
  )
}
