# Antigravity 전달용 프롬프트

아래 내용을 Antigravity 에이전트에게 지시로 전달하세요. 프로젝트 폴더(`py-data-lab`) 전체를 워크스페이스에 넣은 상태에서 사용합니다.

---

## 초기 지시 프롬프트 (그대로 복사해 사용)

```
이 워크스페이스로 "파이썬 데이터 분석 학습 공간" 웹 앱을 개발한다.

먼저 docs/SPEC.md를 처음부터 끝까지 읽어라. 이 문서가 제품 명세이자 최우선 기준이다.
그다음 content/ 디렉토리의 파일 구조와 형식을 파악하라:
- content/config/xp-rules.json, content/config/badges.json (게임화 규칙)
- content/tracks/track1/ (트랙1 콘텐츠: track.json, topics/*.json, project.json)

기술 스택은 Next.js(App Router) + React + Supabase(Auth + Postgres)다.

핵심 제약(반드시 지킬 것):
1. 학습 콘텐츠는 전부 content/의 정적 JSON에서 읽는다. 콘텐츠를 DB로 옮기지 마라.
2. Supabase는 사용자 인증과 진도/통계/배지 저장에만 쓴다. 스키마는 SPEC 5장 그대로 구현하고 RLS를 반드시 켜라.
3. 코드 실행 엔진은 없다. 빈칸 채우기는 문자열 정규화 비교 + 파일에 저장된 예상 출력(output) 표시로 구현한다.
4. 퀴즈는 랜덤 출제하지 말고 파일 순서대로 낸다. 통과 기준은 각 퀴즈의 passThreshold.
5. 토픽은 순차 잠금이다. 퀴즈를 통과해야 다음 토픽이 열린다. 트랙의 모든 토픽 완료 시 미니 프로젝트가 열린다.
6. 레벨은 저장하지 말고 누적 XP에서 계산한다(공식은 SPEC 4.1).
7. 트랙 수를 하드코딩하지 마라. 현재 트랙1만 있으나 트랙2~7이 같은 형식으로 추가된다. content/tracks를 동적으로 읽어라.

작업 순서는 SPEC 7장의 우선순위를 따른다:
1) Next.js + Supabase 뼈대와 인증
2) content 로더(트랙/토픽/프로젝트 파싱)
3) 토픽 화면(마크다운 본문 + 빈칸 채우기 + 퀴즈)
4) 진도 저장 + 순차 잠금
5) 게임화(XP/레벨/스트릭/배지/진행률 대시보드)
6) 미니 프로젝트 + 결과 리포트 카드
7) FAQ 챗봇 UI + 다크모드/코드 하이라이팅

먼저 전체 구현 계획을 단계별로 제시하고, 1단계(뼈대와 인증)부터 시작하라.
Supabase 연결에 필요한 환경변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)는 .env.local에 두는 방식으로 설정하고, 실제 키는 내가 넣을 수 있게 .env.local.example을 만들어라.
```

---

## Supabase 설정 관련 (에이전트에게 별도로 줄 수 있는 보조 지시)

```
Supabase 테이블 생성 SQL과 RLS 정책 SQL을 supabase/schema.sql로 만들어라.
SPEC.md 5장의 세 테이블(user_progress, user_stats, user_badges)을 만들고,
각 테이블에 RLS를 켠 뒤 auth.uid() = user_id 인 행만 select/insert/update 할 수 있는 정책을 추가하라.
새 사용자가 가입하면 user_stats에 기본 행(xp=0, streak_count=0)이 생기도록 트리거나 앱 로직으로 보장하라.
```

---

## 콘텐츠 추가 시 (트랙2 이후) 안내

```
트랙2~7은 트랙1과 동일한 파일 형식으로 content/tracks/track{N}/ 아래 추가된다.
새 트랙이 추가되어도 코드 수정 없이 자동으로 인식되어야 한다.
track.json의 topicOrder/topicFiles, 토픽 JSON 스키마, project.json 스키마는 트랙1과 동일하다.
```

---

## 참고: 확인용 체크리스트

에이전트 구현 후 아래를 점검하면 명세 준수 여부를 빠르게 확인할 수 있다.

- [ ] 콘텐츠가 코드가 아닌 content/ JSON에서 로드되는가
- [ ] 첫 토픽만 열려 있고, 퀴즈 통과 전 다음 토픽이 잠겨 있는가
- [ ] 퀴즈가 파일 순서대로(랜덤 아님) 나오는가
- [ ] 빈칸에 정답 입력 시 저장된 output이 표시되는가
- [ ] 빈칸 채점이 공백/따옴표 정규화를 반영하는가
- [ ] 퀴즈 만점 여부가 최초 통과 기준으로 기록되는가
- [ ] XP가 규칙대로 적립되고 레벨이 XP에서 계산되는가
- [ ] 배지가 badges.json 조건대로 지급되는가
- [ ] Supabase 세 테이블에 RLS가 켜져 있는가
- [ ] 트랙 수가 하드코딩되지 않았는가
- [ ] 미니 프로젝트 완료 시 결과 리포트 카드가 생성되는가
- [ ] 다크모드 설정이 로컬 스토리지에 저장되는가
