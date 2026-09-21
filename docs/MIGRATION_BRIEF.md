# python-support → kdt-support 통합 마이그레이션 지시서 (Antigravity 전용)

> **이 문서의 성격**: 새 앱을 짓는 지시가 아니다. **이미 작업 중인 `python-support` 폴더를 제자리에서 개조**해,
> 파이썬 단일 과목 앱을 **파이썬 + 금융 2과목 통합 앱**으로 바꾸는 마이그레이션 작업이다.
> 기존 콘텐츠 파일의 **내용은 절대 수정하지 않는다.** 위치 이동과 앱 코드 개조만 한다.
> 상세 설계 근거는 함께 전달된 `ANTIGRAVITY_INTEGRATION_BRIEF.md`를 참조한다. 이 문서는 그 실행편이다.

---

## 0. 현재 상태 (작업 시작 전 실제 폴더)

```
python-support/
├── (앱 코드: Next.js/React 등 기존 구현)
└── content/
    ├── config/
    │   ├── xp-rules.json          # 파이썬 XP 규칙
    │   └── badges.json            # 파이썬 배지
    └── tracks/
        ├── track1/ ... track7/    # 파이썬 콘텐츠 (과목 구분 없이 바로 있음)
        │   ├── track.json
        │   ├── topics/ t*.json
        │   └── project.json
```

- 콘텐츠가 `content/tracks/` 아래 **과목 구분 없이 바로** 놓여 있다.
- 앱 코드는 이 경로(`content/tracks/trackN`, `content/config`)를 직접 참조하도록 짜여 있다.
- **금융 콘텐츠는 아직 이 폴더에 없다.** (제품 오너가 별도 zip을 풀어 넣을 예정 — 5장 참조)

---

## 1. 목표 상태 (작업 완료 후 폴더)

```
kdt-support/                          # (레포명 변경 — 9장)
├── (앱 코드: 과목 계층 지원하도록 개조)
└── content/
    ├── courses.json                  # 신규: 과목 목록 (python, finance)
    ├── global-badges.json            # 신규: 계정 전체 배지
    ├── python/
    │   ├── config/
    │   │   ├── xp-rules.json         # 기존 content/config/에서 이동
    │   │   └── badges.json           # 기존에서 이동 + scope 필드 반영본으로 교체
    │   └── tracks/
    │       └── track1/ ... track7/   # 기존 content/tracks/에서 통째로 이동
    └── finance/
        ├── config/
        │   ├── xp-rules.json         # 신규 제공본
        │   └── badges.json           # 신규 제공본
        └── tracks/
            └── track1/ ... track9/   # 제품 오너가 zip에서 풀어 넣음 (5장)
```

---

## 2. Antigravity가 수행할 작업 — 순서대로

### STEP 1. 파이썬 콘텐츠를 과목 폴더로 이동 (내용 변경 금지)
1. `content/python/` 폴더를 새로 만든다.
2. 기존 `content/tracks/`(track1~7 전체)를 `content/python/tracks/`로 **통째로 이동**한다.
3. 기존 `content/config/`(xp-rules.json, badges.json)를 `content/python/config/`로 **이동**한다.
4. 이동 후 원래의 `content/tracks/`, `content/config/`는 비어 있어야 한다(삭제).
5. **주의**: 토픽/트랙/프로젝트 JSON의 **내용(본문·빈칸·퀴즈)은 한 글자도 바꾸지 않는다.** 경로만 바뀐다.

> `content/python/config/`의 두 파일은, 함께 전달된 통합본으로 **교체**한다(아래 STEP 4에서 일괄). 기존 파이썬 badges.json에는 `scope` 필드가 없으므로, 통합본(`scope:"course"`, id에 `py_` 접두사)으로 갈아끼워야 global/과목 판정이 맞물린다.

### STEP 2. 금융 과목 폴더 골격 생성
1. `content/finance/config/` 폴더를 만든다.
2. `content/finance/tracks/` 폴더를 만든다(비어 있어도 됨 — 콘텐츠는 제품 오너가 채운다).
3. 함께 전달된 `finance/config/xp-rules.json`, `finance/config/badges.json`을 여기에 배치한다.

### STEP 3. 과목 메타 파일 배치
1. 함께 전달된 `courses.json`을 `content/courses.json`에 배치한다.
2. 함께 전달된 `global-badges.json`을 `content/global-badges.json`에 배치한다.

