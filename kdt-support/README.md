# KDT 학습 보조 — 통합 패키지 (파이썬 + 디지털 금융)

기존 PyDataLab(파이썬) 앱에 디지털 금융 과목을 **하나의 앱으로 통합**하기 위한 지시서와 게이미피케이션 config 모음.

## 구성
```
ANTIGRAVITY_INTEGRATION_BRIEF.md   # Antigravity 전달용 통합 개발 지시서 (최우선 문서)
README.md                          # 이 파일
content/
  courses.json                     # 과목 목록 (python, finance)
  global-badges.json               # 계정 전체(global) 배지
  python/config/
    xp-rules.json                  # 파이썬 XP·레벨 규칙
    badges.json                    # 파이썬 배지 (scope=course)
  finance/config/
    xp-rules.json                  # 금융 XP·레벨 규칙
    badges.json                    # 금융 배지 (scope=course)
```

## 핵심 개념
- **과목(course) 계층**을 트랙 위에 추가. 계정 1개로 전 과목 수강.
- **XP·레벨·배지 이중 집계**: 과목별 + 통합(계정 전체).
- **Supabase 단일 프로젝트**, 진도·배지 테이블에 `course` 컬럼.
- 레벨 공식 공통: `Lv(n)→Lv(n+1) = 200 + 50n`.
- 배지 scope: `course`(과목별) / `global`(계정 전체).

## 사용
1. `ANTIGRAVITY_INTEGRATION_BRIEF.md`를 Antigravity에 전달(최우선 기준).
2. `content/`의 config를 규격대로 읽게 한다(개수 하드코딩 금지).
3. 트랙 콘텐츠 JSON은 제품 오너가 별도 커밋.
4. GitHub 레포는 `kdt-support`로 통일: https://github.com/wiky86/kdt-support.git

## 주의(재발 방지)
- 로그인 무한 렌더 루프(진도 저장 로직) · 관리자 `auth.users` 직접 조회 금지(뷰 우회) · service_role 키 미사용 · 첫 로그인 user_stats 자동 생성.
