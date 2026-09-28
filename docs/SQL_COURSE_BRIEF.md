# SQL 과목 추가 지시서 (Antigravity 전용)

> **목적**: 기존 통합 앱(UBION KDT DataLab, python-support 레포)에 **세 번째 과목 "데이터베이스 활용을 위한 SQL"** 을 추가한다.
> 파이썬·금융과 **완전히 동일한 과목(course) 구조**로 얹으므로, 앱의 큰 개조는 없다. 과목 하나를 더 인식시키는 작업이다.
> 콘텐츠 JSON은 제품 오너가 커밋한다. Antigravity는 앱이 SQL 과목을 인식·렌더링·채점하도록 만든다.

---

## 0. 전제 — 이미 통합 구조가 있다

현재 앱은 courses.json 을 읽어 과목(python, finance)을 동적으로 구성한다.
따라서 SQL 과목 추가의 핵심은 **콘텐츠 배치 + courses.json 등록 + (SQL 특수성) 채점 정규화 옵션 추가** 세 가지다.
과목·트랙·토픽 수가 하드코딩돼 있지 않다는 전제(기존 원칙)가 지켜졌다면, 대부분 자동 인식된다.

---

## 1. courses.json 에 SQL 과목 등록

content/courses.json 의 courses 배열에 아래 항목을 추가한다(순서는 finance 다음).

```json
{
  "id": "sql",
  "order": 3,
  "title": "데이터베이스 활용을 위한 SQL",
  "shortTitle": "SQL",
  "description": "데이터베이스와 SQL의 기초부터 JOIN·서브쿼리·윈도우 함수 같은 실무 기술까지, 데이터를 다루는 질의 언어를 단계별로 익힙니다.",
  "theme": "sql",
  "accent": "#3b82f6",
  "icon": "database",
  "contentPath": "content/sql",
  "trackCount": 8
}
```

- theme "sql" 은 새 색 테마(파랑 계열 제안). 기존 python(terminal)·finance(finance) 테마와 구분되게.
- accent·icon 은 제안값. 확정은 제품 오너.

---

## 2. 콘텐츠 디렉토리 (제품 오너가 채움)

기존 과목과 동일 구조:

```
content/sql/
  config/
    xp-rules.json        # 파이썬/금융과 동일 스키마 (레벨 200+50n 동일)
    badges.json          # SQL 배지 (scope=course, id 접두사 sq_)
  diagnostic.json        # SQL 사전 진단 (문항에 trackId 태그)
  roadmap.json           # SQL 로드맵 (8트랙 여정)
  tracks/
    track1/ ... track8/
      track.json
      topics/ t*.json
      project.json
```

- 트랙 구성(제품 오너 기획 확정, 교안순 아님 — 논리 순):
  1. 데이터베이스와 SQL 입문
  2. 데이터 조회 기초 (SELECT/WHERE)
  3. 정렬과 함수 (ORDER BY/문자열·숫자·날짜 함수)
  4. 집계와 그룹화 (COUNT/SUM/GROUP BY/HAVING)
  5. 여러 테이블 다루기 (JOIN)
  6. 서브쿼리와 고급 조회 (서브쿼리/뷰)
  7. 데이터 조작과 정의 (INSERT/UPDATE/DELETE/CREATE/ALTER)
  8. 실무 종합 (윈도우 함수/CTE/복합 쿼리)
- 토픽/빈칸/퀴즈/FAQ/프로젝트 스키마는 **기존 과목과 100% 동일**.
- SQL 배지 id 는 sq_ 접두사(py_/fn_/gl_ 와 충돌 방지). 트랙 완주 배지 sq_track1_done ~ sq_track8_done.

---

## 3. SQL 특수성 — 빈칸 채점 정규화 (앱 작업, 중요)

기존 빈칸 채점은 파이썬/금융 기준으로 "공백 제거 + 따옴표 통일" 정규화를 쓴다.
**SQL은 대소문자를 구분하지 않는다**(SELECT = select = Select). 그래서 SQL 과목/문항에는 **대소문자 무시** 정규화가 필요하다.

- 파이썬은 대소문자를 구분해야 한다(Print ≠ print). 따라서 정규화를 **과목별 또는 문항별로 다르게** 적용해야 한다.
- 구현 방식(둘 중 택1, 제품 오너는 후자를 선호할 수 있음):
  - (a) 과목 단위: course==="sql" 이면 대소문자 무시 정규화 적용.
  - (b) 문항 단위 플래그: 빈칸/문제에 `"ignoreCase": true` 필드를 두고, 있으면 대소문자 무시. (더 유연, 권장)
