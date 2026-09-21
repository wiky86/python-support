# KDT 학습 보조 시스템 (파이썬 + 디지털 금융) 인수인계 문서

이 문서는 **KDT(K-Digital Training) 학습 보조 웹 애플리케이션(KDT DataLab)**의 전체 아키텍처, 데이터 모델, 콘텐츠 스키마, 핵심 로직 및 배포 설정을 완전히 정리한 **자기완결적 인수인계 문서**입니다. 이전 개발 이력이나 배경지식이 없는 새로운 작업자라도 이 문서 하나만으로 전체 시스템을 즉시 이해하고 유지보수 및 확장할 수 있도록 실제 코드베이스와 스키마를 바탕으로 작성되었습니다.

---

## 1. 앱 개요

### 1.1 시스템 정의 및 목적
- **명칭**: KDT DataLab (통합 학습 보조 시스템)
- **목적**: K-Digital Training 등 오프라인/온라인 실무 교육 과정 수강생들을 위한 **단계별 이론 학습, 코드/개념 빈칸 실습, 복습 퀴즈, 미니 프로젝트 수행 및 진도 관리 웹 애플리케이션**.
- **다중 과목 단일 계정 통합**: 기존의 **파이썬 데이터 분석(Python)** 과정과 신규 **디지털 금융 이론(Finance)** 과정을 단일 웹 애플리케이션과 단일 Supabase DB로 통합하여, **수강생 1개 계정으로 두 과목을 모두 수강**하고 과목별 진도 및 통합 게이미피케이션(XP·레벨·배지)을 동시 집계합니다.

### 1.2 주요 사용 방식 및 운영 환경
- **교육 보조 도구**: 강사의 이론 강의 후 수강생이 스스로 개념을 복습하고, 5단계 빈칸 실습과 5문항 퀴즈를 해결하며 순차적으로 진도를 해금하는 셀프 러닝 플랫폼.
- **코드 실행 엔진 미탑재 (경량화)**: 서버나 브라우저에서 실제 Python/SQL 코드를 실행하는 무거운 샌드박스 엔진 대신, **정규화된 문자열 매칭 기반 빈칸 채점 + 사전 저장된 예상 실행 결과/해설 렌더링** 방식을 채택하여 서버 비용 0원과 빠른 반응 속도를 달성.
- **정적 호스팅 (GitHub Pages)**: Next.js SSG(Static Site Generation) 기반으로 전체 페이지(138개 라우트)가 사전 렌더링되어 완전 정적 호스팅되며, 데이터 영속화는 Supabase 클라이언트 SDK(anon key + RLS)를 통해 브라우저에서 직접 수행.

---

## 2. 기술 스택

### 2.1 프론트엔드 및 빌드 도구
| 구분 | 기술 / 패키지 | 버전 | 역할 및 비고 |
|---|---|---|---|
| **Core Framework** | Next.js (App Router) | `14.2.24` / `14.2.35` | SSG 정적 빌드(`output: "export"`), 다중 과목 동적 라우팅 |
| **UI Library** | React / React DOM | `^18.3.1` | 클라이언트 컴포넌트 및 상태 관리 |
| **Language** | TypeScript | `^5.8.2` | 정적 타입 정의 및 런타임 안정성 확보 |
| **Styling** | Tailwind CSS | `^3.4.17` | 반응형 유틸리티 CSS 스타일링 |
| **Typography** | @tailwindcss/typography | `^0.5.16` | Markdown 본문 렌더링 스타일링 |
| **Icons** | Lucide React | `^1.16.0` | 대시보드, 트랙, 배지, 내비게이션 아이콘 |
| **Markdown Parsing** | react-markdown, remark-gfm | `^9.0.3`, `^4.0.1` | GitHub Flavored Markdown (테이블, 코드블록 등) 파싱 |
| **Code Highlighting** | highlight.js, rehype-highlight | `^11.11.1`, `^7.0.1` | 정적 구문 강조 (Python, SQL 등) |
| **Class Merge** | clsx, tailwind-merge | `^2.1.1`, `^3.0.2` | 조건부 Tailwind 클래스 결합 |
| **Canvas Effects** | canvas-confetti | `^1.9.4` | 퀴즈 통과 및 프로젝트 완주 시 축하 애니메이션 |
| **Image Generation** | html-to-image | `^1.11.11` | 미니 프로젝트 완주 리포트 카드 PNG 다운로드 |