### STEP 4. 제공된 config 4종 + 메타 2종 반영 (최종 확인)
아래 6개 파일이 제자리에 있어야 한다. 함께 전달된 통합 패키지의 파일로 채운다.
- `content/courses.json`
- `content/global-badges.json`
- `content/python/config/xp-rules.json`
- `content/python/config/badges.json`  ← 기존 것 대체(scope 반영본)
- `content/finance/config/xp-rules.json`
- `content/finance/config/badges.json`

### STEP 5. 앱 코드 개조 — 과목(course) 계층 지원
기존 앱은 `content/tracks`, `content/config`를 직접 참조한다. 이를 **과목 계층**으로 바꾼다.

1. **콘텐츠 로더 경로 변경**: 모든 콘텐츠 경로에 과목 세그먼트를 넣는다.
   - `content/tracks/trackN` → `content/{course}/tracks/trackN`
   - `content/config/*` → `content/{course}/config/*`
   - `content/courses.json`을 읽어 과목 목록을 구성(개수 하드코딩 금지).
2. **라우팅에 과목 추가**: 기존 `/track/[trackId]` 형태 위에 과목을 얹는다.
   - 예: `/[course]/track/[trackId]`, `/[course]/topic/[topicId]`
   - 로그인 후 **과목 선택 화면**(또는 상단 과목 전환 탭)을 추가. `courses.json` 기반.
3. **진도 저장에 course 반영**: 아래 5장 Supabase 스키마대로 `user_progress`, `user_badges`에 `course` 컬럼을 포함해 읽고 쓴다.
4. **게이미피케이션 이중 집계**:
   - 과목별 XP/레벨 = 해당 course 진도만 집계.
   - 통합 XP/레벨 = 전 과목 합산.
   - 배지: `scope:"course"`는 과목 데이터로, `global-badges.json`의 `scope:"global"`은 전 과목 합산으로 판정.
   - 대시보드에 `파이썬 Lv.x · 금융 Lv.y · 통합 Lv.z`와 과목별/통합 진행률을 함께 표시.
5. **스트릭은 계정 전체 1개**(과목 무관, `user_stats`).
6. 트랙/토픽/과목 **개수를 코드에 하드코딩하지 말 것.** 전부 파일 목록에서 읽는다.

### STEP 6. 레포/배포 갱신 (9장)
- 원격 origin을 새 레포로 변경, GitHub Pages base path·SPA fallback을 새 레포명으로 재설정.

---

## 3. 반드시 지킬 원칙 (기존 PyDataLab 규칙 유지)
- 콘텐츠는 DB로 옮기지 않는다. `content/` 정적 파일이 원본.
- 코드 실행 엔진 없음. 빈칸은 문자열 정규화 비교 + 저장된 output 표시.
- 퀴즈는 파일 순서대로(랜덤 금지), passThreshold 통과 시 다음 토픽 잠금 해제.
- 레벨은 저장하지 않고 XP에서 계산. 만점/flawless는 최초 통과 점수 기준.
- Supabase RLS 필수. service_role 키 미사용(anon key만).

---

## 4. 채점/스키마 규격 (콘텐츠 — 변경 없음, 참조용)
기존 파이썬과 금융 콘텐츠는 **동일 스키마**다. 앱은 이 규격대로 읽는다.
- `track.json`: id, order, title, description, topicOrder[], topicFiles[], projectFile
- 토픽 JSON: id, trackId, order, title, content(markdown), fillBlanks[5], quiz{passThreshold, questions[5]}, faq[3]
  - fillBlanks: { id, prompt, code(빈칸 `______`), answers[], output, explain }
  - questions: { id, type:"mcq", q, options[], answer(0-based), explain }
- project.json: id, trackId, title, intro/dataset, missions[5], report{template, computedValues, ...}
- 빈칸 채점 정규화:
  ```js
  function normalize(s){ return s.trim().replace(/['"]/g,'"').replace(/\s+/g,''); }
  function checkFill(input, answers){ return answers.some(a => normalize(a)===normalize(input)); }
  ```

---

## 5. 제품 오너가 직접 하는 일 (Antigravity 범위 밖)
- ✅ **금융 콘텐츠 투입**: `finance-theory-content.zip`을 풀어 `content/finance/tracks/track1~9`에 배치한다.
  - zip 내부 구조가 `content/tracks/trackN`이면, `trackN` 폴더들만 꺼내 `content/finance/tracks/` 아래에 넣는다.
  - 금융 콘텐츠 내용은 검증 완료본이므로 수정하지 않는다.
