# 사전학습 기능 설계서 — 진단 테스트 & 로드맵 카드

> **목적**: 새 훈련생의 **사전학습 효과성**을 높인다. 과정 시작 전(1주~1개월, 개인차 큼) 각자 필요한 만큼 자기주도로 학습하도록,
> "지금 내 상태"를 보여주는 **진단 테스트**와 "왜·무엇을 배우는지"를 보여주는 **로드맵 카드**를 추가한다.
> Antigravity 전달용 실행 설계서. 기존 앱 구조(순차 잠금·퀴즈 엔진·Supabase)를 재활용하며, 그 구조를 **흔들지 않는다.**

---

## 0. 설계 원칙 (반드시 지킬 것)

1. **순차 잠금 구조를 절대 흔들지 않는다.** 진단 결과에서 특정 트랙으로 "바로가기"를 제공하지 않는다. 학습은 여전히 트랙1 → 트랙2 → … 순서로만 진행한다. 진단은 **현황 표시 전용**이다.
2. **진단은 현황만 보여준다.** "약한 트랙으로 이동", "이 트랙부터 시작" 같은 유도 버튼·링크를 넣지 않는다. 트랙별 강약 지도까지만 보여주고 끝낸다.
3. **재응시 불가(기본).** 훈련생은 과목당 진단을 1회만 응시한다. 단 **관리자는 특정 훈련생에게 재응시 권한을 부여**할 수 있다(7장).
4. 기존 채점·저장 로직을 재사용한다. 새로 만드는 것은 진단 문항 세트, 결과 집계·표시, 재응시 권한 관리, 로드맵 콘텐츠다.
5. 콘텐츠(진단 문항·로드맵 카드)는 기존과 동일하게 `content/` 정적 JSON에 둔다. DB에 넣지 않는다.

---

# PART A. 진단 테스트 (Diagnostic Test)

## A-1. 개념

- 과목(python/finance)마다 **독립된 진단 테스트 1종**.
- 과목의 여러 트랙을 **고루 커버하는 문항 세트**를 한 번에 풀고, 결과를 **트랙별 강약 지도**로 본다.
- 목적은 점수 매기기가 아니라 "내가 지금 어디가 되고 어디가 안 되는지"를 본인이 자각하는 것. (그리고 강사가 기수 경향을 파악)
- **학습 경로에 개입하지 않는다.** 결과를 봐도 학습은 트랙1부터 순서대로.

## A-2. 문항 구성

- 각 트랙에서 1~2문항씩 뽑아 과목 전체를 커버한다.
  - 파이썬: 7트랙 → 문항 10~14개 권장
  - 금융: 9트랙 → 문항 12~18개 권장
- 문항 형식은 기존 퀴즈와 동일한 `mcq`(4지선다)를 재사용한다. 채점 로직을 그대로 쓸 수 있다.
- **각 문항에 `trackId` 태그 필수.** 이 태그로 결과를 트랙별로 집계한다.
- 난이도는 "그 트랙을 이미 아는 사람이면 풀 수 있는" 수준. 즉 진단은 "선수 지식/사전 이해도" 측정.

## A-3. 콘텐츠 스키마 — `content/{course}/diagnostic.json` (신규)

```json
{
  "course": "python",
  "title": "파이썬 데이터 분석 사전 진단",
  "description": "과정 시작 전, 현재 나의 이해도를 확인해봅니다. 결과는 학습 순서를 바꾸지 않으며 참고용입니다.",
  "instruction": "총 12문항입니다. 모르는 문항은 찍지 말고 '모르겠음'을 선택해도 좋습니다. 진단은 1회만 응시할 수 있습니다.",
  "allowDontKnow": true,
  "questions": [
    {
      "id": "diag.py.1",
      "trackId": "track1",
      "type": "mcq",
      "q": "문항 내용(마크다운/코드 가능)",
      "options": ["보기0", "보기1", "보기2", "보기3"],
      "answer": 2,
      "explain": "해설(결과 화면에서 노출)"
    }
  ]
}
```

