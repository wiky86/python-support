# KDT 학습 보조 — 통합 개발 지시서 (파이썬 + 디지털 금융)

> **이 문서의 목적**: 기존에 완성한 **PyDataLab(파이썬 데이터 분석 학습 웹)** 을 베이스로,
> 신규 **디지털 금융 이론** 과목을 **같은 앱 안에 통합**한다.
> Antigravity는 이 문서를 최우선 기준으로 삼아 **앱 코드·UI·로직**을 구현한다.
> **콘텐츠 JSON은 우리(제품 오너)가 직접 커밋한다. Antigravity는 콘텐츠를 생성하지 않는다.**

---

## 0. ⚠️ 이전 결정의 갱신 (반드시 먼저 읽을 것)

디지털 금융 과목은 **처음에는 "과목마다 별도 사이트 + 별도 Supabase + 별도 레포"로 분리 운영**하기로 했었다.
**이 방침을 폐기하고, 아래와 같이 "단일 앱 통합"으로 변경한다.**

| 항목 | 이전(폐기) | **현재(확정)** |
|---|---|---|
| 앱/레포 | 과목별 분리 | **단일 앱·단일 레포로 통합** |
| Supabase | 과목별 프로젝트 분리 | **단일 프로젝트로 통합** |
| 계정 | 과목별 별도 계정 | **계정 1개로 전 과목 수강** |
| 진도/XP/배지 | 과목별 완전 독립 | **과목별 + 통합(계정 전체) 이중 집계** |

**통합 결정 배경**: 같은 수강생이 여러 과목을 함께 듣기 때문에, 계정을 하나로 두면 아이디 발급·관리가 절반으로 줄고, 수강생도 과목 전환이 매끄럽다. 규모(기수당 30~50명)에서 분리 운영의 이점이 없다.

**마이그레이션 부담 없음**: 파이썬 앱은 배포돼 있으나 **실사용자 데이터가 없다**(테스트 계정뿐, 전량 삭제 가능). 따라서 기존 Supabase 스키마를 **마이그레이션 없이 통합 스키마로 새로 구성**해도 된다.

---

## 1. Antigravity의 역할 경계 (가장 중요)

**Antigravity가 하는 일** — 앱 껍데기 전부:
- 라우팅·화면·컴포넌트·상태관리
- 콘텐츠 파일(`/content`)을 **동적으로 읽어** 렌더링 (과목/트랙/토픽 수를 코드에 하드코딩 금지)
- 빈칸 채점·퀴즈 채점·순차 잠금 로직
- 인증(Supabase Auth) 연동, 진도 저장
- 게이미피케이션(XP·레벨·배지·스트릭) 계산·표시 — **과목별 + 통합 이중 집계**
- 관리자(강사) 조회 대시보드
- GitHub Pages 정적 배포 대응

**Antigravity가 하지 않는 일**:
- ❌ 학습 콘텐츠(JSON) 작성 — 우리가 커밋한다
- ❌ 트랙 수·토픽 수·문항 수 하드코딩 — 반드시 파일에서 읽는다
- ❌ Supabase 프로젝트 생성·스키마 실행·계정 발급 — 우리가 대시보드에서 한다
- ❌ service_role 키 사용 — anon key만 사용 (GitHub Pages 정적이라 숨길 서버 없음)

---

## 2. 통합 앱 구조 — 과목(course) 계층 추가

핵심 변경은 기존 `트랙 → 토픽` 구조 **위에 `과목(course)` 계층 하나를 얹는 것**이다. 트랙·토픽·프로젝트·채점·잠금 로직은 파이썬 버전과 **완전히 동일**하게 재사용하고, 그 위에 과목 선택 계층만 추가한다.

```
과목(course)              ← 신규 추가 계층
 └─ 트랙(track)           ← 기존 구조 그대로
     └─ 토픽(topic)       ← 기존 구조 그대로
         └─ 빈칸/퀴즈/FAQ ← 기존 구조 그대로
     └─ 미니 프로젝트     ← 기존 구조 그대로
```

**현재 과목 2개** (단, 코드는 개수를 하드코딩하지 말고 `courses` 목록을 읽을 것):
- `python` — 파이썬을 활용한 데이터 분석 (기존)
- `finance` — 디지털 금융 이론 (신규, 트랙 9개)

**UX 요구**:
- 로그인 후 **과목 선택 화면**(또는 상단 과목 전환 탭)을 둔다.
- 과목을 고르면 그 과목의 트랙 학습 지도로 들어간다.
- 대시보드에는 **과목별 진행률 + 통합 진행률**을 함께 보여준다.