- ✅ **Supabase 통합 스키마 SQL 실행**(6장) — 기존 테스트 데이터는 삭제 가능하므로 통합 스키마로 재구성.
- ✅ **계정 발급**(방법 B), **배포 트리거/도메인 연결**, **레포 생성/origin 연결**.

> Antigravity는 금융 트랙 콘텐츠 JSON을 생성하지 않는다. 빈 `content/finance/tracks/`만 만들어두면 된다.

---

## 6. Supabase 통합 스키마 (단일 프로젝트, course 컬럼 추가)
> 실사용자 데이터 없음(테스트 계정뿐, 삭제 가능) → 마이그레이션 없이 아래로 재구성.

```sql
-- user_progress: course 추가
create table if not exists public.user_progress (
  user_id      uuid    not null references auth.users(id) on delete cascade,
  course       text    not null,                 -- 'python' | 'finance'
  topic_id     text    not null,                 -- "track1.variables", 프로젝트는 "track1.project"
  status       text    not null default 'in_progress'
                       check (status in ('locked','in_progress','completed')),
  quiz_passed  boolean not null default false,
  quiz_score   numeric,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, course, topic_id)
);
create index if not exists idx_user_progress_user on public.user_progress(user_id);
create index if not exists idx_user_progress_user_course on public.user_progress(user_id, course);

-- user_stats: 통합 XP·스트릭
create table if not exists public.user_stats (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  xp           integer not null default 0 check (xp >= 0),
  last_studied date,
  streak_count integer not null default 0 check (streak_count >= 0),
  updated_at   timestamptz not null default now()
);

-- user_badges: course + scope 반영 (course='python'|'finance'|'global')
create table if not exists public.user_badges (
  user_id   uuid not null references auth.users(id) on delete cascade,
  course    text not null default 'global',
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, course, badge_id)
);
create index if not exists idx_user_badges_user on public.user_badges(user_id);

-- RLS: 3테이블 모두 enable + 본인 행(auth.uid()=user_id)만.
-- 트리거: updated_at 자동 갱신 / 신규 가입 시 user_stats 자동 생성(handle_new_user).
```

---

## 7. 재발 방지 (PyDataLab 실경험)
1. 로그인 무한 렌더 루프 — 진도 저장 로직의 useEffect 의존성 엄격 관리. (게스트 정상·로그인만 멈추면 Supabase 로직이 원인)
2. 관리자 `auth.users` 직접 조회 금지 → 뷰로 우회.
3. service_role 키 미사용(anon key만).
4. 첫 로그인 user_stats 없음 → 가입 트리거로 자동 생성.

---

## 8. 작업 완료 체크리스트 (Antigravity 자가 점검)
- [ ] `content/tracks/`, `content/config/`가 비었고, `content/python/` 아래로 이동됨
- [ ] 파이썬 트랙 JSON 내용이 이동 전과 100% 동일(내용 무변경)
- [ ] `content/finance/config/` 2파일 배치, `content/finance/tracks/`는 빈 폴더로 준비
- [ ] `content/courses.json`, `content/global-badges.json` 배치
- [ ] `content/python/config/badges.json`이 scope 반영본으로 교체됨
- [ ] 콘텐츠 로더가 `content/{course}/...` 경로로 읽음, courses.json 기반 과목 목록
- [ ] 라우팅에 과목 세그먼트 추가, 과목 선택 화면 존재
- [ ] 진도/배지 저장에 course 반영, 이중 집계(과목별+통합) 동작
- [ ] 트랙/토픽/과목 개수 하드코딩 없음

---

## 9. 레포 변경
- 새 레포: `https://github.com/wiky86/kdt-support.git`
- `python-support` → `kdt-support`로 rename(또는 이전). 커밋 이력 보존.
- 원격 origin 갱신: `git remote set-url origin https://github.com/wiky86/kdt-support.git`
- GitHub Pages 배포 설정·base path를 새 레포명(`kdt-support`)에 맞게 재구성. SPA fallback(404 방지) 포함.

---

*이 문서는 "기존 python-support 폴더 제자리 개조" 실행 지시다. 콘텐츠 내용은 이동만, 앱 코드는 과목 계층으로 개조, 금융 콘텐츠는 제품 오너가 zip에서 투입한다.*
