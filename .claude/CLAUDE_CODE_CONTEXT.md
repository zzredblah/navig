# Ticky Claude Code Sub-Agent 설정

**버전:** 1.0  
**최종 수정:** 2025-01-22

---

## 1. 개요

이 문서는 Ticky 프로젝트 개발 시 Claude Code가 참조해야 할 컨텍스트와 규칙을 정의합니다.

---

## 2. 프로젝트 정보

### 2.1 기본 정보

```yaml
프로젝트명: Ticky
설명: 영상 제작자, 편집자, 의뢰인을 위한 올인원 프로젝트 관리 및 협업 플랫폼
버전: 0.1.0 (개발 중)
```

### 2.2 기술 스택

```yaml
프론트엔드/풀스택:
  - Next.js 15 (App Router)
  - React 19 + TypeScript
  - TailwindCSS
  - shadcn/ui
  - React Query (서버 상태)
  - React Hook Form + Zod
  - Zustand (클라이언트 상태, 선택적)

데이터베이스:
  - Supabase (PostgreSQL)
  - Supabase Auth
  - Supabase Realtime

스토리지 (향후 계획):
  - Cloudflare R2
  - AWS S3

영상 처리 (향후 계획):
  - FFmpeg
  - BullMQ (작업 큐)

향후 백엔드 분리 (선택적):
  - NestJS 10
  - TypeORM
  - Redis
```

---

## 3. 필수 참조 파일

Claude Code는 작업 전 반드시 다음 파일들을 참조해야 합니다:

### 3.1 PRD 문서

| 파일 | 용도 |
|------|------|
| `.claude/docs/01_TICKY_PRD_FULL.md` | 전체 요구사항 확인 |
| `.claude/docs/02_TICKY_PRD_PHASE1_MVP.md` | Phase 1 상세 스펙 |

### 3.2 규칙 문서

| 파일 | 용도 |
|------|------|
| `.claude/rules/CODING_STANDARDS.md` | 코딩 컨벤션 |
| `.claude/rules/DESIGN_SYSTEM.md` | UI/UX 가이드라인 |

### 3.3 스킬 문서

| 파일 | 용도 |
|------|------|
| `.claude/skills/REACT_PATTERNS.md` | React/Next.js 개발 패턴 |
| `.claude/skills/NESTJS_PATTERNS.md` | NestJS 개발 패턴 (향후 백엔드 분리 시) |

---

## 4. 코드 생성 규칙

### 4.1 파일 생성 규칙

```yaml
Next.js 페이지:
  - 위치: src/app/[route]/
  - 파일명: page.tsx, layout.tsx, loading.tsx, error.tsx
  - export: default export

React 컴포넌트:
  - 위치: src/components/[feature]/
  - 파일명: PascalCase.tsx
  - export: named export (default export 지양)
  - UI 컴포넌트: src/components/ui/ (shadcn/ui)

커스텀 훅:
  - 위치: src/hooks/
  - 파일명: use-[name].ts
  - export: named export

유틸리티/라이브러리:
  - 위치: src/lib/
  - 파일명: kebab-case.ts
  - export: named export

타입 정의:
  - 공유 타입: src/types/
  - 로컬 타입: 해당 모듈 내 types.ts
```

### 4.2 코드 스타일

```yaml
들여쓰기: 2 spaces
세미콜론: 필수
따옴표: 작은따옴표 (')
trailing comma: ES5
줄 길이: 100자 이하
```

### 4.3 네이밍 컨벤션

```yaml
변수/함수: camelCase
컴포넌트: PascalCase
타입/인터페이스: PascalCase
상수: UPPER_SNAKE_CASE
파일명:
  - 컴포넌트: PascalCase.tsx
  - 유틸: kebab-case.ts
  - 모듈: kebab-case
데이터베이스:
  - 테이블: snake_case (복수형)
  - 컬럼: snake_case
```

### 4.4 Next.js 특화 규칙

