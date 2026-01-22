# Claude Code 개발 요청서 - Phase 1 Sprint 3-4

## 문서 관리 시스템

**기간**: Week 5-8  
**목표**: 문서 템플릿, 생성/편집, 전자서명 구현

---

## 작업 1: 문서 템플릿 스키마

### 요청 내용

```
문서 관련 데이터베이스 스키마를 설정해주세요.

테이블:

1. document_templates
   - id: UUID PRIMARY KEY
   - type: ENUM('request', 'estimate', 'contract')
   - name: VARCHAR(255)
   - description: TEXT
   - fields: JSONB
   - is_default: BOOLEAN
   - created_by: UUID REFERENCES users
   - created_at: TIMESTAMP

2. documents
   - id: UUID PRIMARY KEY
   - project_id: UUID REFERENCES projects
   - template_id: UUID REFERENCES document_templates
   - type: ENUM('request', 'estimate', 'contract')
   - title: VARCHAR(255)
   - content: JSONB
   - status: ENUM('draft', 'pending', 'approved', 'rejected', 'signed')
   - version: INTEGER DEFAULT 1
   - file_url: VARCHAR(500)
   - reject_reason: TEXT
   - created_by: UUID REFERENCES users
   - created_at: TIMESTAMP
   - updated_at: TIMESTAMP

3. document_versions
   - id: UUID PRIMARY KEY
   - document_id: UUID REFERENCES documents
   - version: INTEGER
   - content: JSONB
   - created_by: UUID REFERENCES users
   - created_at: TIMESTAMP

4. signatures
   - id: UUID PRIMARY KEY
   - document_id: UUID REFERENCES documents
   - user_id: UUID REFERENCES users
   - signature_data: TEXT (base64)
   - ip_address: VARCHAR(50)
   - user_agent: TEXT
   - signed_at: TIMESTAMP

RLS 정책:
- 프로젝트 멤버만 문서 접근 가능
- 작성자만 수정 가능 (draft 상태)
```

---

## 작업 2: 문서 API (백엔드)

### 요청 내용

```
문서 CRUD API를 구현해주세요.

API 엔드포인트:

# 템플릿
GET /templates
GET /templates/:id
POST /templates (admin only)
PATCH /templates/:id (admin only)
DELETE /templates/:id (admin only)

# 문서
GET /projects/:projectId/documents
POST /projects/:projectId/documents
GET /documents/:id
PATCH /documents/:id
DELETE /documents/:id

# 상태 변경
PATCH /documents/:id/status
- body: { status, reject_reason? }
- 상태 전환 규칙 검증

# 서명
POST /documents/:id/sign
- body: { signature_data }
- IP, User-Agent 자동 기록

# PDF 생성
GET /documents/:id/pdf
- 문서를 PDF로 변환하여 반환
- Cloudflare R2에 저장

# 버전 히스토리
GET /documents/:id/versions

워크플로우:
draft → pending → approved/rejected
approved → signed (계약서만)

요구사항:
1. 상태 전환 유효성 검증
2. 버전 자동 생성 (수정 시)
3. PDF 생성 (puppeteer 또는 html-pdf)
4. 이메일 알림 (상태 변경 시)
```

---

## 작업 3: 문서 편집 UI (프론트엔드)

### 요청 내용

```
문서 편집 UI를 구현해주세요.

페이지:

1. 문서 목록 (/projects/:id/documents)
   - 문서 유형별 탭 (요청서/견적서/계약서)
   - 상태별 필터
   - "문서 생성" 버튼

2. 문서 생성 모달
   - 템플릿 선택
   - 템플릿 미리보기

3. 문서 편집 (/documents/:id/edit)
   - 템플릿 필드 기반 폼 렌더링
   - 실시간 미리보기 (우측)
   - 자동 저장 (30초)
   - "저장", "제출", "취소" 버튼

4. 문서 상세 (/documents/:id)
   - 문서 내용 표시
   - 상태 뱃지
   - 액션 버튼 (승인/반려/서명)
   - 버전 히스토리

템플릿 필드 타입 렌더링:
- text: Input
- number: Input (type=number)
- date: DatePicker
- textarea: Textarea
- select: Select
- file: FileUpload

요구사항:
1. 동적 폼 렌더링
2. 실시간 유효성 검증
3. 자동 저장
4. PDF 다운로드
5. 인쇄 버전
```