### 2.2 백엔드 및 인프라 (BaaS & Hosting)
| 구분 | 기술 | 세부 내용 |
|---|---|---|
| **Database & Auth** | Supabase (PostgreSQL + Auth) | `@supabase/supabase-js: ^2.49.1`, `@supabase/ssr: ^0.5.2` |
| **Access Key** | Public Anon Key Only | `service_role` 키 절대 미사용 (정적 배포 보안 원칙 준수) |
| **Security** | Row Level Security (RLS) | 수강생 본인 데이터만 CRUD 허용, 관리자 권한은 `admins` 테이블로 검증 |
| **Hosting** | GitHub Pages | `gh-pages` 브랜치에 `out/` 정적 자산 배포 (`.nojekyll` 포함) |

---

## 3. 레포지토리 디렉토리 구조

```text
python-support/ (또는 kdt-support/)
├── .env.local                     # Supabase 접속 정보 로컬 설정 파일
├── .gitignore
├── next.config.mjs                # Next.js 정적 익스포트 및 GitHub Pages basePath 설정
├── package.json                   # 의존성 및 실행 스크립트 정의
├── postcss.config.mjs
├── tailwind.config.ts             # Tailwind CSS 및 다크모드 설정
├── tsconfig.json
│
├── content/                       # [학습 콘텐츠 루트 - 정적 JSON 데이터]
│   ├── courses.json               # 과목 목록 메타데이터 (python, finance)
│   ├── global-badges.json         # 전과목 통합 글로벌 배지 정의 (scope: "global")
│   ├── python/                    # 파이썬 데이터 분석 과목
│   │   ├── config/
│   │   │   ├── badges.json        # 파이썬 전용 배지 24종 (scope: "course")
│   │   │   └── xp-rules.json      # 파이썬 경험치 및 레벨 공식 정의
│   │   └── tracks/                # 파이썬 7개 트랙
│   │       ├── track1/ ~ track7/
│   │       │   ├── track.json     # 트랙 정보, 토픽 순서, 프로젝트 파일 경로
│   │       │   ├── project.json   # 트랙 미니 프로젝트 (데이터셋, 미션, 리포트 템플릿)
│   │       │   └── topics/        # 토픽 JSON (개념, 빈칸 5개, 퀴즈 5문항, FAQ 3개)
│   │
│   └── finance/                   # 디지털 금융 이론 과목
│       ├── config/
│       │   ├── badges.json        # 금융 전용 배지 26종 (scope: "course")
│       │   └── xp-rules.json      # 금융 경험치 및 레벨 공식 정의
│       └── tracks/                # 금융 9개 트랙
│           ├── track1/ ~ track9/
│               ├── track.json
│               ├── project.json
│               └── topics/
│
├── src/
│   ├── app/                       # Next.js App Router (138개 SSG 페이지 사전 렌더링)
│   │   ├── layout.tsx             # 전역 레이아웃 (AuthProvider, Navbar, ThemeProvider)
│   │   ├── page.tsx               # 루트 메인 화면 (과목 선택기 및 통합 대시보드)
│   │   ├── globals.css            # 전역 CSS 및 Tailwind 지시문
│   │   ├── [courseId]/
│   │   │   ├── page.tsx           # 과목별 트랙 로드맵 대시보드 (/[courseId])
│   │   │   └── tracks/
│   │   │       └── [trackId]/
│   │   │           ├── page.tsx   # 트랙 첫 토픽 자동 리다이렉트
│   │   │           ├── project/
│   │   │           │   └── page.tsx # 미니 프로젝트 수행 화면
│   │   │           └── [topicId]/
│   │   │               └── page.tsx # 4단계 토픽 학습 화면 (개념/실습/퀴즈/FAQ)
│   │   ├── admin/
│   │   │   └── page.tsx           # 관리자(강사) 전용 대시보드 (/admin)
│   │   ├── badges/
│   │   │   └── page.tsx           # 통합 배지 도감 (/badges)
│   │   └── login/
│   │       ├── layout.tsx
│   │       └── page.tsx           # 수강생/관리자 로그인 화면 (/login)
│   │
│   ├── components/                # 재사용 UI 컴포넌트
│   │   ├── AdminView.tsx          # 관리자 수강생 통계 테이블, 기수 필터, CSV 내보내기
│   │   ├── BadgeIcons.tsx         # 배지 아이콘 동적 매퍼
│   │   ├── BadgesView.tsx         # 배지 도감 화면 (전체/글로벌/과목별 탭)
│   │   ├── CourseSelectorView.tsx # 메인 과목 선택 카드 및 통합 성취도 요약
│   │   ├── DashboardView.tsx      # 과목별 트랙 카드, 진도율, 레벨 현황 뷰
│   │   ├── FaqChatbot.tsx         # 토픽별 FAQ 칩 선택형 챗봇 컴포넌트
│   │   ├── FillInBlank.tsx        # 정규화 문자열 비교 빈칸 실습 컴포넌트
│   │   ├── MarkdownViewer.tsx     # 구문 강조 포함 마크다운 렌더러
│   │   ├── Navbar.tsx             # 상단 내비게이션 (과목 전환, 통합 레벨/XP, 스트릭, 다크모드)
│   │   ├── ProjectView.tsx        # 미니 프로젝트 데이터셋 뷰어, 미션, 완주 처리
│   │   ├── QuizRunner.tsx         # 4지선다 퀴즈 채점기 및 XP/배지 판정
│   │   ├── ReportCard.tsx         # 프로젝트 결과 리포트 렌더링 및 PNG 이미지 캡처
│   │   ├── ThemeToggle.tsx        # 라이트/다크 테마 토글 버튼
│   │   └── TopicView.tsx          # 4-Step 탭 기반 토픽 학습 뷰
│   │
│   ├── lib/                       # 비즈니스 로직 및 유틸리티
│   │   ├── auth-context.tsx       # AuthProvider, Supabase/LocalStorage 다계층 동기화
│   │   ├── config.ts              # 계정 도메인(@ubion.kdt), 회원가입 정책 설정
│   │   ├── content.ts             # 정적 JSON 파일 로더 (과목, 트랙, 토픽, 배지, XP 규칙)
│   │   ├── gamification.ts        # XP·레벨 공식, 배지 조건 판정 엔진, 이중 집계 로직
│   │   ├── progress.ts            # 토픽 순차 잠금 해제 판정, 빈칸 채점 정규화 로직
│   │   └── supabase/
│   │       ├── client.ts          # 클라이언트 측 Supabase 인스턴스 생성
│   │       └── server.ts          # 서버 측 클라이언트 유틸리티
│   │
│   └── types/                     # TypeScript 인터페이스
│       ├── content.ts             # Course, Track, Topic, Quiz, Project, Badge 타입
│       └── database.ts            # Supabase 테이블 및 뷰 행(Row) 타입 정의
│
└── supabase/
    └── schema.sql                 # Supabase PostgreSQL DDL (테이블, RLS, 트리거, 뷰)
```

