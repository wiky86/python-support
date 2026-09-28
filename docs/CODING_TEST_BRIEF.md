# 코딩테스트 메뉴 설계서 (Antigravity 전용)

> **목적**: 파이썬·SQL 문제를 모아 실전처럼 풀어보는 **별도 "코딩테스트" 메뉴**를 추가한다.
> 학습 과목과 독립된 문제은행이며, **코드 실행 엔진은 쓰지 않는다**(결과 비교 + 빈칸 채점).
> 콘텐츠(문제 JSON)는 제품 오너가 커밋한다. Antigravity는 메뉴·화면·채점·분류 UI를 만든다.

---

## 0. 핵심 성격

- **학습 과목과 별개**: 과목(python/finance/sql) 안의 빈칸·퀴즈는 "개념을 배우며 푸는" 것이고, 코딩테스트는 "배운 걸 종합해 실전 문제로 푸는" 것이다.
- **대상**: 파이썬, SQL 두 가지만. (금융은 코딩테스트 대상 아님)
- **순차 잠금 없음**: 실전 연습이므로 아무 문제나 자유롭게 풀 수 있다. 과목 학습의 순차 잠금과 무관.
- **실행 엔진 없음**: 결과형(출력/결과값 입력) + 빈칸형(코드 골격 채우기) 두 유형. 기존 채점 로직 재사용.

---

## 1. 진입 / 위치

- 전역 내비게이션(Navbar)에 "코딩테스트" 메뉴 추가. 과목 선택과 동급의 최상위 메뉴.
- 라우팅 제안:
  - /coding-test — 랜딩(파이썬/SQL 선택 + 유형 필터)
  - /coding-test/python — 파이썬 문제 목록(유형별)
  - /coding-test/sql — SQL 문제 목록(유형별)
  - /coding-test/python/[problemId] — 개별 문제 풀이
  - /coding-test/sql/[problemId] — 개별 문제 풀이
- 로그인 사용자만 풀이/기록 저장(비로그인은 문제 열람만 가능하게 하거나 로그인 유도 — 제품 오너 선택. 기본은 로그인 유도).

---

## 2. 분류 — 유형별 (난이도 아님)

문제를 **유형(카테고리)별**로 묶어 보여준다. 난이도 필터는 이번 범위에서 제외(추후 확장 가능).

- 유형은 콘텐츠에서 정의한다. 앱은 유형 목록을 문제 데이터에서 동적으로 수집해 필터 UI를 만든다(하드코딩 금지).
- 파이썬 유형 예: 자료구조, 조건·반복, 문자열 처리, 함수, 컴프리헨션, pandas 기초 …
- SQL 유형 예: 조회 기초, 조건문, 정렬·함수, 집계, JOIN, 서브쿼리, 데이터 조작 …
- 목록 화면: 유형 탭 또는 유형 필터 칩. 각 문제는 제목 + 유형 + 풀이 상태(안 풂/맞음/틀림) 표시.

---

## 3. 문제 스키마 — content/coding-test/{lang}/*.json

과목 콘텐츠와 분리된 별도 디렉토리:

```
content/coding-test/
  python/
    problems.json        # 파이썬 문제 배열 (또는 문제별 파일 분리)
  sql/
    problems.json        # SQL 문제 배열
```

문제 공통 스키마:

```json
{
  "id": "ct.py.001",
  "lang": "python",              // "python" | "sql"
  "category": "집계",            // 유형(필터 기준). 자유 문자열, 앱이 수집해 필터 구성
  "title": "부서별 평균 급여 구하기",
  "prompt": "## 문제\n설명(마크다운). 필요한 데이터/테이블 정의 포함.",
  "type": "result",             // "result"(결과형) | "fill"(빈칸형)

  // --- type=result 일 때 ---
  "code": "실행 대상으로 보여줄 코드/쿼리(마크다운 코드블록 아님, 순수 텍스트)",
  "answers": ["기대 출력/결과값", "허용 표기2"],   // 문자열 매칭(정규화)
  "ignoreCase": true,           // SQL 등 대소문자 무시 필요 시
  "explain": "왜 이 결과가 나오는지 해설",

  // --- type=fill 일 때 ---
  "skeleton": "SELECT dept, ______ FROM emp ______ dept;",  // 빈칸 ______
  "blanks": [
    { "id": "b1", "answers": ["AVG(salary)"], "ignoreCase": true },
    { "id": "b2", "answers": ["GROUP BY"], "ignoreCase": true }
  ],
  "expectedOutput": "완성 코드를 실행하면 나오는 출력(해설에 표시)",  // 아래 4-2
  "explainFill": "정답 설명"
}
```

- type=result: code(또는 쿼리)를 보여주고, 사용자는 그 실행 결과/출력을 입력. answers 와 정규화 비교.
- type=fill: skeleton 의 빈칸(______)을 순서대로 채우게 하고, 각 blank.answers 와 비교(복수 정답 허용).
- ignoreCase: SQL 문제는 대체로 true. 파이썬 결과값도 표기 흔들림 있으면 개별 지정.
- category 는 자유 문자열이되, 콘텐츠 제작 시 lang 별로 표기를 통일한다(같은 유형을 "집계"/"집계함수"로 섞지 말 것).

---

## 4. 채점 규칙

### 4-1. 공통
- 정규화: SQL_COURSE_BRIEF 3장의 normalize 재사용(공백 제거 + 따옴표 통일 + ignoreCase 시 소문자화).
- 오답 시 정답을 즉시 공개하지 않고 "다시 시도" 처리. (원하면 N회 후 해설 공개 — 제품 오너 선택, 기본은 사용자가 "해설 보기"를 눌러야 공개)

### 4-2. 빈칸형 해설 = 완성 코드의 출력 포함 (제품 오너 요구)
- 빈칸형 문제는 해설에 **정답 설명 + 그 빈칸을 채운 완성 코드의 실제 출력(expectedOutput)** 을 함께 보여준다.
- 실행 엔진이 없으므로 expectedOutput 은 콘텐츠에 미리 저장된 값이다. 앱은 이를 "완성 코드 + 그 출력" 형태로 렌더한다.
- 표시 예: 정답 설명 → "완성된 코드:" (빈칸을 정답으로 채운 전체 코드) → "실행 결과:" (expectedOutput).

### 4-3. 결과형
- 사용자가 입력한 결과값을 answers 와 비교. 정답이면 통과, 해설(explain) 노출.

---

## 5. 풀이 기록 저장 (Supabase — 신규 테이블 1개)

코딩테스트 풀이 상태를 저장한다. 과목 진도(user_progress)와 분리(성격이 다름).