- `allowDontKnow: true`면 각 문항에 "모르겠음" 보기를 UI가 자동으로 덧붙인다(오답 처리, 단 통계에서 "찍음"과 구분). 찍기로 인한 강약 지도 왜곡을 줄이기 위함.
- `trackId`는 해당 과목의 실제 트랙 id(track1~track7 / track1~track9)와 일치해야 한다.
- 문항 순서는 파일 순서 그대로(랜덤 금지) — 기존 퀴즈 규칙과 동일.

## A-4. 채점·집계 로직

- 개별 문항 채점: 선택 인덱스 == `answer` → 정답. (기존 퀴즈 채점 재사용)
- **트랙별 집계**: 같은 `trackId` 문항들을 묶어 정답률 계산.
  - 예: track4에 2문항 → 둘 다 맞으면 100%, 하나면 50%, 없으면 0%.
- 트랙별 정답률을 3단계로 라벨링(임계값은 조정 가능, 아래는 기본):
  - `강함(strong)`: 정답률 ≥ 80%
  - `보통(fair)`: 40% ~ 79%
  - `약함(weak)`: < 40%
- 과목 전체 종합 점수(맞은 문항/전체)도 함께 표시.

## A-5. 결과 화면 — "트랙별 강약 지도" (현황 표시 전용)

- 과목의 트랙을 **학습 순서대로(order)** 나열하고, 각 트랙에 강/보통/약 라벨과 정답률을 표시한다.
- 시각화는 트랙 순서대로 늘어선 막대/신호등/히트 바 형태. (트랙을 클릭해도 이동하지 않음 — 정보만)
- 문항별 해설(`explain`)을 펼쳐볼 수 있게 한다(학습 자료로서 가치).
- **금지**: "이 트랙부터 시작하기", "약점 트랙 바로가기" 등 학습 이동 유도 요소. 결과는 읽고 닫는 화면이다.
- 안내 문구 예: "이 결과는 참고용입니다. 학습은 트랙1부터 순서대로 진행됩니다. 약하게 나온 트랙은 해당 차례가 오면 더 신경 써서 학습해 보세요."
- 재응시 불가 안내: "진단은 1회 응시로 마감되었습니다. 재응시가 필요하면 담당자에게 문의하세요."

## A-6. 응시 흐름·상태

- 로그인 사용자만 응시(결과 저장 필요). 진입 지점은 과목 화면 상단 또는 홈의 "사전 진단" 진입 카드.
- 상태: `not_taken`(미응시) → `completed`(완료). 완료 후에는 결과 화면만 다시 볼 수 있고 재응시 불가.
- 진단 미응시여도 학습은 자유롭게 시작 가능(진단은 필수 관문이 아니다). 단 "먼저 진단을 받아보세요" 권유 배너는 표시 가능.

---

## A-7. Supabase 스키마 추가 (진단 저장 + 재응시 권한)

기존 스키마(user_progress/user_stats/user_badges)는 그대로 두고, 아래 2개 테이블을 추가한다.

```sql
-- 진단 응시 결과 (사용자 x 과목 당 1행)
create table if not exists public.user_diagnostics (
  user_id       uuid    not null references auth.users(id) on delete cascade,
  course        text    not null,                 -- 'python' | 'finance'
  total_score   numeric not null,                 -- 0~1 (맞은 문항/전체)
  track_scores  jsonb   not null,                 -- { "track1": 1.0, "track2": 0.5, ... } 트랙별 정답률
  answers       jsonb,                            -- 선택 기록(선택 인덱스/문항 id) — 통계·검토용, 선택
  taken_at      timestamptz not null default now(),
  primary key (user_id, course)                   -- 과목당 1회 => 재응시 불가 강제
);
create index if not exists idx_user_diag_course on public.user_diagnostics(course);

-- 재응시 허가 (관리자가 부여. 존재하면 1회 재응시 가능)
create table if not exists public.diagnostic_retake_grants (
  user_id     uuid not null references auth.users(id) on delete cascade,
  course      text not null,
  granted_by  uuid not null references auth.users(id),   -- 관리자 user_id
  granted_at  timestamptz not null default now(),
  consumed    boolean not null default false,            -- 재응시 완료 시 true
  primary key (user_id, course)
);
```

