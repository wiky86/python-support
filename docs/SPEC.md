# 파이썬 데이터 분석 학습 공간 — 개발 스펙

이 문서는 개발 에이전트를 위한 지침서입니다. 아래 명세와 `/content` 디렉토리의 데이터 파일을 근거로 웹 애플리케이션을 구현하세요.

---

## 1. 제품 개요

"파이썬을 활용한 데이터 분석"을 학습하는 웹 기반 학습 공간입니다.

- 개인 학습용이지만 여러 사용자가 각자 계정으로 이용한다. 동시 사용자 수는 많지 않다(소규모).
- 코드 실행 엔진은 없다. 코드 실습은 "빈칸 채우기 + 미리 저장된 예상 출력/결과 설명" 방식이다.
- 학습 콘텐츠(트랙/토픽/퀴즈/FAQ/프로젝트)는 전부 `/content`의 정적 파일에 있다. DB에 콘텐츠를 넣지 않는다.
- Supabase는 오직 사용자 인증과 학습 진도/통계/배지 저장에만 쓴다.

---

## 2. 기술 스택

- 프론트엔드: Next.js (App Router) + React
- 인증·데이터: Supabase (Auth + Postgres)
- 콘텐츠: 빌드에 포함되는 정적 JSON. 학습 본문(content 필드)은 마크다운 문자열이므로 마크다운 렌더러로 표시.
- 코드 하이라이팅: 정적 렌더링(예: highlight.js, Shiki 등). 실행 아님.
- 테마(다크모드): 브라우저 로컬 스토리지에 저장.

---

## 3. 콘텐츠 구조와 학습 흐름

### 3.1 계층

```
트랙(track) → 토픽(topic) → [학습 콘텐츠 + 빈칸 코드] → 복습 퀴즈 → (통과 시) 다음 토픽 잠금 해제
트랙의 마지막 → 미니 프로젝트
```

전체 커리큘럼은 현재 **트랙 1~7이 전부 완성**되어 있으며, **총 43개 토픽과 7개 미니 프로젝트**로 구성된다.
트랙별 토픽 수는 다음과 같다:
- **트랙 1 (파이썬 기초 다지기)**: 7개 토픽
- **트랙 2 (NumPy로 수치 다루기)**: 6개 토픽
- **트랙 3 (pandas 핵심 - 데이터 구조)**: 7개 토픽
- **트랙 4 (pandas 실전 - 데이터 가공)**: 6개 토픽
- **트랙 5 (그룹화와 집계)**: 5개 토픽
- **트랙 6 (데이터 시각화)**: 6개 토픽
- **트랙 7 (종합 분석 프로젝트)**: 6개 토픽

코드는 트랙이나 토픽 개수를 하드코딩하지 말고 `/content/tracks` 아래 존재하는 트랙과 토픽을 읽어 동적으로 구성할 것.

### 3.2 잠금(순차 진행) 규칙

- 각 토픽은 상태를 가진다: `locked` / `in_progress` / `completed`.
- 한 토픽을 완료하려면 그 토픽의 복습 퀴즈를 통과해야 한다(통과 기준은 각 토픽 quiz.passThreshold, 기본 0.8 = 80%).
- 복습 퀴즈를 통과하기 전에는 다음 토픽이 잠긴다.
- 트랙 내 첫 토픽은 항상 열려 있다.
- 트랙의 모든 토픽을 완료하면 그 트랙의 미니 프로젝트가 열린다.
- 트랙을 완료(모든 토픽 완료)하면 다음 트랙의 첫 토픽이 열린다.
- 잠금 로직은 프론트에서 콘텐츠 파일 + 진도 데이터로 계산한다. Supabase에는 계산 결과 상태만 저장한다.

### 3.3 퀴즈

- 랜덤 출제하지 않는다. 파일에 정의된 문제를 정의된 순서 그대로 출제한다.
- 각 토픽의 퀴즈는 5문항이 표준이다.
- 문제 타입은 현재 `mcq`(4지선다) 하나다. `answer`는 정답 옵션의 0-based 인덱스.
- 채점: 맞힌 문항 수 / 전체 문항 수 >= passThreshold 이면 통과.
- 만점(전 문항 정답) 여부를 기록한다(배지·XP 만점 보너스 판정용).
- 만점 보너스와 flawless 배지는 "최초 통과 시점의 점수"를 기준으로 판정한다. 재응시로 점수가 바뀌어도 최초 통과 기록을 기준으로 한다.
- 모든 퀴즈 문항에는 상세 해설(`explain`)이 포함되어 있다.

### 3.4 빈칸 코드 채우기