---

## 4. 데이터 모델 (Supabase PostgreSQL)

콘텐츠 본문은 일절 DB에 저장하지 않으며, Supabase는 오직 **사용자 계정, 학습 진도, 통계, 배지 획득 기록**만을 관리합니다.

### 4.1 테이블 명세

#### 1) `public.user_progress` (토픽 및 프로젝트 진도)
- **용도**: 수강생별 각 과목의 토픽 및 미니 프로젝트 완료 상태 저장.
- **기본키**: `(user_id, course, topic_id)` 복합키.
- **컬럼 구조**:
  | 컬럼명 | 데이터 타입 | 제약 조건 / 기본값 | 설명 |
  |---|---|---|---|
  | `user_id` | `uuid` | `NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE` | 수강생 고유 ID |
  | `course` | `text` | `NOT NULL, DEFAULT 'python'` | 과목 코드 (`python` 또는 `finance`) |
  | `topic_id` | `text` | `NOT NULL` | 토픽 ID (예: `track1.variables`, 프로젝트는 `track1.project`) |
  | `status` | `text` | `NOT NULL, CHECK (status IN ('locked','in_progress','completed'))` | 학습 상태 |
  | `quiz_passed` | `boolean` | `NOT NULL, DEFAULT false` | 퀴즈 통과 여부 |
  | `quiz_score` | `numeric` | `NULL` | 최초 통과 정답 비율 (0.0 ~ 1.0) |
  | `completed_at`| `timestamptz`| `NULL` | 완료 일시 |
  | `updated_at` | `timestamptz`| `NOT NULL, DEFAULT now()` | 최종 갱신 일시 |

#### 2) `public.user_stats` (사용자 통합 통계)
- **용도**: 수강생별 계정 전체(통합) 누적 XP, 스트릭 일수, 최근 학습일자 저장.
- **기본키**: `user_id` (사용자당 1행).
- **컬럼 구조**:
  | 컬럼명 | 데이터 타입 | 제약 조건 / 기본값 | 설명 |
  |---|---|---|---|
  | `user_id` | `uuid` | `PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE` | 수강생 고유 ID |
  | `xp` | `integer` | `NOT NULL, DEFAULT 0, CHECK (xp >= 0)` | 계정 전체 통합 누적 XP |
  | `last_studied` | `date` | `NULL` | 최근 학습 활동 일자 (`YYYY-MM-DD`) |
  | `streak_count`| `integer` | `NOT NULL, DEFAULT 0, CHECK (streak_count >= 0)` | 연속 학습 일수 (계정 통합) |
  | `updated_at` | `timestamptz`| `NOT NULL, DEFAULT now()` | 최종 갱신 일시 |

