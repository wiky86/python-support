-- ==========================================================
-- 파이썬 데이터 분석 학습 공간 (py-data-lab) Supabase DB Schema
-- ==========================================================

-- 1. user_progress 테이블
create table if not exists public.user_progress (
  user_id uuid references auth.users(id) on delete cascade not null,
  topic_id text not null,
  status text not null check (status in ('locked', 'in_progress', 'completed')),
  quiz_passed boolean not null default false,
  quiz_score numeric,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, topic_id)
);

-- 2. user_stats 테이블
create table if not exists public.user_stats (
  user_id uuid references auth.users(id) on delete cascade primary key,
  xp integer not null default 0,
  last_studied date,
  streak_count integer not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. user_badges 테이블
create table if not exists public.user_badges (
  user_id uuid references auth.users(id) on delete cascade not null,
  badge_id text not null,
  earned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, badge_id)
);

-- ==========================================================
-- RLS (Row Level Security) 활성화 및 보안 정책
-- ==========================================================

alter table public.user_progress enable row level security;
alter table public.user_stats enable row level security;
alter table public.user_badges enable row level security;

-- user_progress 정책
create policy "Users can view their own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.user_progress for update
  using (auth.uid() = user_id);

create policy "Users can delete their own progress"
  on public.user_progress for delete
  using (auth.uid() = user_id);

-- user_stats 정책
create policy "Users can view their own stats"
  on public.user_stats for select
  using (auth.uid() = user_id);

create policy "Users can insert their own stats"
  on public.user_stats for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own stats"
  on public.user_stats for update
  using (auth.uid() = user_id);

-- user_badges 정책
create policy "Users can view their own badges"
  on public.user_badges for select
  using (auth.uid() = user_id);

create policy "Users can insert their own badges"
  on public.user_badges for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own badges"
  on public.user_badges for update
  using (auth.uid() = user_id);

-- ==========================================================
-- 신규 유저 회원가입 시 user_stats 기본 행 자동 생성 트리거
-- ==========================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_stats (user_id, xp, streak_count, updated_at)
  values (new.id, 0, 0, timezone('utc'::text, now()))
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 트리거 생성 (기존 트리거 존재 시 교체)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