```sql
create table if not exists public.coding_test_progress (
  user_id     uuid    not null references auth.users(id) on delete cascade,
  problem_id  text    not null,                 -- "ct.py.001"
  lang        text    not null,                 -- 'python' | 'sql'
  solved      boolean not null default false,
  attempts    integer not null default 0,
  last_tried  timestamptz,
  solved_at   timestamptz,
  primary key (user_id, problem_id)
);
create index if not exists idx_ctp_user on public.coding_test_progress(user_id);
create index if not exists idx_ctp_user_lang on public.coding_test_progress(user_id, lang);

alter table public.coding_test_progress enable row level security;

drop policy if exists ctp_select on public.coding_test_progress;
create policy ctp_select on public.coding_test_progress
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.admins a where a.user_id = auth.uid())
  );
drop policy if exists ctp_insert_own on public.coding_test_progress;
create policy ctp_insert_own on public.coding_test_progress
  for insert with check (auth.uid() = user_id);
drop policy if exists ctp_update_own on public.coding_test_progress;
create policy ctp_update_own on public.coding_test_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- 문제 목록에서 "안 풂 / 맞음 / 틀림(시도했으나 미해결)"을 이 데이터로 표시.
- 관리자도 조회 가능(admins). 훈련생별 코딩테스트 진척을 관리자 대시보드에서 볼 수 있게(선택 확장).

### XP 연동 — 확정됨
- 코딩테스트 문제 **최초 해결 시 소량 XP를 통합 XP(user_stats.xp)에 가산**한다.
  - 권장값: 문제당 10 XP(제품 오너가 xp-rules 에 준해 조정 가능). 최초 1회만(재풀이는 미가산).
  - 과목 XP(python/finance/sql 각각)에는 반영하지 않는다. 코딩테스트는 특정 과목에 귀속되지 않으므로 **통합 XP에만** 더한다. 따라서 통합 레벨은 오르지만 개별 과목 레벨에는 영향 없음.
  - 중복 방지: coding_test_progress.solved 가 false→true 로 바뀌는 순간에만 1회 가산.
- 이 정책은 과목별+통합 이중 집계 구조와 모순되지 않는다(통합 XP = 과목 XP 합 + 코딩테스트 XP + 스트릭 등 계정 보너스).

> 주의: 기존에 "통합 XP = 전 과목 합산"으로 단순 정의했다면, 코딩테스트 XP·스트릭 보너스 같은 **과목에 안 묶이는 XP**가 통합에 더해지므로, 통합 XP를 "과목 XP 단순 합"으로 재계산하지 말고 user_stats.xp 를 원천으로 삼아야 한다. (과목 XP는 표시용 필터 집계, 통합 XP는 user_stats.xp 원천값)

---

## 6. 화면 요구
- 랜딩(/coding-test): 파이썬/SQL 카드 2개 + 각 언어 문제 수·해결 수 요약.
- 목록(/coding-test/{lang}): 유형 필터 + 문제 카드 목록(제목·유형·상태). 정렬은 기본 문제 id 순.
- 풀이(/coding-test/{lang}/[problemId]):
  - prompt(마크다운) 렌더.
  - type=result: 코드 표시 + 결과 입력창 + 제출.
  - type=fill: skeleton 표시(빈칸 입력 필드) + 제출.
  - 채점 결과 + 해설(4-2/4-3). 빈칸형은 완성 코드 + 출력 표시.
  - 이전/다음 문제 이동(같은 lang 내).
- 코드/쿼리 표시는 기존 코드 하이라이팅 컴포넌트 재사용.

---

## 7. Antigravity 작업 범위
- 코딩테스트 메뉴/라우팅/화면(랜딩·목록·풀이) 구현.
- 유형 필터를 문제 데이터에서 동적 수집(하드코딩 금지).
- 결과형/빈칸형 채점(기존 정규화 + ignoreCase 재사용), 빈칸형 해설에 완성 코드+출력 렌더.
- coding_test_progress 연동(제품 오너가 SQL 실행 후), 상태 표시.
- (XP 연동 여부는 제품 오너 결정 후 반영)

## 8. 제품 오너 작업 범위
- content/coding-test/python/, sql/ 문제 작성·커밋(각 20~30문제). MySQL 기준(SQL 문제).
- coding_test_progress 테이블 SQL 실행.
- (확정) 코딩테스트 XP: 문제당 소량(권장 10 XP) 통합 XP 가산, 최초 1회.
- (확정) 기준 DB: MySQL.
- 비로그인 열람 허용 여부만 미결(기본: 로그인 유도).

---

## 9. 반드시 지킬 원칙
- 실행 엔진 없음(결과 비교 + 빈칸, 저장된 expectedOutput).
- 콘텐츠는 정적 JSON, DB로 옮기지 않음.
- 유형·문제 수 하드코딩 금지(데이터에서 읽음).
- service_role 키 미사용, RLS 필수.
- 레포명·경로 변경 금지. 표시명 "UBION KDT DataLab" 유지.
