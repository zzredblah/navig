# Claude Code 멀티 에이전트 팀 모드 가이드

**NAVIG 프로젝트 맞춤 설정**
**작성일**: 2026-01-26

---

## 목차

1. [팀 모드(서브에이전트)란?](#1-팀-모드서브에이전트란)
2. [빠른 시작](#2-빠른-시작)
3. [NAVIG 맞춤 에이전트 설정](#3-navig-맞춤-에이전트-설정)
4. [에이전트 파일 형식](#4-에이전트-파일-형식)
5. [사용 방법](#5-사용-방법)
6. [고급 패턴](#6-고급-패턴)
7. [주의사항](#7-주의사항)

---

## 1. 팀 모드(서브에이전트)란?

### 1.1 개요

Claude Code의 **서브에이전트(Subagents)** 시스템은 단일 AI를 **전문화된 에이전트 팀**으로 확장하는 기능입니다.

```
┌─────────────────────────────────────────────────────────────┐
│                    메인 Claude Code                          │
│                                                             │
│  "프론트엔드 수정하고, 테스트 돌리고, 코드 리뷰해줘"           │
│                                                             │
│         ┌──────────┬──────────┬──────────┐                 │
│         ▼          ▼          ▼          ▼                 │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│   │Frontend │ │ Tester  │ │Reviewer │ │Database │         │
│   │Developer│ │         │ │         │ │ Expert  │         │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 핵심 이점

| 이점 | 설명 |
|------|------|
| **컨텍스트 절약** | 탐색과 구현을 분리하여 메인 대화 정리 |
| **역할 전문화** | 각 에이전트의 시스템 프롬프트로 행동 커스터마이징 |
| **도구 제한** | 특정 도구만 사용하도록 제한 (읽기 전용 등) |
| **비용 최적화** | 빠르고 저렴한 모델(Haiku)로 라우팅 가능 |
| **병렬 처리** | 여러 에이전트가 동시에 다른 작업 수행 |

### 1.3 빌트인 에이전트

Claude Code에는 기본 제공 에이전트가 있습니다:

| 에이전트 | 모델 | 도구 | 용도 |
|---------|------|------|------|
| **Explore** | Haiku | Read-only | 코드베이스 탐색, 파일 검색 |
| **Plan** | 메인과 동일 | Read-only | 플랜 모드에서 연구 |
| **General-purpose** | 메인과 동일 | 모든 도구 | 복잡한 다단계 작업 |

---

## 2. 빠른 시작

### 2.1 에이전트 확인 및 생성

터미널에서 Claude Code 실행 후:

```bash
/agents
```

이 명령어로:
- 현재 사용 가능한 에이전트 목록 확인
- 새 에이전트 생성
- 기존 에이전트 편집

### 2.2 대화형으로 에이전트 만들기 (추천)

```
1. /agents 입력
2. "Create new agent" 선택
3. 범위 선택:
   - User-level: 모든 프로젝트에서 사용
   - Project-level: 이 프로젝트에서만 사용 (.claude/agents/)
4. "Generate with Claude" 선택
5. 에이전트 설명 입력 (예시 아래)
6. 도구, 모델, 색상 선택 후 저장
```

**에이전트 설명 예시:**

```
NAVIG 프로젝트의 코드 리뷰어. React/Next.js 컴포넌트, Supabase API 호출,
TypeScript 타입 정의를 검토하고 DESIGN_SYSTEM.md와 CODING_STANDARDS.md 규칙 준수 여부 확인
```

### 2.3 수동으로 에이전트 파일 만들기

에이전트 파일 위치:

```
.claude/agents/   ← 프로젝트 범위 (팀 공유, 버전 관리)
~/.claude/agents/ ← 사용자 범위 (개인용, 모든 프로젝트)
```

---

## 3. NAVIG 맞춤 에이전트 설정

### 3.1 권장 에이전트 구성

NAVIG 프로젝트의 특성(영상 협업 SaaS, Next.js + Supabase)에 맞는 에이전트 구성:

```
.claude/agents/
├── frontend-dev.md      # React/Next.js 개발자
├── api-dev.md           # API Route/Supabase 개발자
├── code-reviewer.md     # 코드 리뷰어
├── db-analyst.md        # 데이터베이스 분석가
├── researcher.md        # 코드베이스 탐색 전문가
└── tester.md            # 테스트 실행자
```

### 3.2 프론트엔드 개발자 에이전트

`.claude/agents/frontend-dev.md` 생성:

```markdown
---
name: frontend-dev
description: React/Next.js 프론트엔드 개발 전문가. 컴포넌트, 페이지, 훅 구현 시 사용
tools: Read, Glob, Grep, Edit, Write, Bash
model: sonnet
permissionMode: default
---

당신은 NAVIG 프로젝트의 시니어 프론트엔드 개발자입니다.

## 기술 스택
- Next.js 15 (App Router)
- React 19 + TypeScript
- TailwindCSS + shadcn/ui
- React Query (서버 상태)
- React Hook Form + Zod

## 필수 참조 파일
작업 전 반드시 읽어야 할 파일:
- `.claude/rules/DESIGN_SYSTEM.md` - UI 디자인, 색상, 반응형 패턴
- `.claude/rules/CODING_STANDARDS.md` - 네이밍, 파일 구조
- `.claude/rules/ERROR_PREVENTION.md` - 오류 방지 패턴

## 규칙
1. 컴포넌트는 named export 사용 (default export 지양)
2. 'use client'는 필요한 경우에만 최소한으로 사용
3. 페이지 헤더는 반드시 `flex-col sm:flex-row` 패턴 사용
4. raw input에는 `bg-white text-gray-900` 명시
5. 모든 클릭 가능한 요소에 피드백 존재해야 함

## Primary 색상 (보라색)
- primary-600: #7C3AED (메인 버튼, 링크)
- primary-700: #6D28D9 (호버)
- primary-100: #EDE9FE (배경, 뱃지)
```

### 3.3 API 개발자 에이전트

`.claude/agents/api-dev.md` 생성:

```markdown
---
name: api-dev
description: API Route 및 Supabase 백엔드 개발 전문가. API 엔드포인트, DB 쿼리 구현 시 사용
tools: Read, Glob, Grep, Edit, Write, Bash
model: sonnet
permissionMode: default
---

당신은 NAVIG 프로젝트의 백엔드 API 개발자입니다.

## 기술 스택
- Next.js 15 API Routes
- Supabase (PostgreSQL + Auth + Realtime)
- Zod (유효성 검증)

## 필수 참조 파일
- `.claude/rules/CODING_STANDARDS.md` - API 설계 규칙
- `.claude/rules/ERROR_PREVENTION.md` - Supabase RLS 관련 오류 방지

## API Route 패턴

```typescript
// src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  // Admin 클라이언트 사용 (RLS 우회 필요 시)
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.from('table').select('*');

  if (error) {
    console.error('[API Name] 조회 실패:', error);
    return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
```

## 규칙
1. 쿼리 파라미터는 `|| undefined`로 null 변환
2. 모든 Supabase 쿼리에서 error 체크 필수
3. RLS 이슈 시 createAdminClient() 사용
4. 프로젝트 조회는 project_members + projects.client_id 모두 확인
5. 파일 업로드는 File → Buffer 변환 필수
```

### 3.4 코드 리뷰어 에이전트

`.claude/agents/code-reviewer.md` 생성:

```markdown
---
name: code-reviewer
description: 코드 품질 및 디자인 시스템 준수 검토. PR 전, 주요 기능 완성 후 사용 권장
tools: Read, Grep, Glob, Bash
model: sonnet
permissionMode: plan
---

당신은 NAVIG 프로젝트의 시니어 코드 리뷰어입니다.

## 검토 기준

### 1. 코딩 표준 (CODING_STANDARDS.md)
- TypeScript strict mode 준수
- any 타입 사용 금지
- 네이밍 컨벤션 (camelCase, PascalCase 등)
- 파일 구조 규칙

### 2. 디자인 시스템 (DESIGN_SYSTEM.md)
- Primary 색상(보라색) 사용 여부
- 반응형 패턴 준수:
  - 페이지 헤더: `flex-col sm:flex-row`
  - 메타데이터: `flex-wrap`
  - raw input: `bg-white text-gray-900` 명시
- 빈 상태 UI 구현 여부

### 3. 오류 방지 (ERROR_PREVENTION.md)
- Supabase RLS 처리
- Zod 유효성 검증
- 에러 핸들링

### 4. 보안
- 시크릿 노출 없음
- 입력값 검증
- SQL Injection 방지

## 리뷰 절차
1. `git diff`로 변경사항 확인
2. 수정된 파일 읽기
3. 규칙 문서 참조
4. 피드백 분류:
   - **Critical**: 반드시 수정
   - **Warning**: 수정 권장
   - **Suggestion**: 검토 후 개선

## 출력 형식
```
## 코드 리뷰 결과

### Critical (반드시 수정)
- [파일:라인] 문제 설명

### Warning (수정 권장)
- [파일:라인] 문제 설명

### Suggestion (검토 후 개선)
- [파일:라인] 제안 내용

### 잘된 점
- 긍정적인 피드백
```
```

### 3.5 데이터베이스 분석가 에이전트

`.claude/agents/db-analyst.md` 생성:

```markdown
---
name: db-analyst
description: Supabase/PostgreSQL 스키마 분석 및 쿼리 최적화 전문가. DB 작업 시 사용
tools: Read, Grep, Glob, Bash
model: haiku
permissionMode: plan
---

당신은 Supabase/PostgreSQL 데이터베이스 전문가입니다.

## 주요 테이블 (NAVIG)
- users: 사용자 (Supabase Auth 확장)
- projects: 프로젝트
- project_members: 프로젝트 멤버
- documents: 문서 (작업 요청서, 견적서, 계약서)
- document_templates: 문서 템플릿

## 분석 범위
1. 스키마 구조 분석
2. RLS 정책 검토
3. 인덱스 최적화 제안
4. 쿼리 성능 분석

## 마이그레이션 파일 위치
`supabase/migrations/`

## 규칙
- SELECT * 사용 금지 (필요한 컬럼만)
- 문자열 직접 삽입 금지 (SQL Injection 방지)
- snake_case 네이밍 (테이블, 컬럼)

## 주의: 읽기 전용
이 에이전트는 분석만 수행합니다.
실제 마이그레이션이나 데이터 수정은 메인 대화에서 진행하세요.
```

### 3.6 코드베이스 탐색 에이전트

`.claude/agents/researcher.md` 생성:

```markdown
---
name: researcher
description: 코드베이스 탐색 및 분석 전문가. 특정 기능/모듈 조사 시 사용. 빠른 모델 사용
tools: Read, Grep, Glob
model: haiku
permissionMode: plan
---

당신은 코드베이스 탐색 전문가입니다.

## 역할
- 파일 구조 분석
- 함수/컴포넌트 찾기
- 의존성 추적
- 패턴 식별

## NAVIG 프로젝트 구조
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 페이지 (로그인, 회원가입)
│   ├── (dashboard)/       # 대시보드 페이지
│   └── api/               # API Routes
├── components/
│   ├── ui/                # shadcn/ui 컴포넌트
│   ├── auth/              # 인증 관련
│   ├── document/          # 문서 관련
│   ├── layout/            # 레이아웃
│   └── project/           # 프로젝트 관련
├── hooks/                 # 커스텀 훅
├── lib/
│   ├── supabase/          # Supabase 클라이언트
│   └── validations/       # Zod 스키마
└── types/                 # TypeScript 타입
```

## 출력 형식
조사 결과를 명확하게 보고:
- 관련 파일 목록 (경로:라인)
- 코드 흐름 설명
- 의존성 관계
- 발견한 패턴
```

### 3.7 테스트 실행자 에이전트

`.claude/agents/tester.md` 생성:

```markdown
---
name: tester
description: 테스트 실행 및 결과 분석 전문가. 테스트 실행 후 결과 확인 시 사용
tools: Bash, Read, Grep
model: haiku
permissionMode: acceptEdits
---

당신은 테스트 실행 전문가입니다.

## 사용 가능한 명령어

### 타입 체크
```bash
npx tsc --noEmit
```

### 린트
```bash
npm run lint
```

### 빌드 테스트
```bash
npm run build
```

### 단위 테스트 (설정된 경우)
```bash
npm test
```

## 역할
1. 테스트 명령어 실행
2. 오류 분석
3. 실패 원인 파악
4. 수정 방향 제안

## 출력 형식
```
## 테스트 결과

### 실행 명령어
[실행한 명령어]

### 결과
- 성공/실패 여부
- 오류 메시지 (있는 경우)

### 분석
[오류 원인 분석]

### 제안
[수정 방향]
```
```

---

## 4. 에이전트 파일 형식

### 4.1 기본 구조

```markdown
---
name: agent-name
description: 에이전트 설명 (Claude가 위임 결정 시 사용)
tools: Read, Grep, Glob, Edit, Write, Bash
model: sonnet
permissionMode: default
---

시스템 프롬프트 (에이전트의 역할, 규칙, 지식)
```

### 4.2 프론트매터 필드

| 필드 | 필수 | 설명 | 값 예시 |
|------|------|------|---------|
| `name` | O | 고유 식별자 (소문자, 하이픈) | `code-reviewer` |
| `description` | O | Claude가 위임 결정 시 참조 | `코드 품질 검토...` |
| `tools` | X | 사용 가능한 도구 (쉼표 분리) | `Read, Grep, Bash` |
| `disallowedTools` | X | 사용 금지 도구 | `Edit, Write` |
| `model` | X | 사용할 모델 | `sonnet`, `opus`, `haiku` |
| `permissionMode` | X | 권한 모드 | `default`, `plan`, `acceptEdits` |

### 4.3 권한 모드 설명

| 모드 | 설명 | 사용 시기 |
|------|------|-----------|
| `default` | 기본 권한 확인 | 일반적인 개발 작업 |
| `plan` | 읽기 전용 | 분석, 탐색 작업 |
| `acceptEdits` | 파일 수정 자동 승인 | 자동화된 포매팅 등 |
| `bypassPermissions` | 모든 권한 우회 | 주의 필요! |

### 4.4 도구 목록

```
Read      - 파일 읽기
Edit      - 파일 수정
Write     - 파일 생성
Glob      - 파일 패턴 검색
Grep      - 내용 검색
Bash      - 명령어 실행
WebFetch  - 웹 페이지 가져오기
WebSearch - 웹 검색
```

---

## 5. 사용 방법

### 5.1 명시적 호출

```
# 특정 에이전트 사용 요청
code-reviewer 에이전트를 사용해서 최근 변경사항 검토해줘

# 또는
researcher 서브에이전트로 인증 시스템 구조 조사해줘
```

### 5.2 자동 위임

에이전트 description이 작업과 매칭되면 Claude가 자동으로 위임:

```
# Claude가 자동으로 적절한 에이전트 선택
"대시보드 컴포넌트 만들어줘" → frontend-dev
"API 응답 형식 검토해줘" → code-reviewer
"users 테이블 구조 분석해줘" → db-analyst
```

### 5.3 병렬 실행

```
# 여러 에이전트 동시 실행
인증 모듈, 문서 모듈, API 모듈을 각각 다른 researcher 에이전트로
동시에 조사해줘

# 또는
frontend-dev로 UI 구현하면서 동시에 tester로 기존 테스트 확인해줘
```

### 5.4 백그라운드 실행

```
# 백그라운드에서 테스트 실행 (Ctrl+B로도 가능)
tester 에이전트를 백그라운드에서 실행하고 나는 계속 작업할게
```

### 5.5 실전 워크플로우 예시

#### 새 기능 개발

```
1. "알림 설정 페이지 구현해줘"

2. Claude가 자동으로:
   - researcher로 기존 설정 페이지 구조 조사
   - frontend-dev로 UI 구현
   - api-dev로 API 엔드포인트 구현

3. "구현 완료했으면 code-reviewer로 검토해줘"

4. "tester로 빌드 테스트 돌려줘"
```

#### 버그 수정

```
1. "문서 생성 시 500 에러 발생"

2. Claude가:
   - researcher로 관련 코드 탐색
   - db-analyst로 RLS 정책 확인
   - api-dev로 수정 구현
   - tester로 확인
```

---

## 6. 고급 패턴

### 6.1 스킬 연동

에이전트에 프로젝트 스킬 미리 로드:

```markdown
---
name: frontend-dev
skills:
  - REACT_PATTERNS
  - DESIGN_SYSTEM
---
```

`.claude/skills/REACT_PATTERNS/` 구조:
```
REACT_PATTERNS/
└── SKILL.md
```

### 6.2 훅으로 검증 추가

```markdown
---
name: db-writer
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-query.sh"
---
```

### 6.3 조건부 에이전트 선택 프롬프트

메인 CLAUDE.md에 가이드 추가:

```markdown
## 에이전트 사용 가이드

| 작업 | 권장 에이전트 |
|------|--------------|
| 컴포넌트 개발 | frontend-dev |
| API 개발 | api-dev |
| 코드 리뷰 | code-reviewer |
| DB 분석 | db-analyst |
| 구조 조사 | researcher |
| 테스트 | tester |
```

---

## 7. 주의사항

### 7.1 에이전트 개수

- **권장**: 3-5개
- 너무 많으면 오히려 혼란 발생
- 핵심 역할만 분리

### 7.2 컨텍스트 독립성

- 서브에이전트는 독립적인 컨텍스트 사용
- 부모 대화의 스킬/컨텍스트 자동 상속 안 함
- 필요한 정보는 `skills` 필드로 명시

### 7.3 중첩 제한

- 서브에이전트는 다른 서브에이전트 생성 불가
- 최대 1단계 깊이만 가능

### 7.4 백그라운드 제한

- 백그라운드 서브에이전트는 MCP 도구 미지원
- 실시간 상호작용 필요한 작업에는 부적합

### 7.5 모델별 특성

| 모델 | 속도 | 품질 | 권장 용도 |
|------|------|------|-----------|
| Sonnet | 빠름 | 우수 | 개발, 탐색, 분석, 테스트 |
| Opus | 보통 | 최상 | 심층 코드 리뷰, 복잡한 아키텍처 결정 |

> **참고**: Claude Max 구독 사용 시 비용 차이 없음. 품질 우선으로 선택.

---

## 부록: 에이전트 파일 전체 생성

아래 명령어로 모든 에이전트 파일을 한 번에 생성할 수 있습니다:

```bash
mkdir -p .claude/agents
```

그 후 각 에이전트 파일을 위의 예시대로 생성하세요.

---

## 참고 자료

- [Claude Code 공식 문서 - Subagents](https://code.claude.com/docs/en/sub-agents.md)
- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices.md)
- NAVIG 프로젝트 규칙: `.claude/rules/`
- NAVIG PRD: `.claude/docs/01_NAVIG_PRD_FULL.md`

---

**문서 끝**