### 재응시 로직 (앱)
1. 응시 가능 여부 판정:
   - `user_diagnostics`에 (user, course) 행이 **없으면** → 응시 가능(최초).
   - 행이 **있으면** 기본 불가. 단 `diagnostic_retake_grants`에 (user, course)가 있고 `consumed=false`면 → **1회 재응시 가능**.
2. 재응시 제출 시:
   - `user_diagnostics` 행을 **새 결과로 덮어쓴다(upsert)**. (최신 진단 상태 유지)
   - 해당 `diagnostic_retake_grants.consumed = true`로 마킹.
3. RLS:
   - `user_diagnostics`: 본인 행만 select/insert/update. (관리자는 뷰로 조회 — 7장)
   - `diagnostic_retake_grants`: 본인은 **select만**(내가 재응시 가능한지 확인용). insert/update는 관리자만.
   - PK가 (user_id, course)이므로 DB 차원에서도 과목당 1행이 보장되어 재응시가 원천 차단된다(권한 부여 없이는).

> **왜 덮어쓰기인가**: 결과는 "현재 이해도" 스냅샷이면 충분하고, 강약 지도는 최신값이 의미 있다. 이력 보존이 필요하면 별도 `user_diagnostics_history` append 테이블을 추가할 수 있으나 이번 범위 밖.

---

## A-8. 관리자 기능 — 재응시 권한 부여 (조회 대시보드 확장)

기존 관리자 대시보드(조회 전용)에 아래를 추가한다.
- 훈련생 목록에서 특정 훈련생 + 과목을 골라 **"재응시 허용"** 버튼 → `diagnostic_retake_grants`에 (user, course, granted_by=관리자, consumed=false) insert.
- 이미 grant가 있고 consumed=false면 "재응시 대기 중"으로 표시. consumed=true면 "재응시 사용됨".
- 관리자는 훈련생 진단 결과(트랙별 강약, 종합 점수)를 조회할 수 있다. **auth.users를 직접 조회하지 말고 뷰로 우회**(기존 원칙).
- **기수 경향 집계**: 아이디 prefix(기수)별로 트랙별 평균 정답률을 집계해, "이번 기수는 어느 트랙이 전반적으로 약한지"를 강사가 첫 수업 전에 파악. (읽기 전용 집계)

---

# PART B. 로드맵 카드 (Roadmap)

## B-1. 개념 — 2층 구조

훈련생이 "무엇을·왜 배우는지" 납득하고 동기를 얻게 한다. 학습 이동을 유도하지 않고(순차 잠금 유지), **보여주고 이해시키는** 화면이다.

- **바깥 층 = 과정 전체 로드맵**: 트랙 흐름을 하나의 여정으로. "이 과정을 마치면 이런 걸 할 수 있다."
- **안쪽 층 = 트랙별 사례 카드**: 각 트랙을 대표하는 실무 사례 + (일부) 만져보는 미리보기 위젯.

## B-2. 콘텐츠 스키마 — `content/{course}/roadmap.json` (신규)

```json
{
  "course": "python",
  "headline": "실무 데이터 분석가로 가는 여정",
  "outcome": "이 과정을 마치면, 원본 데이터를 불러와 정제하고 분석해 인사이트를 시각화할 수 있습니다.",
  "journey": [
    {
      "trackId": "track1",
      "order": 1,
      "stationTitle": "파이썬 기초 다지기",
      "whatYouLearn": "변수·자료구조·반복문 등 분석의 재료가 되는 문법.",
      "whyItMatters": "데이터를 다루기 전, 파이썬으로 '생각을 코드로' 옮기는 힘을 기른다.",
      "realWorld": "실무에서 반복 작업을 자동화하는 첫걸음.",
      "preview": null
    },
    {
      "trackId": "track3",
      "order": 3,
      "stationTitle": "pandas로 데이터 다루기",
      "whatYouLearn": "표 형태 데이터를 불러오고 다루는 핵심 도구.",
      "whyItMatters": "현업 데이터 분석의 80%는 pandas 위에서 이뤄진다.",
      "realWorld": "실제 매출 CSV에서 월별 추세를 뽑아내는 작업.",
      "preview": { "type": "info", "note": "이 트랙에서 실제 데이터셋으로 미니 프로젝트를 수행합니다." }
    }
  ],
  "previewWidgets": [
    {
      "id": "compound-interest",
      "title": "복리 계산기 (맛보기)",
      "type": "calculator",
      "widget": "compoundInterest",
      "note": "금융 과목 로드맵에서 사용. 이론을 숫자로 체감."
    }
  ]
}
```

