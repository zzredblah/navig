# Claude Code 개발 요청서 - Phase 1 Sprint 1-2

## 프로젝트 셋업 & 인증 시스템

**기간**: Week 1-4  
**목표**: 개발 환경 구축, 인증/인가 시스템 완성

---

## 작업 1: 프로젝트 초기 셋업

### 요청 내용

```
Ticky 프로젝트의 초기 개발 환경을 구축해주세요.

기술 스택:
- Frontend: React 18 + TypeScript + Vite
- Styling: TailwindCSS
- State: Zustand + React Query
- Backend: Node.js + NestJS
- Database: Supabase (PostgreSQL)
- Storage: Cloudflare R2

디렉토리 구조:
ticky/
├── apps/
│   ├── web/          # React 프론트엔드
│   └── api/          # NestJS 백엔드
├── packages/
│   ├── ui/           # 공유 UI 컴포넌트
│   ├── types/        # 공유 타입 정의
│   └── utils/        # 공유 유틸리티
└── package.json      # 모노레포 루트

요구사항:
1. pnpm workspace 기반 모노레포 설정
2. TypeScript 설정 (strict mode)
3. ESLint + Prettier 설정
4. Husky + lint-staged 설정
5. 환경 변수 설정 (.env.example)
```

---

## 작업 2: 기본 UI 컴포넌트 라이브러리

### 요청 내용

```
packages/ui에 기본 UI 컴포넌트를 구현해주세요.

디자인 시스템 참조: rules/DESIGN_SYSTEM.md

필요한 컴포넌트:
1. Button (variants: primary, secondary, outline, ghost, danger)
2. Input (types: text, email, password, number)
3. Textarea
4. Select
5. Checkbox, Radio
6. Modal
7. Toast (variants: success, error, warning, info)
8. Card
9. Avatar
10. Badge
11. Spinner
12. Skeleton

요구사항:
- TypeScript 타입 정의
- TailwindCSS 스타일링
- 접근성 (ARIA) 준수
```

---

## 작업 3: Supabase 설정 및 스키마

### 요청 내용

```
Supabase 데이터베이스 스키마를 설정해주세요.

테이블:
1. users (Supabase Auth 확장)
2. projects
3. project_members

요구사항:
1. 마이그레이션 파일 생성
2. RLS 정책 설정
3. 트리거: updated_at 자동 업데이트
4. 인덱스
```

---

## 작업 4: 인증 시스템 (백엔드)

### 요청 내용

```
NestJS 기반 인증 시스템을 구현해주세요.

Supabase Auth 연동:
- 이메일/비밀번호 인증
- Google OAuth
- Kakao OAuth

API:
POST /auth/signup
POST /auth/login
POST /auth/logout
POST /auth/password/reset-request
POST /auth/password/reset
GET /auth/me
PATCH /auth/me
POST /auth/oauth/google
POST /auth/oauth/kakao

요구사항:
1. JWT Guard
2. 역할 기반 Guard (RolesGuard)
3. @CurrentUser 데코레이터
4. DTO 유효성 검증
```

---

## 작업 5: 인증 시스템 (프론트엔드)

### 요청 내용

```
React 기반 인증 UI를 구현해주세요.

페이지:
1. 로그인 (/login)
2. 회원가입 (/signup)
3. 비밀번호 찾기 (/forgot-password)
4. 비밀번호 재설정 (/reset-password)

상태 관리:
- Zustand auth store
- 토큰 관리 (localStorage)

요구사항:
1. React Hook Form + Zod
2. 에러 메시지 표시
3. 로딩 상태 표시
4. Protected Route 컴포넌트
```

---

## 작업 6: 프로젝트 관리 (백엔드)

### 요청 내용

```
프로젝트 CRUD API를 구현해주세요.

API:
GET /projects
POST /projects
GET /projects/:id
PATCH /projects/:id
DELETE /projects/:id
POST /projects/:id/members
DELETE /projects/:id/members/:memberId
PATCH /projects/:id/members/:memberId

요구사항:
1. 페이지네이션
2. 검색/필터
3. 권한 체크
```

---

## 작업 7: 프로젝트 관리 (프론트엔드)

### 요청 내용

```
프로젝트 관리 UI를 구현해주세요.

페이지:
1. 프로젝트 목록 (/projects)
2. 프로젝트 생성 모달
3. 프로젝트 상세 (/projects/:id)
4. 멤버 초대 모달

요구사항:
1. React Query 서버 상태 관리
2. 스켈레톤 로딩
3. 반응형 그리드
```

---

## 작업 8: 기본 레이아웃

### 요청 내용

```
애플리케이션 기본 레이아웃을 구현해주세요.

컴포넌트:
1. MainLayout
2. Header (로고, 검색, 알림, 프로필)
3. Sidebar (네비게이션, 접기/펼치기)
4. Breadcrumb

반응형:
- 데스크톱: 고정 사이드바
- 태블릿: 축소 사이드바
- 모바일: 햄버거 메뉴
```

---

## 참조 파일

- `rules/CODING_STANDARDS.md` - 코딩 컨벤션
- `rules/DESIGN_SYSTEM.md` - 디자인 시스템
- `skills/REACT_PATTERNS.md` - React 패턴
- `skills/NESTJS_PATTERNS.md` - NestJS 패턴

---

## 완료 기준

1. 회원가입/로그인 가능
2. 소셜 로그인 (Google, Kakao) 가능
3. 프로젝트 CRUD 가능
4. 프로젝트 멤버 초대 가능
5. 역할별 권한 제어 작동
6. 반응형 레이아웃 정상 작동
