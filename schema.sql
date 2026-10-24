-- =========================================================
-- LMS schema: run this whole file in Supabase > SQL Editor
-- =========================================================
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('teacher','student'))
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  teacher_id uuid not null references public.profiles(id) on delete cascade
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  unique (course_id, student_id)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  content text,
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  instructions text,
  max_points integer not null default 100 check (max_points > 0),
  due_date date
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  student_answer text not null,
  grade integer check (grade >= 0),
  feedback text,
  status text not null default 'pending' check (status in ('pending','graded')),
  unique (assignment_id, student_id)
);

-- ---------- Signup trigger: role is decided SERVER-SIDE ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  code text := new.raw_user_meta_data->>'teacher_code';
  r text := 'student';
begin
  if code is not null and code <> '' then
    if code = 'TEACHER2026' then r := 'teacher';
    else raise exception 'Invalid teacher verification code';
    end if;
  end if;
  insert into public.profiles (id, name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email, r);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Helper functions (avoid RLS recursion) ----------
create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher');
$$;

create or replace function public.is_course_teacher(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from courses where id = cid and teacher_id = auth.uid());
$$;

create or replace function public.is_enrolled(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from enrollments where course_id = cid and student_id = auth.uid());
$$;

-- ---------- Row Level Security ----------
alter table public.profiles    enable row level security;
alter table public.courses     enable row level security;
alter table public.enrollments enable row level security;
alter table public.materials   enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

-- profiles: readable by signed-in users; no client inserts/updates (prevents role tampering)
create policy "profiles read" on public.profiles for select to authenticated using (true);

-- courses
create policy "courses read" on public.courses for select to authenticated
  using (teacher_id = auth.uid() or public.is_enrolled(id));
create policy "courses insert" on public.courses for insert to authenticated
  with check (teacher_id = auth.uid() and public.is_teacher());
create policy "courses update" on public.courses for update to authenticated
  using (teacher_id = auth.uid());
create policy "courses delete" on public.courses for delete to authenticated
  using (teacher_id = auth.uid());

-- enrollments
create policy "enrollments read" on public.enrollments for select to authenticated
  using (student_id = auth.uid() or public.is_course_teacher(course_id));
create policy "enrollments insert" on public.enrollments for insert to authenticated
  with check (public.is_course_teacher(course_id));
create policy "enrollments delete" on public.enrollments for delete to authenticated
  using (public.is_course_teacher(course_id));

-- materials
create policy "materials read" on public.materials for select to authenticated
  using (public.is_course_teacher(course_id) or public.is_enrolled(course_id));
create policy "materials write" on public.materials for all to authenticated
  using (public.is_course_teacher(course_id)) with check (public.is_course_teacher(course_id));

-- assignments
create policy "assignments read" on public.assignments for select to authenticated
  using (public.is_course_teacher(course_id) or public.is_enrolled(course_id));
create policy "assignments write" on public.assignments for all to authenticated
  using (public.is_course_teacher(course_id)) with check (public.is_course_teacher(course_id));

-- submissions
create policy "submissions read" on public.submissions for select to authenticated
  using (
    student_id = auth.uid()
    or exists (select 1 from assignments a where a.id = assignment_id and public.is_course_teacher(a.course_id))
  );
create policy "submissions insert" on public.submissions for insert to authenticated
  with check (
    student_id = auth.uid() and status = 'pending' and grade is null
    and exists (select 1 from assignments a where a.id = assignment_id and public.is_enrolled(a.course_id))
  );
create policy "submissions grade" on public.submissions for update to authenticated
  using (exists (select 1 from assignments a where a.id = assignment_id and public.is_course_teacher(a.course_id)));

-- Realtime for the student report card
alter publication supabase_realtime add table public.submissions;