#### 3) `public.user_badges` (배지 획득 내역)
- **용도**: 수강생이 달성한 배지 획득 내역 저장.
- **기본키**: `(user_id, course, badge_id)` 복합키.
- **컬럼 구조**:
  | 컬럼명 | 데이터 타입 | 제약 조건 / 기본값 | 설명 |
  |---|---|---|---|
  | `user_id` | `uuid` | `NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE` | 수강생 고유 ID |
  | `course` | `text` | `NOT NULL, DEFAULT 'global'` | 소속 과목 (`python`, `finance`, `global`) |
  | `badge_id` | `text` | `NOT NULL` | 배지 고유 ID (예: `py_first_quiz`, `gl_dual_master`) |
  | `earned_at` | `timestamptz`| `NOT NULL, DEFAULT now()` | 획득 일시 |

#### 4) `public.admins` (관리자 권한 테이블)
- **용도**: 강사/관리자 계정의 `user_id` 목록을 보관. 관리자 대시보드(`/admin`) 접근 및 전체 수강생 목록 조회 권한 판정에 사용.
- **컬럼 구조**:
  | 컬럼명 | 데이터 타입 | 제약 조건 / 기본값 | 설명 |
  |---|---|---|---|
  | `user_id` | `uuid` | `PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE` | 관리자 계정 ID |
  | `created_at` | `timestamptz`| `NOT NULL, DEFAULT now()` | 등록 일시 |

#### 5) `public.admin_user_list` (관리자 전용 조회 뷰)
- **용도**: 프론트엔드 anon 키로 접근 불가능한 `auth.users` 테이블을 안전하게 우회하여 수강생 로그인 ID와 통계를 조인 제공.
- **뷰 정의**:
  ```sql
  create or replace view public.admin_user_list with (security_invoker = false) as
  select
    u.id as user_id,
    split_part(u.email, '@', 1) as login_id,
    coalesce(s.xp, 0) as xp,
    coalesce(s.streak_count, 0) as streak_count,
    s.last_studied
  from auth.users u
  left join public.user_stats s on u.id = s.user_id;
  ```

### 4.2 Row Level Security (RLS) 및 보안 정책
모든 테이블에 RLS를 활성화하고, 수강생은 오직 자신의 행(`auth.uid() = user_id`)만 접근하도록 강제합니다.

```sql
alter table public.user_progress enable row level security;
alter table public.user_stats enable row level security;
alter table public.user_badges enable row level security;
alter table public.admins enable row level security;

-- 일반 사용자: 본인 진도만 CRUD
create policy "Users manage own progress" on public.user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 일반 사용자: 본인 통계만 CRUD
create policy "Users manage own stats" on public.user_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 일반 사용자: 본인 배지만 CRUD
create policy "Users manage own badges" on public.user_badges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 관리자 정책: admins 테이블에 등록된 관리자는 전체 수강생 진도/배지/통계 SELECT 가능
create policy "Admins view all progress" on public.user_progress
  for select using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins view all stats" on public.user_stats
  for select using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins view all badges" on public.user_badges
  for select using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Users view own admin record" on public.admins
  for select using (auth.uid() = user_id);
```

### 4.3 데이터베이스 트리거
- **신규 수강생 가입 시 `user_stats` 자동 생성 트리거**:
  관리자가 Supabase Auth에서 수강생 계정을 생성하는 즉시 `user_stats` 기본 행(`xp: 0, streak: 0`)을 생성하여 "첫 로그인 시 stats 부재" 버그를 원천 차단합니다.
  ```sql
  create or replace function public.handle_new_user()
  returns trigger as $$
  begin
    insert into public.user_stats (user_id, xp, streak_count, updated_at)
    values (new.id, 0, 0, timezone('utc'::text, now()))
    on conflict (user_id) do nothing;
    return new;
  end;
  $$ language plpgsql security definer;

  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
  ```

---

## 5. 콘텐츠 구조 및 스키마

콘텐츠는 `content/` 폴더의 JSON 파일들로 구성되며, 프론트엔드의 `src/lib/content.ts`에 의해 빌드 타임 및 런타임에 동적으로 로드됩니다.