---

## 3. 콘텐츠 디렉토리 구조 (과목 계층 반영)

```
content/
  courses.json                     # 과목 목록·메타 (신규)
  python/
    config/
      xp-rules.json
      badges.json
    tracks/
      track1/
        track.json
        project.json
        topics/ t1-*.json ...
      track2/ ... track7/
  finance/
    config/
      xp-rules.json                # 파이썬 규격과 동일 스키마
      badges.json                  # 파이썬 규격과 동일 스키마 (금융용 배지)
    tracks/
      track1/
        track.json
        project.json
        topics/ t1-*.json ...
      track2/ ... track9/
```

### 3-1. `courses.json` 스키마 (신규)
```json
{
  "courses": [
    {
      "id": "python",
      "order": 1,
      "title": "파이썬 데이터 분석",
      "description": "…",
      "theme": "terminal",          // 남색+청록 (기존)
      "contentPath": "content/python"
    },
    {
      "id": "finance",
      "order": 2,
      "title": "디지털 금융 이론",
      "description": "…",
      "theme": "finance",           // 딥네이비/그린 + 골드 포인트
      "contentPath": "content/finance"
    }
  ]
}
```
- 앱은 이 목록을 읽어 과목 화면을 구성한다. 과목이 늘어나면 항목만 추가된다.
- 각 과목은 **자체 `config/`(xp-rules.json, badges.json)** 를 갖는다 → 과목별 배지·XP 규칙 독립.

### 3-2. `track.json` / 토픽 / `project.json` 스키마
**파이썬 버전과 100% 동일**하다. 아래 규격을 그대로 따른다.

`track.json`:
```json
{
  "id": "track1",
  "order": 1,
  "title": "…",
  "description": "…",
  "topicOrder": ["track1.xxx", "…"],
  "topicFiles": ["topics/t1-xxx.json", "…"],
  "projectFile": "project.json"
}
```
- `topicOrder`와 `topicFiles`는 개수·순서가 일치한다. 앱은 이 순서대로 나열·잠금.

토픽 JSON:
```json
{
  "id": "track1.xxx",
  "trackId": "track1",
  "order": 1,
  "title": "…",
  "content": "## 마크다운 본문",
  "fillBlanks": [
    {
      "id": "fb1",
      "prompt": "문제 설명",
      "code": "…______ 형태",              // 빈칸은 ______(밑줄 6개)
      "answers": ["정답", "허용정답2"],       // 문자열 매칭(복수 정답 허용)
      "output": "정답",                       // 대표 정답(표시용). 빈 문자열이면 "출력 없음"
      "explain": "해설(필수)"
    }
    // 토픽당 fillBlanks 5개
  ],
  "quiz": {
    "passThreshold": 0.8,                     // 80% 통과 → 다음 토픽 잠금 해제
    "questions": [
      {
        "id": "q1",
        "type": "mcq",
        "q": "질문",
        "options": ["보기0","보기1","보기2","보기3"],
        "answer": 1,                          // 0-based 인덱스
        "explain": "해설(필수)"
      }
      // 토픽당 questions 5개
    ]
  },
  "faq": [ { "q": "질문", "a": "답변" } ]      // 토픽당 3개
}
```

`project.json`: 미션 5개(빈칸과 동일 채점 방식) + 리포트(template + computedValues).

**앱이 지켜야 할 채점 규칙**:
- 빈칸: 입력을 `answers` 배열과 **문자열 매칭**. 공백 trim, 따옴표·공백 정규화. **코드 실행 엔진 없음.**
  ```js
  function normalize(s){ return s.trim().replace(/['"]/g,'"').replace(/\s+/g,''); }
  function checkFill(input, answers){ return answers.some(a => normalize(a)===normalize(input)); }
  ```
- 퀴즈: 선택 인덱스 == `answer` 이면 정답. 점수 = 정답 수 / 전체. `passThreshold` 이상이면 통과 → 다음 토픽 잠금 해제.
- 빈칸/퀴즈 정답을 오답 시 즉시 공개하지 않는다("다시 시도" 처리).
- FAQ는 챗봇 UI(칩/버튼 → 저장된 답변을 말풍선으로). **실제 AI 호출 없음.**

---

## 4. 게이미피케이션 — 과목별 + 통합 이중 집계 (핵심 신규 요구)

### 4-1. XP·레벨
- XP 적립 원천 데이터는 **한 벌만 저장**한다(진도 레코드 기반). 표시할 때 두 가지로 집계한다.
  - **과목별 XP** = 해당 `course`의 진도만 필터해 합산
  - **통합 XP** = 전체 진도 합산(필터 없음)
