# NAVIG 코딩 표준 (Coding Standards)

**버전:** 2.0
**최종 수정:** 2025-01-23

---

## 1. 프로젝트 정보

```yaml
프로젝트명: NAVIG
설명: 영상 제작자, 편집자, 의뢰인을 위한 올인원 프로젝트 관리 및 협업 플랫폼
버전: 0.1.0 (개발 중)
```

### 기술 스택

```yaml
프론트엔드/풀스택:
  - Next.js 15 (App Router)
  - React 19 + TypeScript
  - TailwindCSS + shadcn/ui
  - React Query (서버 상태)
  - React Hook Form + Zod
  - Zustand (클라이언트 상태, 선택적)

데이터베이스:
  - Supabase (PostgreSQL + Auth + Realtime)

향후 계획:
  - 스토리지: Cloudflare R2 / AWS S3
  - 영상 처리: FFmpeg + BullMQ
  - 백엔드 분리: NestJS 10 + TypeORM + Redis
```

---

## 2. 일반 원칙

- **가독성 우선**: 복잡한 코드보다 이해하기 쉬운 코드
- **일관성**: 프로젝트 전체에서 동일한 패턴 사용
- **DRY**: 중복 코드 최소화
- **KISS**: 단순함 유지

---

## 3. 코드 스타일

```yaml
들여쓰기: 2 spaces
세미콜론: 필수
따옴표: 작은따옴표 (')
trailing comma: ES5
줄 길이: 100자 이하
```

---

## 4. TypeScript

### 4.1 타입 정의

```typescript
// ✅ Good: 명시적 타입
interface User {
  id: string;
  email: string;
  role: 'client' | 'worker' | 'admin';
}

// ❌ Bad: any 사용 금지
const user: any = { ... };
```

### 4.2 Union Type 권장

```typescript
type Status = 'pending' | 'in_progress' | 'completed';
```

---

## 5. 네이밍 컨벤션

```yaml
변수/함수: camelCase
컴포넌트: PascalCase
타입/인터페이스: PascalCase
상수: UPPER_SNAKE_CASE
훅: use 접두사 (useProjects)
핸들러: handle 접두사 (handleClick)
파일명:
  - 컴포넌트: PascalCase.tsx
  - 훅: use-[name].ts
  - 유틸/라이브러리: kebab-case.ts
데이터베이스:
  - 테이블: snake_case (복수형)
  - 컬럼: snake_case
```

---

## 6. 파일 구조

```yaml
Next.js 페이지:
  - 위치: src/app/[route]/
  - 파일명: page.tsx, layout.tsx, loading.tsx, error.tsx

React 컴포넌트:
  - 위치: src/components/[feature]/
  - UI 컴포넌트: src/components/ui/ (shadcn/ui)
  - export: named export (default export 지양)

커스텀 훅:
  - 위치: src/hooks/

유틸리티/라이브러리:
  - 위치: src/lib/

타입 정의:
  - 공유 타입: src/types/
  - 로컬 타입: 해당 모듈 내 types.ts

API Routes:
  - 위치: src/app/api/[route]/route.ts
  - Export: GET, POST, PUT, DELETE 등
```

---

## 7. Next.js 규칙

```yaml
Server Component (기본):
  - 'use client' 지시어 없음
  - 데이터 페칭: async/await 직접 사용

Client Component:
  - 파일 상단에 'use client' 필수
  - 사용 시기: 상호작용, useState/useEffect, 브라우저 API
  - 최소한으로 사용, 필요한 부분만 분리

Layout/Template:
  - layout.tsx: 여러 페이지 공유 레이아웃
  - loading.tsx: Suspense 로딩 UI
  - error.tsx: 에러 바운더리
```

---

## 8. NestJS (향후 백엔드 분리 시)

```typescript
@Controller('projects')
export class ProjectsController {
  @Get()
  findAll(@Query() query: FindDto) { ... }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateDto) { ... }
}
```

---

## 9. 데이터베이스

```sql
-- 테이블: snake_case, 복수형
CREATE TABLE projects ( ... );

-- 컬럼: snake_case
created_at, updated_at, client_id

-- 인덱스
CREATE INDEX idx_projects_status ON projects(status);
```

---

## 10. API 설계

```
GET    /projects           # 목록
POST   /projects           # 생성
GET    /projects/:id       # 상세
PATCH  /projects/:id       # 수정
DELETE /projects/:id       # 삭제
```

### 응답 형식

```json
{ "data": { ... }, "message": "Success" }
```

---

## 11. 보안 & 금지 사항

### 보안 원칙
- 환경변수로 시크릿 관리
- 입력값 유효성 검증 필수
- Guard로 인증/인가 처리

### 금지 사항

```yaml
코드:
  - any 타입 사용 (불가피 시 주석 필수)
  - console.log (프로덕션 코드)
  - 하드코딩된 시크릿
  - 미사용 import / 주석 처리된 코드

데이터베이스:
  - 문자열 직접 삽입 (SQL Injection 위험)
  - SELECT * (필요한 컬럼만 선택)

보안:
  - 민감 정보 로깅
  - 클라이언트에 서버 에러 상세 노출
  - 권한 검증 없는 리소스 접근
```

---

## 12. Git 커밋

```
feat(auth): 카카오 로그인 구현
fix(upload): 업로드 오류 수정
docs: README 업데이트
```

---

## 13. 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 향후 추가
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
```

---

## 14. 자주 사용하는 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 빌드
npm run lint         # 린트
npx tsc --noEmit     # 타입 체크
npx shadcn@latest add [component]  # UI 컴포넌트 추가
```

---

## 15. 체크리스트

### PR 전
- [ ] TypeScript 에러 없음
- [ ] ESLint 경고 없음
- [ ] console.log 제거
- [ ] 민감 정보 노출 없음

### 컴포넌트
- [ ] Props 타입 정의
- [ ] 에러/로딩 상태 처리
- [ ] 반응형 지원

### API Route
- [ ] Request 유효성 검증 (Zod)
- [ ] 인증/인가 적용
- [ ] 에러 핸들링
- [ ] Response 형식 일관성