---

## 작업 4: 전자서명 컴포넌트

### 요청 내용

```
전자서명 기능을 구현해주세요.

컴포넌트: SignaturePad

기능:
1. Canvas 기반 서명 입력
   - 터치 지원 (모바일)
   - 마우스 드래그
   - 펜 두께/색상 설정

2. 서명 관리
   - 서명 지우기
   - 저장된 서명 불러오기
   - 서명 저장

3. 서명 확인 모달
   - 서명 미리보기
   - "서명 완료" 버튼
   - 법적 고지 문구

데이터:
- base64 이미지로 저장
- 서명 시점 타임스탬프
- 서명자 IP, 디바이스 정보

UI:
┌─────────────────────────────────┐
│ 서명해주세요                     │
├─────────────────────────────────┤
│                                 │
│    [서명 캔버스 영역]            │
│                                 │
├─────────────────────────────────┤
│ [지우기] [저장된 서명]  [완료]    │
└─────────────────────────────────┘

요구사항:
1. 부드러운 선 그리기 (bezier curve)
2. 반응형 캔버스 크기
3. 저장된 서명 재사용
4. 서명 이미지 최적화 (압축)
```

---

## 작업 5: 문서 상태 관리

### 요청 내용

```
문서 상태 전환 및 알림을 구현해주세요.

상태 전환 규칙:

| 현재 상태 | 가능한 전환 | 전환 권한 |
|---------|-----------|---------|
| draft | pending | 작성자 |
| pending | approved, rejected | 검토자 |
| approved | signed (계약서만) | 서명자 |
| rejected | draft | 작성자 |

상태 변경 UI:
1. 상태 변경 드롭다운
2. 반려 사유 모달 (rejected 전환 시)
3. 상태 변경 확인 모달

알림:
- 상태 변경 시 관련자에게 알림
- 서명 요청 시 이메일 발송

요구사항:
1. 상태 전환 규칙 프론트/백엔드 동기화
2. 낙관적 업데이트
3. 실패 시 롤백
```

---

## 작업 6: PDF 생성 및 다운로드

### 요청 내용

```
문서 PDF 생성 기능을 구현해주세요.

PDF 템플릿:
- 회사 로고 (선택)
- 문서 제목
- 필드별 내용
- 서명란 (서명 이미지 포함)
- 날짜, 문서 번호

기술 스택:
- puppeteer (HTML → PDF)
- 또는 @react-pdf/renderer

PDF 생성 플로우:
1. 문서 데이터 조회
2. HTML 템플릿 렌더링
3. PDF 변환
4. Cloudflare R2 저장
5. URL 반환

요구사항:
1. 한글 폰트 지원 (Pretendard)
2. A4 사이즈
3. 페이지 번호
4. 워터마크 (옵션)
```

---

## 참조 파일

- `rules/CODING_STANDARDS.md` - 코딩 컨벤션
- `rules/DESIGN_SYSTEM.md` - 디자인 시스템
- 전체 PRD: `01_TICKY_PRD_FULL.md` 섹션 3.1

---

## 완료 기준

1. 문서 템플릿 CRUD 가능
2. 템플릿 기반 문서 생성 가능
3. 문서 편집 및 자동 저장 작동
4. 상태 전환 (워크플로우) 작동
5. 전자서명 입력 및 저장 가능
6. PDF 생성 및 다운로드 가능
7. 버전 히스토리 조회 가능