- **레벨 공식**(파이썬 버전 실제 구현값 기준):
  - Lv(n)→Lv(n+1) 필요 XP = `200 + 50n`
  - XP→레벨:
    ```js
    function getLevel(xp){
      const n = (-175 + Math.sqrt(175*175 + 100*(xp+200))) / 50;
      return Math.max(1, Math.floor(n)+1);
    }
    ```
  - 레벨은 저장하지 않고 XP에서 계산. **과목별 레벨·통합 레벨을 각각 계산**해 표시.
- XP 적립 항목·값은 각 과목 `config/xp-rules.json`의 `awards` 참조(일일 접속, 스트릭 마일스톤/반복, 토픽 완료, 퀴즈 통과, 퀴즈 만점, 트랙 완료, 프로젝트 완료).
- 중복 적립 방지: `rules.oneTimePerItem`은 대상별 최초 1회. 일일 접속은 하루 1회. 스트릭 마일스톤은 각 일수 도달 시 1회.

- **대시보드 표시 예**: `파이썬 Lv.5 · 금융 Lv.2 · 통합 Lv.6` 처럼 나란히.

### 4-2. 배지 — scope 구분
배지 정의에 **`scope` 필드**를 두어 과목 종속 배지와 계정 전체 배지를 구분한다.
- `scope: "course"` — 특정 과목 안에서의 성취 (예: "파이썬 전체 트랙 완료", "금융 첫 토픽"). 과목의 `config/badges.json`에 정의.
- `scope: "global"` — 계정 전체 성취 (예: "누적 XP 10000", "두 과목 모두 수강"). 공통 배지로 판정.
- 배지 정의(이름·설명·아이콘·조건)는 파일에 있고, **획득 기록만** Supabase `user_badges`에 저장(`course`, `badge_id`).
- 조건은 규칙 데이터(`condition.type` + 파라미터)로 표현. 프론트가 진도·통계로 판정해 미획득 배지를 지급.
- **조건 타입 9종**(파이썬 버전 기준): `topic_count`, `quiz_pass_count`, `project_count`, `track_complete`, `topic_percent`, `all_tracks_complete`, `perfect_quiz_count`, `flawless_track`, `streak`, `level`.
  - `all_tracks_complete`, `level` 등은 **scope에 따라 과목 범위 / 전체 범위로 판정**한다(예: course 스코프면 그 과목 트랙만, global 스코프면 전 과목 기준).
- `icon`은 자리표시자 → lucide-react 등에 매핑.

### 4-3. 스트릭
- 학습·접속 날짜를 `user_stats.last_studied`와 비교. 어제면 +1, 오늘 이미 기록이면 유지, 이틀 이상 벌어지면 1로 리셋.
- 스트릭은 **계정 전체 기준 1개**로 운영(과목 무관하게 "오늘 학습했는가"). UI 톤은 끊겨도 부담 주지 않게(긍정 문구).

### 4-4. 진행률
- 저장된 진도로 계산(새 저장 불필요). 과목별 트랙 프로그레스 바 + 과목 완주율 + 통합 완주율. 잠긴 토픽이 순서대로 열리는 학습 지도.

---

## 5. Supabase 통합 스키마 (단일 프로젝트)

**핵심 변경: 진도·배지 테이블에 `course` 컬럼 추가.** 이 한 컬럼으로 과목별/통합 집계가 모두 가능하다.

> 우리가 새(또는 기존 빈) Supabase 프로젝트에서 아래 SQL을 실행한다. Antigravity는 이 스키마에 맞춰 쿼리하면 된다.