- 실행 엔진 없음. 사용자가 빈칸에 입력한 문자열을 정답 후보(`answers` 배열)와 비교한다.
- 각 토픽의 빈칸 채우기 문제는 **5개가 표준**이다.
- 모든 빈칸 채우기 항목에는 **`explain`(상세 해설)** 필드가 존재하여, 정답 확인 후 및 오답 시 학습자가 상세 해설을 확인할 수 있다.
- 비교 전 정규화: 앞뒤 공백 제거, 내부 공백 제거, 작은따옴표와 큰따옴표를 동일하게 취급. (대소문자는 구분한다 — 파이썬 키워드/식별자가 대소문자 민감하므로.)
- 정답이면 파일의 `output` 필드(미리 저장된 예상 출력/결과 설명)를 결과로 보여준다. `output`이 빈 문자열이면 "출력 없음"으로 처리.
  - **시각화 예외**: 트랙6(데이터 시각화)과 트랙7의 시각화 토픽에서는 `output`이 텍스트 출력이 아니라 "그려지는 그래프에 대한 설명"이다(코드 실행 엔진이 없어 실제 그래프를 렌더링할 수 없기 때문). UI에서는 이 경우 "예상 출력"보다 "결과 설명"과 같은 라벨로 표시하는 것을 권장한다.
- 오답 시에도 정답을 즉시 노출하지 않고 다시 시도할 수 있도록 하며, 함께 제공된 `explain` 해설 카드를 통해 학습을 보조한다.

정규화 비교 참고 구현:
```js
function normalize(s) {
  return s.trim().replace(/['"]/g, '"').replace(/\s+/g, '');
}
function checkFill(input, answers) {
  return answers.some(a => normalize(a) === normalize(input));
}
```

### 3.5 FAQ

- 각 토픽 파일의 `faq` 배열(질문/답변)을 챗봇 UI로 표시한다.
- 실제 AI 호출 없음. 질문 목록을 칩/버튼으로 보여주고, 사용자가 누르면 저장된 답변이 챗봇 말풍선(타이핑 효과 등)으로 나타난다.

### 3.6 미니 프로젝트

- 각 트랙의 `project.json`. 제공 데이터(`dataset`)를 화면에 보여주고, 단계별 미션(`missions`)을 빈칸 채우기와 동일한 방식으로 진행한다.
- 모든 프로젝트 미션(7개 미션)에도 **`explain`(상세 해설)** 필드가 포함되어 있다.
- 모든 미션을 완료하면 `report`의 template과 computedValues로 결과 리포트 카드를 렌더링한다. 저장은 하지 않고 화면에서 생성한다. 이미지 저장/공유는 클라이언트 캡처로 구현.

---

## 4. 보조 기능 (게임화)

채택된 기능: 배지, 스트릭, 경험치/레벨, 진행률 시각화, 미니 프로젝트 결과 리포트, 다크모드/하이라이팅. (그 외 기능은 이번 범위에서 제외.)

### 4.1 경험치/레벨

`/content/config/xp-rules.json` 참조.

- 레벨 공식: Lv(n)→Lv(n+1)에 필요한 XP = `200 + 50n`. Lv(n+1) 도달 누적 XP = `25n² + 175n − 200`.
- XP → 레벨 계산:
```js
function getLevel(xp) {
  const n = (-175 + Math.sqrt(175 * 175 + 100 * (xp + 200))) / 50;
  return Math.max(1, Math.floor(n) + 1);
}
```
- XP 적립 항목과 값은 config의 `awards` 참조: 일일 접속, 연속(스트릭) 마일스톤/반복 보너스, 토픽 완료, 퀴즈 통과, 퀴즈 만점 보너스, 트랙 완료, 프로젝트 완료.
- 중복 적립 방지: config의 `rules.oneTimePerItem` 항목은 대상별 최초 1회만 지급. 일일 접속은 하루 1회. 스트릭 마일스톤은 각 일수 도달 시 1회.
- 레벨은 저장하지 않고 누적 XP에서 계산한다.

### 4.2 스트릭(연속 접속)

- 학습 행동(또는 접속)이 일어난 날짜를 `user_stats.last_studied`와 비교.
- 어제면 streak +1, 오늘 이미 기록됐으면 유지, 이틀 이상 벌어지면 1로 리셋.
- UI 톤: 끊겨도 부담을 주지 않게(죄책감 유발 문구 금지, "다시 시작!" 같은 긍정 톤).

### 4.3 배지

`/content/config/badges.json` 참조.

- 배지 정의(이름·설명·아이콘·획득조건)는 파일에 있고, 획득 기록만 Supabase `user_badges`에 저장.
- 조건은 규칙 데이터(`condition.type` + 파라미터)로 표현되어 있다. 프론트가 진도·통계 데이터로 조건을 판정해 미획득 배지를 지급한다.
- 조건 타입 정의는 badges.json의 `conditionTypes` 참조.
- `icon` 값은 자리표시자다. 실제 아이콘 라이브러리(예: lucide-react)에 매핑해서 쓸 것.

### 4.4 진행률 시각화

- 저장된 진도로 계산해서 보여준다(새 저장 불필요).
- 트랙별 프로그레스 바, 전체 완주율, 잠긴 토픽이 순서대로 열리는 학습 지도 형태. 데이터 분석 주제에 맞는 대시보드 느낌.

---

## 5. Supabase 스키마

콘텐츠는 저장하지 않는다. `topic_id`, `track_id`, `badge_id` 등은 콘텐츠 파일에 정의된 문자열 식별자를 그대로 쓴다.