- `journey[]`는 트랙 순서대로. 각 정거장에 "무엇을/왜/실무에서"를 짧게.
- `preview`는 선택. 대부분 null이어도 된다.
- `previewWidgets`는 로드맵에 끼워넣는 인터랙티브 맛보기(아래 B-4). 없으면 빈 배열.

## B-3. 로드맵 화면

- 과정 전체 여정을 트랙 순서대로 시각화(타임라인/스텝 형태). 각 정거장 카드에 whatYouLearn/whyItMatters/realWorld 표시.
- **학습 이동 링크를 넣지 않는다**(순차 잠금 유지). 로드맵은 "지도를 보는" 화면이지 "출발하는" 화면이 아니다. 학습 시작은 기존 과목/트랙 화면에서만.
- 진단을 이미 본 사용자라면, 로드맵의 각 정거장에 진단 강약 라벨을 **작게 오버레이**할 수 있다(선택). 단 이 경우에도 이동 링크는 없음 — "track4: 진단상 약함" 같은 정보 표기까지만.

## B-4. 미리보기 위젯 (맛보기용 계산기/시뮬레이터)

- 로드맵에서 "만져보는 재미"로 흥미를 유발하는 소형 인터랙티브. 학습 채점과 무관, 순수 체험용.
- 코드 실행 엔진 아님. 순수 프론트 계산(JS)으로 구현.
- **금융 과목 우선 추천**(이론이 숫자로 체감됨):
  - `compoundInterest`: 원금·이율·기간 입력 → 복리 결과·그래프.
  - `loanRepayment`: 대출 원금·금리·기간 → 월 상환액.
  - `portfolioReturn`: 자산 비중·수익률 입력 → 가중 평균 수익률.
- 파이썬 과목은 위젯보다 "코드 한 줄 결과 미리보기"(입력→저장된 출력 매핑) 같은 정적 데모가 적합. 필수 아님.
- 위젯은 콘텐츠가 아니라 **앱 컴포넌트**다. `roadmap.json`은 어떤 위젯을 어디에 넣을지 id로 참조만 한다. 위젯 구현은 Antigravity 담당.

---

## C. Antigravity 작업 범위 vs 제품 오너 작업 범위

**Antigravity(앱):**
- 진단 응시 화면, 트랙별 강약 지도 결과 화면(이동 유도 없음), 재응시 권한 판정 로직.
- `user_diagnostics`, `diagnostic_retake_grants` 테이블 연동 + RLS.
- 관리자 대시보드에 재응시 허용 버튼 + 진단 결과/기수 경향 조회(뷰 우회).
- 로드맵 화면(2층), 미리보기 위젯 컴포넌트(compoundInterest 등).
- 콘텐츠 개수·트랙 하드코딩 금지. `diagnostic.json`/`roadmap.json`을 읽어 구성.

**제품 오너(콘텐츠·운영):**
- `content/{course}/diagnostic.json` 문항 작성(각 문항 trackId 태그 필수).
- `content/{course}/roadmap.json` 작성(여정·사례 문구).
- Supabase에 신규 2테이블 SQL 실행.

---

## D. 반드시 지킬 점 (재확인)
- 진단 결과에 학습 이동/바로가기 없음 — 순차 잠금 유지.
- 진단 현황만 표시.
- 재응시 기본 불가, 관리자만 1회 부여(consumed로 소진).
- 관리자 auth.users 직접 조회 금지(뷰 우회).
- 콘텐츠는 정적 JSON, service_role 키 미사용, RLS 필수.