### 5.1 `content/courses.json` (과목 설정)
과목 목록을 정의하며, 하드코딩 없이 이 설정에 따라 과목 선택기 및 라우팅이 동작합니다.
```json
{
  "courses": [
    {
      "id": "python",
      "order": 1,
      "title": "파이썬 데이터 분석",
      "shortTitle": "파이썬",
      "description": "파이썬을 활용한 데이터 분석 기초부터 실전까지. 변수·자료구조부터 pandas·시각화·종합 분석까지 단계별로 익힌다.",
      "theme": "terminal",
      "accent": "#14b8a6",
      "icon": "terminal",
      "contentPath": "content/python",
      "trackCount": 7
    },
    {
      "id": "finance",
      "order": 2,
      "title": "디지털 금융 이론",
      "shortTitle": "금융",
      "description": "금융시장·상품·기관의 구조와 디지털 금융 트렌드를 이론 중심으로 학습한다. 입문부터 퀀트·리스크관리까지 9개 트랙.",
      "theme": "finance",
      "accent": "#c9a227",
      "icon": "landmark",
      "contentPath": "content/finance",
      "trackCount": 9
    }
  ]
}
```

### 5.2 `track.json` (트랙 정의)
각 트랙 폴더(`content/<course>/tracks/<trackId>/`) 내에 위치합니다.
```json
{
  "id": "track1",
  "order": 1,
  "title": "파이썬 기초 다지기",
  "description": "변수, 자료형, 기본 연산자, 제어문, 함수 등 파이썬 프로그래밍의 기초 문법을 익힙니다.",
  "topicOrder": [
    "track1.variables",
    "track1.lists",
    "track1.dict",
    "track1.conditions",
    "track1.loops",
    "track1.functions",
    "track1.comprehension"
  ],
  "topicFiles": [
    "topics/t1-variables.json",
    "topics/t2-lists.json",
    "topics/t3-dict.json",
    "topics/t4-conditions.json",
    "topics/t5-loops.json",
    "topics/t6-functions.json",
    "topics/t7-comprehension.json"
  ],
  "projectFile": "project.json"
}
```

### 5.3 토픽 JSON (`topics/t*.json`)
개념 마크다운 본문, 5개 빈칸 실습, 5문항 4지선다 퀴즈, 3개 FAQ로 구성됩니다.
```json
{
  "id": "track1.variables",
  "trackId": "track1",
  "order": 1,
  "title": "변수와 기본 자료형",
  "content": "## 변수(Variable)란?\n\n변수는 데이터를 저장하는 메모리 공간의 이름입니다...",
  "fillBlanks": [
    {
      "id": "fb1",
      "prompt": "정수형 변수 age에 25를 대입하는 코드를 완성하세요.",
      "code": "age ______ 25",
      "answers": ["=", " = "],
      "output": "25",
      "explain": "파이썬에서는 등호(=)를 사용하여 변수에 값을 할당(대입)합니다."
    }
  ],
  "quiz": {
    "passThreshold": 0.8,
    "questions": [
      {
        "id": "q1",
        "type": "mcq",
        "q": "다음 중 파이썬의 기본 자료형이 아닌 것은?",
        "options": ["int", "float", "str", "varchar"],
        "answer": 3,
        "explain": "varchar는 SQL에서 주로 쓰이는 문자열 자료형이며, 파이썬에서는 str을 사용합니다."
      }
    ]
  },
  "faq": [
    {
      "q": "변수명을 지을 때 숫자로 시작해도 되나요?",
      "a": "안 됩니다. 파이썬 변수명은 문자 또는 밑줄(_)로 시작해야 합니다."
    }
  ]
}
```

### 5.4 `project.json` (미니 프로젝트)
```json
{
  "id": "track1.project",
  "trackId": "track1",
  "title": "파이썬 기초 종합 미니 프로젝트",
  "intro": "배운 기초 문법을 활용하여 간단한 성적 처리 시스템을 완성해 봅니다.",
  "dataset": {
    "description": "학생 5명의 시험 점수 데이터",
    "code": "scores = {'Alice': 85, 'Bob': 92, 'Charlie': 78, 'David': 95, 'Eve': 88}"
  },
  "missions": [
    {
      "id": "m1",
      "prompt": "학생들의 점수 평균을 구하는 빈칸을 완성하세요.",
      "code": "avg_score = sum(scores.values()) ______ len(scores)",
      "answers": ["/", " / "],
      "output": "87.6",
      "explain": "전체 합(sum)을 개수(len)로 나누기 위해 나눗셈 연산자(/)를 사용합니다."
    }
  ],
  "report": {
    "title": "파이썬 기초 마스터 리포트",
    "template": "수강생은 파이썬 기본 자료형과 딕셔너리를 활용하여 평균 점수 {avg_score}점을 성공적으로 산출했습니다.",
    "computedValues": { "avg_score": 87.6 },
    "conceptsUsed": ["변수", "딕셔너리", "내장함수"]
  }
}
```

