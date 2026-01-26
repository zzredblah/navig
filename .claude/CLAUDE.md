# NAVIG - Claude Code 설정

영상 제작 협업 플랫폼 (Next.js 15 + Supabase)

## 규칙 (Rules) - 반드시 준수

| 파일 | 용도 |
|------|------|
| `.claude/rules/CODING_STANDARDS.md` | 코딩 표준, 네이밍, 파일 구조 |
| `.claude/rules/DESIGN_SYSTEM.md` | UI 디자인, 반응형 패턴, 폼 스타일링 |
| `.claude/rules/ERROR_PREVENTION.md` | 오류 방지, 반응형 버그, 빈 상태 처리 |

## 스킬 (Skills)

| 파일 | 용도 |
|------|------|
| `.claude/skills/REACT_PATTERNS.md` | React/Next.js 개발 패턴 |
| `.claude/skills/NESTJS_PATTERNS.md` | NestJS 개발 패턴 (향후 백엔드 분리 시) |

## 서브에이전트 (Team Mode)

프로젝트에 맞춤화된 전문 에이전트들을 사용하여 효율적으로 작업할 수 있습니다.

### 사용 가능한 에이전트

| 에이전트 | 모델 | 용도 | 사용 시기 |
|---------|------|------|-----------|
| `frontend-dev` | Sonnet | React/Next.js 개발 | 컴포넌트, 페이지 구현 |
| `api-dev` | Sonnet | API/Supabase 개발 | API 엔드포인트, DB 쿼리 |
| `code-reviewer` | **Opus** | 코드 리뷰 | PR 전, 기능 완성 후 |
| `db-analyst` | Sonnet | DB 분석 | 스키마, RLS 정책 검토 |
| `researcher` | Sonnet | 코드 탐색 | 구조 파악, 기능 조사 |
| `tester` | Sonnet | 테스트 실행 | 타입체크, 린트, 빌드 |

### 사용 방법

```
# 명시적 호출
code-reviewer 에이전트로 최근 변경사항 검토해줘

# 작업 유형에 따라 자동 위임
"대시보드 컴포넌트 만들어줘" → frontend-dev

# 병렬 실행
인증, 문서, API 모듈을 각각 researcher 에이전트로 동시에 조사해줘
```

### 에이전트 파일 위치
`.claude/agents/`

### 상세 가이드
`.claude/docs/TEAM_MODE_GUIDE.md`

## 문서 (Docs)

| 파일 | 내용 |
|------|------|
| `docs/01_NAVIG_PRD_FULL.md` | 전체 PRD |
| `docs/02_NAVIG_PRD_PHASE1_MVP.md` | Phase 1 MVP |
| `docs/05~09_CLAUDE_CODE_REQUEST_*.md` | 스프린트별 개발 요청서 |
| `docs/TEAM_MODE_GUIDE.md` | 멀티 에이전트 팀 모드 가이드 |