```sql
-- user_progress: 토픽/프로젝트별 진행 상태 (course 추가)
create table if not exists public.user_progress (
  user_id      uuid    not null references auth.users(id) on delete cascade,
  course       text    not null,                 -- 'python' | 'finance' (신규)
  topic_id     text    not null,                 -- "track1.variables", 프로젝트는 "track1.project"
  status       text    not null default 'in_progress'
                       check (status in ('locked','in_progress','completed')),
  quiz_passed  boolean not null default false,
  quiz_score   numeric,                          -- 최초 통과 점수(0~1)
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, course, topic_id)        -- course 포함 (신규)
);
create index if not exists idx_user_progress_user on public.user_progress(user_id);
create index if not exists idx_user_progress_user_course on public.user_progress(user_id, course);

-- user_stats: 사용자당 1행. 통합 XP·스트릭 저장. (과목별 XP는 progress에서 집계)
create table if not exists public.user_stats (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  xp           integer not null default 0 check (xp >= 0),   -- 통합 누적 XP
  last_studied date,
  streak_count integer not null default 0 check (streak_count >= 0),
  updated_at   timestamptz not null default now()
);

-- 과목별 XP를 별도 저장하고 싶다면 (선택) user_course_stats 사용.
-- 기본은 progress 기반 실시간 집계로 충분하므로 없어도 됨.
create table if not exists public.user_course_stats (
  user_id  uuid not null references auth.users(id) on delete cascade,
  course   text not null,
  xp       integer not null default 0 check (xp >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, course)
);

-- user_badges: 획득 배지 (course + scope 반영)
create table if not exists public.user_badges (
  user_id   uuid not null references auth.users(id) on delete cascade,
  course    text not null default 'global',   -- 'python'|'finance'|'global'
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, course, badge_id)
);
create index if not exists idx_user_badges_user on public.user_badges(user_id);

-- RLS: 4개 테이블 모두 enable + 본인 행만(auth.uid() = user_id) select/insert/update/delete.

-- 트리거1: updated_at 자동 갱신 (touch_updated_at)
-- 트리거2: 신규 가입 시 user_stats 자동 생성 (handle_new_user, on conflict do nothing)
--          ※ "첫 로그인 stats 없음" 버그 방지 — 필수
```

- 콘텐츠는 DB에 저장하지 않는다. `course`, `topic_id`, `badge_id`는 콘텐츠 파일의 문자열 식별자를 그대로 쓴다.
- 미니 프로젝트 진행도 `user_progress`에 `topic_id="<track>.project"`로 저장(별도 테이블 불필요).

---

## 6. 인증 / 계정 (통합)

- **인증**: 아이디+비밀번호만. 실제 이메일 미수집. 아이디를 `아이디@도메인` 형식으로 변환해 Supabase Auth에 전달.
  - 도메인: `ubion.kdt` (공통)
  - **아이디 소문자 정규화 필수**(Supabase가 이메일 소문자 저장). 사용자는 대문자 입력 가능.
- **아이디 체계**: `DF08001` = 과정(DF)+기수(08)+번호(001). 관리자 기수별 필터에 활용.
- **계정 1개로 전 과목 수강** (통합의 핵심 이점). 과목별 계정 복사 발급 불필요.
- 이메일 인증 끔. 회원가입 자유가입 막음(`ALLOW_SELF_SIGNUP=false`, 폼은 코드에 남기되 숨김). 계정은 **관리자가 대시보드에서 수동 발급(방법 B 고정).**
- 셀프 비밀번호 재설정 없음(분실 시 관리자 재설정). service_role 키 미사용.
- 게스트→로그인 시 로컬 진도 이관 안 함(게스트 진도 미저장 문구 표시).

---

## 7. 관리자(강사) 대시보드 — 조회 전용
- 관리자 식별: `admins` 테이블에 관리자 user_id 등록. **`auth.users`를 직접 조회하지 말 것**(권한 오류) → 필요한 사용자 정보는 **뷰(view)로 우회**해 노출.
- 기능: 기수별(아이디 prefix) 필터, **과목별 + 통합** 진도·완주율·XP 조회.
- 조회 전용. 계정 발급/수정은 Supabase 대시보드에서 수동.

---

## 8. ⚠️ 반드시 재발 방지할 시행착오 (PyDataLab 실경험)

1. **로그인 무한 렌더 루프** — 진도 저장 로직이 렌더마다 상태를 갱신해 무한 루프가 났었다. 진도 저장/조회는 useEffect 의존성·조건을 엄격히 관리하고, 저장 트리거를 명확한 이벤트에만 건다. (게스트는 정상인데 로그인만 멈추면 Supabase 연동 로직이 범인.)
2. **관리자 `auth.users` 직접 조회 권한 오류** — 뷰로 우회한다(위 7장).
3. **service_role 키 사용 금지** — anon key만. 정적 호스팅이라 서버에 숨길 곳이 없다.
4. **첫 로그인 시 user_stats 없음** — 가입 트리거(handle_new_user)로 자동 생성.

---

## 9. GitHub 레포 변경 요청

기존 레포 이름이 `python-support`(파이썬 전용)라 통합 취지와 맞지 않는다. **아래 레포로 변경/이전한다.**