### 5.5 `config/xp-rules.json` & `badges.json`
- **XP 보상 규칙 (`xp-rules.json`)**:
  - `dailyLogin`: 10 XP
  - `topicComplete`: 50 XP
  - `quizPass`: 30 XP
  - `quizPerfectBonus`: 20 XP (만점 시)
  - `trackComplete`: 200 XP
  - `projectComplete`: 300 XP
  - `streakMilestone`: 3일(20), 7일(50), 14일(80), 30일(150), 60일(250), 90일(350), 180일(700)
- **배지 정의 (`badges.json` / `global-badges.json`)**:
  - `scope: "course"`: 과목 내 트랙 완주, 퀴즈 만점, 과목 레벨 달성
  - `scope: "global"`: 멀티 러너(`courses_started >= 2`), 듀얼 마스터(`courses_completed >= 2`), 통합 레벨 5/10/15 달성, 통합 XP 5,000/10,000 달성 등

---

## 6. 게이미피케이션 로직 (이중 집계 엔진)

### 6.1 레벨 및 누적 XP 공식
레벨은 DB에 저장하지 않고, **누적 XP로부터 역산**합니다.

- **Lv(n) -> Lv(n+1) 도달 필요 구간 XP**:
  Required XP(n) = 200 + 50n
- **Lv(n) 도달 누적 XP (n >= 1)**:
  Cumulative XP(n) = 25n^2 + 175n - 200
  - Lv.1 = 0 XP
  - Lv.2 = 250 XP
  - Lv.3 = 550 XP
  - Lv.4 = 900 XP
  - Lv.5 = 1,300 XP
- **XP -> 레벨 역산 함수 (`getLevel` in `src/lib/gamification.ts`)**:
  ```typescript
  export function getLevel(xp: number): number {
    if (xp <= 0) return 1;
    const n = (-175 + Math.sqrt(175 * 175 + 100 * (xp + 200))) / 50;
    return Math.max(1, Math.floor(n));
  }
  ```

### 6.2 과목별 + 통합 이중 집계 방식
- **과목별 집계 (Course Scope)**:
  - 해당 과목(`courseId`)의 `user_progress` 행들만 필터링하여 완료 토픽 수, 과목 진도율, 과목 XP(`calculateXpFromProgress`), 과목 레벨을 계산합니다.
- **통합 집계 (Global Scope)**:
  - `user_stats.xp`(또는 전과목 합산 XP)를 기반으로 계정의 통합 레벨(Global Level), 전체 완료 토픽 수, 전체 진도율을 산출합니다.
- **스트릭(연속 출석)**:
  - 과목과 무관하게 계정 전체 단 1개로 운영되며, `last_studied`가 오늘이면 유지, 어제면 `+1`, 2일 이상 경과 시 `1`로 재시작됩니다.

---

## 7. 인증 및 계정 흐름

### 7.1 계정 체계 및 발급 방식
- **아이디 기반 인증**: 수강생은 이메일 대신 관리자로부터 부여받은 **학습 아이디(예: `DF08001`)**와 비밀번호로 로그인합니다.
- **내부 변환 규칙 (`src/lib/config.ts`)**:
  - `DF08001` -> 소문자 변환 후 도메인 결합 -> `df08001@ubion.kdt` 형태로 Supabase Auth API(`signInWithPassword`)에 전달.
  - 이메일 인증 불필요, 외부 메일 미수집.
- **셀프 회원가입 차단 (`ALLOW_SELF_SIGNUP = false`)**:
  - 수강생 계정은 강사/관리자가 Supabase 대시보드에서 일괄 수동 발급합니다.
  - 로그인 화면의 회원가입 탭은 안내 문구만 노출됩니다.

### 7.2 관리자 식별 및 권한 제어
- 사용자가 로그인하면 `admins` 테이블에서 `user_id = auth.uid()` 조회를 수행합니다.
- 관리자로 등록된 계정인 경우:
  1. 상단 내비게이션 바에 **`[관리자]`** 메뉴가 자동 활성화됩니다.
  2. `/admin` 페이지에 접근하여 전체 수강생의 기수별 학습 현황, 진도율, XP, 배지 통계를 조회하고 CSV로 다운로드할 수 있습니다.
- 비관리자 접근 시: "접근 권한이 없습니다" 안내 후 홈으로 리다이렉트됩니다.

---

## 8. 핵심 화면 및 컴포넌트