```yaml
Server Component (기본):
  - 위치: src/app/ 또는 src/components/
  - 데이터 페칭: async/await 직접 사용
  - 'use client' 지시어 없음

Client Component:
  - 파일 상단에 'use client' 필수
  - 사용 시기:
    - 상호작용 (onClick, onChange 등)
    - useState, useEffect 등 훅 사용
    - 브라우저 API 사용
  - 최소한으로 사용, 필요한 부분만 분리

API Routes:
  - 위치: src/app/api/[route]/route.ts
  - Export: GET, POST, PUT, DELETE 등
  - 파일명: route.ts 고정

Layout/Template:
  - layout.tsx: 여러 페이지 공유 레이아웃
  - template.tsx: 매번 새로 렌더링되는 레이아웃
  - loading.tsx: Suspense 로딩 UI
  - error.tsx: 에러 바운더리
```

---

## 5. 작업 플로우

### 5.1 새 기능 구현 시

```
1. PRD에서 요구사항 확인
2. 관련 규칙/스킬 문서 참조
3. 데이터 모델 설계 (Supabase 스키마)
4. API Route 구현 (src/app/api/[route]/route.ts)
5. Server Component/Client Component 구현
6. UI 컴포넌트 작성 (필요 시)
7. 상태 관리 및 데이터 페칭 설정
8. 테스트 코드 작성
9. 코드 리뷰 체크리스트 확인
```

### 5.2 버그 수정 시

```
1. 버그 재현 확인
2. 원인 분석
3. 수정 코드 작성
4. 관련 테스트 추가/수정
5. 회귀 테스트 확인
```

---

## 6. 응답 형식

### 6.1 코드 생성 시

```markdown
## 파일: [파일 경로]

[코드 블록]

### 설명
- [주요 구현 내용]
- [주의사항]

### 의존성
- [필요한 패키지/모듈]
```

### 6.2 아키텍처 제안 시

```markdown
## 제안: [제목]

### 현재 상황
[문제점/개선 필요 사항]

### 제안 내용
[해결 방안]

### 장단점
- 장점: ...
- 단점: ...

### 구현 방법
[단계별 구현 방법]
```

---

## 7. 금지 사항

### 7.1 코드

```yaml
금지:
  - any 타입 사용 (불가피한 경우 주석 필수)
  - console.log (프로덕션 코드)
  - 하드코딩된 시크릿
  - 미사용 import
  - 주석 처리된 코드
```

### 7.2 데이터베이스

```yaml
금지:
  - 문자열 직접 삽입 (SQL Injection 위험)
  - SELECT * (필요한 컬럼만 선택)
  - 인덱스 없는 자주 조회되는 컬럼
```

### 7.3 보안

```yaml
금지:
  - 민감 정보 로깅
  - 클라이언트에 서버 에러 상세 노출
  - 권한 검증 없는 리소스 접근
```

---

## 8. 체크리스트

### 8.1 PR 전 체크

```
[ ] TypeScript 에러 없음
[ ] ESLint 경고 없음
[ ] 테스트 통과
[ ] 불필요한 console.log 제거
[ ] 민감 정보 노출 없음
[ ] 커밋 메시지 컨벤션 준수
```

### 8.2 컴포넌트 체크

```
[ ] Props 타입 정의
[ ] 에러 상태 처리
[ ] 로딩 상태 처리
[ ] 접근성 (aria-*)
[ ] 반응형 지원
```

### 8.3 API Route 체크

```
[ ] Route Handler 구현 (GET, POST, etc.)
[ ] Request body/params 유효성 검증 (Zod)
[ ] 인증/인가 적용 (Supabase Auth)
[ ] 에러 핸들링
[ ] Response 형식 일관성
```

---

## 9. 환경 변수

### 9.1 Next.js (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 향후 추가 예정
# Cloudflare R2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
```

---

## 10. 자주 사용하는 명령어

```bash
# 개발 서버 실행
npm run dev
# 또는
pnpm dev

# 린트
npm run lint

# 타입 체크
npx tsc --noEmit

# 빌드
npm run build

# 프로덕션 실행
npm run start

# shadcn/ui 컴포넌트 추가
npx shadcn@latest add [component-name]
```

---

## 11. 문의 시 제공할 정보

버그나 이슈 발생 시 다음 정보를 포함해주세요:

```
1. 작업 중인 기능/파일
2. 에러 메시지 (전체)
3. 재현 단계
4. 기대 동작
5. 실제 동작
6. 관련 코드 스니펫
```