- **새 레포 주소**: `https://github.com/wiky86/kdt-support.git`
- 레포명 `kdt-support`로 통일(파이썬·금융을 포함한 KDT 전 과목 학습 보조).
- 기존 `python-support`의 커밋 이력·코드를 `kdt-support`로 이전(또는 rename)하고, 원격 origin을 새 주소로 갱신한다.
- GitHub Pages 배포 설정·경로도 새 레포 기준으로 재구성한다.
  - 정적 배포에서 라우팅(과목/트랙 경로)이 404 나지 않도록 base path·SPA fallback을 새 레포명에 맞게 설정.

---

## 10. 우리(제품 오너)가 직접 하는 일 (Antigravity 제외 범위)
- ✅ 과목별 콘텐츠 JSON 작성·커밋 (파이썬 기존분 + 금융 트랙 9개)
- ✅ Supabase 프로젝트 준비 + 통합 스키마 SQL 실행
- ✅ 계정 수동 발급(방법 B)
- ✅ 최종 배포 트리거 / 도메인 연결
- ✅ 새 레포(`kdt-support`) 생성 및 origin 연결

Antigravity는 **앱 코드·UI·로직**에 집중한다. 콘텐츠는 채우지 않는다(1장).

---

## 11. Antigravity가 우리에게 요청할 것
- PyDataLab 기존 소스(통합의 베이스) 접근 권한
- 금융 테마 팔레트 확정 요청(딥네이비/그린 + 골드 초안 → 우리 확정)
- 필요한 환경변수 목록(Supabase URL/anon key 등) — 값은 우리가 채움
- `courses.json`, 과목별 `config/*` 규격 확정용 파이썬 참고본

---

### 부록 A. 금융 과목 콘텐츠 현황 (참고)
- 트랙 9개 / 토픽 54개 / 미니 프로젝트 9개, 전량 스키마 검증 통과.
- 트랙 구성(학습 논리 순 재배열): (1) Finance 입문 (2) 거시경제 (3) 금융업종별 비교 (4) 증권분석·기업가치평가 (5) 외환시장 (6) 파생상품 (7) 리스크관리 (8) 퀀트투자·자산배분 (9) 디지털뱅킹&AI.
  - ※ 최종 트랙 순서/구성은 우리가 커밋하는 `track.json`의 `order`를 따른다.
- 각 토픽 = 개념(마크다운) + 빈칸 5 + 퀴즈 5(80% 통과) + FAQ 3. 각 프로젝트 = 미션 5 + 리포트.
- 계산 포함 트랙의 수치는 전부 검산 완료.

### 부록 B. 파이썬 과목 콘텐츠 현황 (참고)
- 트랙 7개(track1 파이썬 기초 등), 토픽·미니 프로젝트 구성은 위 스키마와 동일.
- config: xp-rules.json(레벨 `200+50n`), badges.json(배지 24종·조건 9종).

### 부록 C. 이번 패키지에 포함된 config 파일 (실제 제공)
아래 파일이 이 패키지에 함께 들어 있다. Antigravity는 이 규격대로 읽어 렌더링·판정하면 된다.

```
content/
  courses.json                      # 과목 2개(python, finance) 메타
  global-badges.json                # 계정 전체(global) 배지 9종 + 조건 타입 6종
  python/config/xp-rules.json       # 파이썬 XP·레벨 규칙 (확정값)
  python/config/badges.json         # 파이썬 배지 24종 (scope=course)
  finance/config/xp-rules.json      # 금융 XP·레벨 규칙 (파이썬과 동일 공식)
  finance/config/badges.json        # 금융 배지 26종 (트랙 9개 반영, scope=course)
```

- **레벨 공식(공통)**: Lv(n)→Lv(n+1) = `200 + 50n`, 누적 = `25n² + 175n − 200`. `getLevel`은 각 config의 `_notes.levelCalc` 참조.
- **배지 scope**: 과목 배지는 `scope:"course"`, 전체 배지는 `global-badges.json`의 `scope:"global"`. 앱은 course 배지는 해당 과목 데이터로, global 배지는 전 과목 합산 데이터로 판정한다.
- **트랙 콘텐츠 JSON**(track.json/토픽/project.json)은 우리가 별도로 커밋한다. 이 패키지의 config는 게이미피케이션 규격 확정용이다.
- 규모 참고(공식 기준): 파이썬 완주 ≈ Lv8, 금융 완주 ≈ Lv10, 두 과목 완주 통합 ≈ Lv13.

---

*이 문서 하나로 Antigravity는 "기존 파이썬 앱에 과목 계층을 얹고 금융을 통합"하는 작업에 바로 착수할 수 있다. 콘텐츠 zip과 이 문서를 함께 전달한다.*