| 경로 | 컴포넌트 | 설명 |
|---|---|---|
| `/` | `CourseSelectorView` | 메인 화면. 파이썬/금융 과목 카드, 과목별 진도율 요약, 통합 레벨/XP, 글로벌 배지 쇼케이스 |
| `/[courseId]` | `DashboardView` | 과목별 로드맵 대시보드. 트랙 리스트, 순차 잠금 상태, 트랙 진도 바, 과목 레벨 현황 |
| `/[courseId]/tracks/[trackId]/[topicId]` | `TopicView` | 4단계 탭 학습 뷰: (1) 개념 학습, (2) 빈칸 실습, (3) 복습 퀴즈, (4) FAQ 챗봇 |
| `/[courseId]/tracks/[trackId]/project` | `ProjectView` | 트랙 미니 프로젝트 화면. 데이터셋 안내, 단계별 미션, 완주 리포트 카드 발급 |
| `/badges` | `BadgesView` | 전체 통합 배지 도감. [전체], [계정 공통], [파이썬], [디지털 금융] 탭 필터링 및 획득일자 확인 |
| `/admin` | `AdminView` | 관리자 전용 대시보드. 기수별(`DF08` 등) 탭 필터, 실시간 검색, 다차원 진도 테이블, UTF-8 CSV 내보내기 |
| `/login` | `LoginPage` | 아이디/비밀번호 로그인 폼 및 게스트 모드 안내 |

---

## 9. 핵심 비즈니스 로직

### 9.1 빈칸 실습 채점 로직 (`normalizeCodeString` & `checkFillInBlank`)
코드 실행 엔진이 없으므로, 문자열 정규화 후 후보 정답 배열과 대조합니다.
```typescript
export function normalizeCodeString(s: string): string {
  if (!s) return "";
  // 앞뒤 공백 제거 -> 따옴표 통일(' -> ") -> 내부 모든 공백 제거
  return s.trim().replace(/['"]/g, '"').replace(/\s+/g, "");
}

export function checkFillInBlank(input: string, answers: string[]): boolean {
  if (!input || !answers || answers.length === 0) return false;
  const normalizedInput = normalizeCodeString(input);
  return answers.some((a) => normalizeCodeString(a) === normalizedInput);
}
```

### 9.2 순차 잠금(Lock/Unlock) 규칙 (`src/lib/progress.ts`)
1. **첫 번째 트랙의 첫 번째 토픽**은 항상 해금(`in_progress` 또는 `completed`)되어 있습니다.
2. **트랙 내 후속 토픽**: 바로 직전 토픽의 `status === 'completed' && quiz_passed === true`(복습 퀴즈 통과)여야 해금됩니다.
3. **다음 트랙의 첫 토픽**: 이전 트랙의 **모든 토픽이 완료**되어야 해금됩니다.
4. **미니 프로젝트**: 해당 트랙의 **모든 토픽이 완료**되면 해금됩니다.

### 9.3 게스트 모드 및 로컬 스토리지 지원
- 비로그인(게스트) 상태에서도 브라우저 `localStorage`(`guest_user_progress`, `guest_user_stats`, `guest_user_badges`)를 통해 학습 진도가 임시 보존됩니다.

---

## 10. 환경변수

프로젝트 루트의 `.env.local`에 설정하며, 정적 빌드 시 `next.config.mjs`에 주입됩니다.

