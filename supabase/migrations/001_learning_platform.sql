-- GuardPass learning platform schema. No analyzed password is stored here.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'learner' check (role in ('learner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null,
  description text not null, category text not null, published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
  title text not null, position integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(), module_id uuid not null references public.modules(id) on delete cascade,
  title text not null, slug text not null, body text not null, minutes integer not null default 5,
  position integer not null default 0, published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(module_id, slug)
);
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null, passing_score integer not null default 70 check (passing_score between 0 and 100), created_at timestamptz not null default now()
);
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(), quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null, explanation text not null, position integer not null default 0
);
create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(), question_id uuid not null references public.quiz_questions(id) on delete cascade,
  answer text not null, is_correct boolean not null default false, position integer not null default 0
);
create table if not exists public.enrollments (
  user_id uuid not null references auth.users(id) on delete cascade, course_id uuid not null references public.courses(id) on delete cascade,
  started_at timestamptz not null default now(), completed_at timestamptz, primary key (user_id, course_id)
);
create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(), primary key (user_id, lesson_id)
);
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade, score integer not null check (score between 0 and 100), passed boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, description text not null
);
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade, achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(), primary key (user_id, achievement_id)
);
create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, lesson_id)
);
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade, reduced_motion boolean not null default false,
  email_updates boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  success boolean not null default true,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists modules_course_position_idx on public.modules(course_id, position);
create index if not exists lessons_module_position_idx on public.lessons(module_id, position);
create index if not exists quiz_attempts_user_created_idx on public.quiz_attempts(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.user_achievements enable row level security;
alter table public.bookmarks enable row level security;
alter table public.user_settings enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.achievements enable row level security;
alter table public.login_events enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "published courses are readable" on public.courses for select using (published or auth.uid() is not null);
create policy "published modules are readable" on public.modules for select using (exists (select 1 from public.courses c where c.id = course_id and (c.published or auth.uid() is not null)));
create policy "published lessons are readable" on public.lessons for select using (exists (select 1 from public.modules m join public.courses c on c.id = m.course_id where m.id = module_id and (c.published or auth.uid() is not null)));
create policy "authenticated quiz content is readable" on public.quizzes for select using (auth.uid() is not null);
create policy "authenticated questions are readable" on public.quiz_questions for select using (auth.uid() is not null);
create policy "authenticated answers are readable" on public.quiz_answers for select using (auth.uid() is not null);
create policy "achievements are readable" on public.achievements for select using (auth.uid() is not null);
create policy "users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users manage own enrollments" on public.enrollments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own progress" on public.lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own attempts" on public.quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own achievements" on public.user_achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own bookmarks" on public.bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own settings" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins view login events" on public.login_events for select using (public.is_admin());
create policy "admins manage course content" on public.courses for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage modules" on public.modules for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage lessons" on public.lessons for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage quizzes" on public.quizzes for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage quiz questions" on public.quiz_questions for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage quiz answers" on public.quiz_answers for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