```
user_progress
  user_id       uuid    -- auth.users 참조
  topic_id      text    -- 예: "track1.variables". 프로젝트는 "track1.project" 형태로 동일 저장 가능
  status        text    -- 'locked' | 'in_progress' | 'completed'
  quiz_passed   boolean
  quiz_score    number  -- 최초 통과 시점 점수(0~1 비율 또는 정답 수). 만점/flawless 판정용
  completed_at  timestamp
  updated_at    timestamp
  -- PK: (user_id, topic_id)

user_stats
  user_id       uuid    -- PK, auth.users 참조
  xp            integer -- 누적 경험치
  last_studied  date    -- 스트릭 계산용
  streak_count  integer -- 현재 연속 일수

user_badges
  user_id       uuid    -- auth.users 참조
  badge_id      text    -- badges.json의 id
  earned_at     timestamp
  -- PK: (user_id, badge_id)
```

- 세 테이블 모두 RLS(Row Level Security)를 켜고, 사용자가 자기 행(`auth.uid() = user_id`)만 읽고 쓰도록 정책을 설정할 것. (필수)
- 미니 프로젝트 진행 상태도 `user_progress`에 `topic_id = "<track>.project"` 형태로 저장하면 별도 테이블이 필요 없다.

---

## 6. 콘텐츠 파일 형식

### 6.1 디렉토리

```
/content
  /config
    xp-rules.json
    badges.json
  /tracks
    track1/ ... track7/
      track.json          # 트랙 메타 + 토픽 순서 + 파일 목록
      topics/             # 각 토픽별 JSON 파일들
        t1-*.json
        ...
      project.json        # 트랙 미니 프로젝트 JSON
```

### 6.2 track.json

```
id, order, title, description
topicOrder[]   : 토픽 id를 진행 순서대로 나열
topicFiles[]   : 토픽 JSON 파일 경로(트랙 폴더 기준 상대경로), topicOrder와 같은 순서
projectFile    : 프로젝트 JSON 경로
```

### 6.3 토픽 JSON

```
id            : 예 "track1.variables"
trackId, order, title
content       : 마크다운 문자열(학습 본문). 표·코드블록 포함
fillBlanks[]  : { id, prompt, code(빈칸은 ______), answers[](정답 후보), output(예상 출력/결과 설명), explain(상세 해설) }
                ※ 각 토픽의 빈칸은 5개가 표준이다.
                ※ explain은 트랙1~7 전 트랙의 모든 빈칸에 존재하며, 정답 확인 및 오답 시 상세 해설로 노출하는 용도.
quiz          : { passThreshold, questions[] }
  questions[] : { id, type("mcq"), q, options[], answer(0-based 정답 인덱스), explain }
                ※ 각 토픽의 퀴즈는 5문항이 표준이며, 모든 문항에 explain이 존재한다.
faq[]         : { q, a }
```

### 6.4 project.json

```
id, trackId, title, intro
dataset       : { description, code }  -- 화면에 보여줄 제공 데이터
missions[]    : { id, prompt, code, answers[], output, explain(상세 해설) }  -- 빈칸 채우기와 동일 방식
                ※ explain은 트랙1~7 전 트랙의 모든 프로젝트 미션에 존재한다.
report        : { title, template, computedValues, conceptsUsed[] }
  template    : {placeholder} 자리에 computedValues 값을 넣어 렌더링
```

---

## 7. 구현 우선순위 제안

1. 프로젝트 뼈대: Next.js + Supabase 연결, Auth(이메일/매직링크면 충분).
2. 콘텐츠 로더: `/content`를 읽어 트랙/토픽/프로젝트 구조로 파싱.
3. 토픽 화면: 마크다운 본문 + 빈칸 채우기(정규화 채점 + 예상 출력/결과 설명 표시) + 퀴즈(순서 고정, 채점, 통과 판정).
4. 진도 저장 + 잠금 로직: user_progress 연동, 순차 잠금 해제.
5. 게임화: XP/레벨 계산, 스트릭, 배지 판정/지급, 진행률 대시보드.
6. 미니 프로젝트 + 결과 리포트 카드(+ 이미지 저장).
7. FAQ 챗봇 UI, 다크모드/코드 하이라이팅.

---

## 8. 주의사항 요약

- 콘텐츠는 절대 DB로 옮기지 말 것. 파일이 원본이다.
- 퀴즈 랜덤 출제 금지. 파일 순서대로.
- 코드 실행 엔진 없음. 빈칸은 문자열 비교 + 저장된 출력(시각화 토픽은 결과 설명).
- 레벨은 저장하지 말고 XP에서 계산.
- 만점/flawless 판정은 최초 통과 점수 기준.
- RLS 필수.
- **트랙/토픽 수를 하드코딩하지 말고 `/content/tracks`를 동적으로 읽을 것(현재 7트랙·43토픽).**
- **트랙7에서 `describe()`, `value_counts()`, `info()` 등 EDA 함수가 별도 독립 트랙 없이 종합 맥락에서 처음 등장하므로 콘텐츠 검수 시 참고.**