| 환경변수 키 | 필수 여부 | 용도 및 설명 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **필수** | Supabase 프로젝트 URL (`https://<project-id>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **필수** | Supabase 클라이언트용 Anon Public Key (공개 가능) |
| `REPO_NAME` | 선택 | GitHub Pages 저장소명 (기본값: `python-support` 또는 `kdt-support`) |
| `GITHUB_ACTIONS` | 선택 | CI/CD 빌드 환경 감지 플래그 (`true`일 경우 `basePath` 자동 적용) |

> ⚠️ **주의**: `SUPABASE_SERVICE_ROLE_KEY`는 정적 웹 호스팅 환경이므로 **절대로 코드베이스나 클라이언트 환경변수에 포함해서는 안 됩니다.**

---

## 11. 배포 설정 (GitHub Pages)

### 11.1 Next.js 빌드 설정 (`next.config.mjs`)
- `output: "export"`: 정적 HTML/CSS/JS 파일 번들로 익스포트.
- `basePath`: GitHub Pages의 저장소 서브디렉토리 경로 지원 (예: `/python-support` 또는 `/kdt-support`).
- `trailingSlash: true`: 정적 호스팅에서 URL 끝 슬래시를 디렉토리 `index.html`로 매핑하여 404 방지.
- `images: { unoptimized: true }`: Node.js 서버 없는 정적 환경 이미지 최적화 비활성화.

### 11.2 배포 파이프라인 및 명령어
```powershell
# 1. GitHub Actions 환경변수 설정 후 정적 빌드 실행
$env:GITHUB_ACTIONS="true"
npm run build

# 2. Jekyll 정적 파일 무시 방지 파일 생성
New-Item -ItemType File -Force -Path "out\.nojekyll"

# 3. main 브랜치 푸시
git push origin main

# 4. gh-pages 브랜치에 out 폴더 강제 배포
git --work-tree=out checkout --orphan gh-pages-temp
git --work-tree=out add --all
git --work-tree=out commit -m "Deploy KDT DataLab to gh-pages"
git push origin HEAD:gh-pages --force
git checkout -f main
git branch -D gh-pages-temp
```

---

## 12. 기해결된 시행착오 및 트러블슈팅 이력

새로운 환경 구축 시 반드시 참고해야 할 기해결 이슈 목록입니다.

| 발생 이슈 | 원인 분석 | 적용된 해결책 |
|---|---|---|
| **1. 로그인 상태에서 탭 전환 시 브라우저 무한 렌더 루프** | 진도 저장 및 세션 리스너가 `useEffect` 내부에서 상태를 상호 트리거하며 무한 리렌더링 유발 | `auth-context.tsx`에서 `useRef`로 상태를 캐싱하고 이벤트 기반 명시적 저장 함수(`updateTopicProgress`)로 완전 분리 |
| **2. 관리자 대시보드 `auth.users` 권한 거부 오류** | 프론트엔드 anon 키로 `auth.users` 테이블을 직접 `select`하려 하여 Supabase RLS 권한 에러 발생 | PostgreSQL 뷰 `admin_user_list`(`security_invoker = false`)를 생성하여 필요한 사용자 메타만 우회 조회 |
| **3. 신규 사용자 첫 로그인 시 stats 부재** | `auth.users` 생성 후 `user_stats` 행이 없어 통계 및 스트릭 계산 시 null 참조 | `on_auth_user_created` DB 트리거를 생성하여 가입 즉시 `user_stats` 기본 행 자동 생성 |
| **4. GitHub Pages 배포 시 404 및 CSS/JS 깨짐** | `next.config.mjs`의 기본 `repo` 이름과 실제 GitHub Repository URL(`python-support`) 불일치 | `repo` 환경변수 자동 감지 및 기본값을 실제 레포명과 일치시킴 |
| **5. 금융 퀴즈 통과 후 토픽 미해금 및 XP 중복 적립** | Supabase `user_progress` 테이블에 `course` 컬럼/복합키 제약이 없어 upsert 요청이 거부됨 | `auth-context.tsx`에 3단계 Fallback Upsert 및 과목 자동 추론(`inferCourseFromTopic`) 구축, 동일 세션 재응시 XP 중복 방지 플래그 적용 |

---

## 13. 프로젝트 완성도 및 현황 요약

### 13.1 과목 및 콘텐츠 완성 현황
- **파이썬 데이터 분석 (`python`)**:
  - **트랙 수**: 7개 트랙 (100% 완성)
  - **토픽 수**: 43개 토픽 (각 토픽별 개념, 빈칸 5개, 퀴즈 5문항, FAQ 3개 완비)
  - **미니 프로젝트**: 7개 미니 프로젝트 및 리포트 템플릿 완비
  - **과목 배지**: 24종 완비
- **디지털 금융 이론 (`finance`)**:
  - **트랙 수**: 9개 트랙 (100% 완성)
  - **토픽 수**: 54개 토픽 (각 토픽별 개념, 빈칸 5개, 퀴즈 5문항, FAQ 3개 완비)
  - **미니 프로젝트**: 9개 미니 프로젝트 및 리포트 템플릿 완비
  - **과목 배지**: 26종 완비
- **계정 통합 글로벌 배지 (`global`)**: 9종 완비

### 13.2 기능 구현 완성도
- [x] 다중 과목 라우팅 및 138개 페이지 SSG 빌드
- [x] 단일 계정 기반 과목별/통합 진도 및 XP 이중 집계
- [x] 4단계 학습 뷰(개념/실습/퀴즈/FAQ) 및 미니 프로젝트 리포트 발급
- [x] 관리자 전용 대시보드(`/admin`) 기수 필터, 검색 및 CSV 다운로드
- [x] 다크 모드 / 라이트 모드 테마 지원
- [x] 게스트 모드(LocalStorage) 및 Supabase 클라우드 동기화

### 13.3 향후 권장 작업 (TODO)
1. **GitHub 원격 저장소 이관 시**:
   사용자가 새 레포지토리(`https://github.com/wiky86/kdt-support.git`)로 완전히 이전하고자 할 경우 `git remote set-url origin https://github.com/wiky86/kdt-support.git` 실행 및 `next.config.mjs` 기본값을 `kdt-support`로 변경.
2. **Supabase 신규 프로젝트 이전 시**:
   `supabase/schema.sql`의 DDL 및 RLS 정책을 Supabase SQL Editor에서 1회 실행하고, 관리자 계정 생성 후 `admins` 테이블에 `user_id`를 등록.
