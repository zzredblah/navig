# Ticky 코딩 표준 (Coding Standards)

**버전:** 1.0  
**최종 수정:** 2025-01-22

---

## 1. 일반 원칙

- **가독성 우선**: 복잡한 코드보다 이해하기 쉬운 코드
- **일관성**: 프로젝트 전체에서 동일한 패턴 사용
- **DRY**: 중복 코드 최소화
- **KISS**: 단순함 유지

---

## 2. TypeScript

### 2.1 타입 정의

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

### 2.2 Union Type 권장

```typescript
type Status = 'pending' | 'in_progress' | 'completed';
```

---

## 3. React 네이밍

```typescript
// 컴포넌트: PascalCase
export function ProjectCard() { ... }

// 훅: use 접두사
export function useProjects() { ... }

// 핸들러: handle 접두사
const handleClick = () => { ... };

// 상수: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
```

---

## 4. NestJS

### Controller

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

### DTO 유효성 검증

```typescript
export class CreateProjectDto {
  @IsString()
  @MaxLength(255)
  title: string;
}
```

---

## 5. 데이터베이스

```sql
-- 테이블: snake_case, 복수형
CREATE TABLE projects ( ... );

-- 컬럼: snake_case
created_at, updated_at, client_id

-- 인덱스
CREATE INDEX idx_projects_status ON projects(status);
```

---

## 6. API 설계

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

## 7. Git 커밋

```
feat(auth): 카카오 로그인 구현
fix(upload): 업로드 오류 수정
docs: README 업데이트
```

---

## 8. 보안

- 환경변수로 시크릿 관리
- 입력값 유효성 검증 필수
- Guard로 인증/인가 처리

---

## 9. 체크리스트

- [ ] TypeScript 에러 없음
- [ ] ESLint 경고 없음
- [ ] 테스트 통과
- [ ] console.log 제거
- [ ] 민감 정보 노출 없음