- 정규화 로직 예:
  ```js
  function normalize(s, ignoreCase){
    let t = s.trim().replace(/['"]/g,'"').replace(/\s+/g,'');
    return ignoreCase ? t.toLowerCase() : t;
  }
  function checkFill(input, answers, ignoreCase){
    return answers.some(a => normalize(a, ignoreCase) === normalize(input, ignoreCase));
  }
  ```
- 콘텐츠 제작 원칙(제품 오너): 답이 명확히 하나로 떨어지는 키워드·절에만 빈칸을 둔다. 동의 표현(INNER JOIN / JOIN 등)은 answers 배열에 복수로 넣는다. 조건식 순서·별칭처럼 여러 갈래가 가능한 곳은 빈칸으로 만들지 않는다.

> 표준 DB 문법 기준은 **MySQL 로 확정**한다. 해설·예상 출력 표기를 MySQL 기준으로 통일한다(예: 문자열 결합 CONCAT, LIMIT 구문, 날짜 함수 등). 앱은 문법을 검증하지 않으므로(문자열 매칭만) 앱 작업과는 무관하나, 콘텐츠 제작 시 이 기준을 따른다. (추후 유비온 교안이 다른 DB를 쓰면 그때 보정.)

---

## 4. Supabase — 변경 없음

- 진도/배지 테이블은 이미 course 컬럼을 갖고 있으므로, course="sql" 로 그대로 저장된다. **스키마 변경 불필요.**
- 진단 테이블(user_diagnostics, diagnostic_retake_grants)도 course 로 구분하므로 SQL 진단도 그대로 저장된다. **추가 SQL 불필요.**
- 즉 DB 작업은 없다. SQL 과목은 순수하게 콘텐츠 + courses.json + 채점 정규화 옵션으로 들어간다.

---

## 5. 게이미피케이션 — 자동 반영

- 과목별 XP/레벨: course="sql" 필터로 자동 집계(기존 로직 재사용).
- 통합 XP/레벨: 전 과목 합산에 SQL 자동 포함.
- global 배지(멀티러너·듀얼마스터 등): 과목 수 기준 조건이 있다. **과목이 3개가 되었으므로**, "두 과목 완주" 같은 기존 global 배지 조건을 재검토할 필요가 있다(아래 6장).

---

## 6. global 배지 조건 — 확정됨 (반영 완료)

과목이 3개가 되면서 global-badges.json 을 아래와 같이 확정했다(제품 오너가 갱신한 파일을 커밋). Antigravity는 이 파일을 그대로 읽어 판정하면 된다.

- gl_multi_learner("멀티 러너", courses_started≥2): 유지. 설명을 "두 개 이상의 과목을 학습 시작"으로 개수에 안 묶이게 정리.
- gl_all_started("전 과목 개척자", courses_started≥3): 신설. 모든 과목 학습 시작.
- gl_dual_master("더블 마스터", courses_completed≥2): 유지(이름만 정리).
- gl_triple_master("트리플 마스터", courses_completed≥3): 신설. 세 과목 완주.

> courses_started/courses_completed 판정 시 분모가 되는 "전체 과목 수"는 courses.json 에서 동적으로 읽는다(하드코딩 금지). 과목이 4개로 늘어도 gte 조건은 그대로 동작한다.

---

## 7. Antigravity 작업 범위
- courses.json 에 sql 과목 추가(제품 오너가 값 확정 후).
- SQL 테마(색/아이콘) 반영. 과목 선택 화면·대시보드에 SQL 과목이 자연스럽게 표시되는지 확인.
- 빈칸 채점에 대소문자 무시 옵션 추가(3장, 문항 단위 ignoreCase 플래그 권장).
- SQL 과목의 진단·로드맵·학습·프로젝트 화면이 기존 컴포넌트로 정상 렌더되는지 확인(과목만 다를 뿐 구조 동일).
- 과목 3개 상태에서 통합/과목별 집계, 진행률, 배지 판정이 정상인지 점검.
- 개수 하드코딩 없는지 재확인(과목 3개로 늘어난 것이 자동 반영되어야 함).

## 8. 제품 오너 작업 범위
- content/sql/ 전체 콘텐츠 작성·커밋(config, diagnostic, roadmap, tracks 8개).
- SQL 배지 정의, global 배지 조건 결정(6장).
- 기준 DB 문법 결정.

---

## 9. 반드시 지킬 원칙 (기존과 동일)
- 콘텐츠는 정적 JSON, DB로 옮기지 않음.
- 코드 실행 엔진 없음(문자열 매칭 + 저장된 output).
- 퀴즈 파일 순서대로, passThreshold 통과 시 순차 잠금 해제.
- service_role 키 미사용, RLS 필수.
- 레포명·경로 변경 금지. 표시명 "UBION KDT DataLab" 유지.
- 개수 하드코딩 금지.
