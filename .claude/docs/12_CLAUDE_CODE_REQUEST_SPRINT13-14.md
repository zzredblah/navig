# Claude Code 개발 요청서 - Phase 2 Sprint 13-14

## 멀티 캔버스 + 고급 버전 비교

**기간**: Week 5-8 (Month 4-5)
**목표**: 레퍼런스 보드 기능, 슬라이더 버전 비교 구현

---

## 작업 1: 멀티 캔버스 DB 스키마

### 요청 내용

```
멀티 캔버스(레퍼런스 보드) 기능을 위한 데이터베이스 스키마를 생성해주세요.

마이그레이션 파일 생성:

-- 00013_boards.sql

-- 보드 테이블
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT '새 보드',
  description TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(64) UNIQUE,
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  grid_enabled BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 보드 요소 테이블
CREATE TABLE board_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'image', 'video', 'text', 'shape', 'sticky', 'frame'
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  width FLOAT NOT NULL DEFAULT 200,
  height FLOAT NOT NULL DEFAULT 200,
  rotation FLOAT DEFAULT 0,
  z_index INTEGER DEFAULT 0,
  locked BOOLEAN DEFAULT FALSE,
  content JSONB NOT NULL DEFAULT '{}',
  style JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_boards_project ON boards(project_id);
CREATE INDEX idx_boards_share_token ON boards(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_board_elements_board ON board_elements(board_id);
CREATE INDEX idx_board_elements_type ON board_elements(board_id, type);

-- RLS 정책
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_elements ENABLE ROW LEVEL SECURITY;

-- boards: 프로젝트 멤버 또는 공개 보드는 누구나
CREATE POLICY boards_select ON boards FOR SELECT USING (
  is_public = TRUE OR
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = boards.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY boards_insert ON boards FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = boards.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY boards_update ON boards FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = boards.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY boards_delete ON boards FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = boards.project_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('owner', 'admin')
  )
);

-- board_elements: 보드 접근 가능자
CREATE POLICY board_elements_all ON board_elements FOR ALL USING (
  EXISTS (
    SELECT 1 FROM boards b
    JOIN project_members pm ON pm.project_id = b.project_id
    WHERE b.id = board_elements.board_id
    AND pm.user_id = auth.uid()
  )
);

-- 업데이트 트리거
CREATE TRIGGER boards_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER board_elements_updated_at
  BEFORE UPDATE ON board_elements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

요구사항:
1. content JSONB 구조 정의
2. style JSONB 구조 정의
3. 공개 링크 공유 지원
4. 실시간 동기화 대비 구조
```

---

## 작업 2: 멀티 캔버스 API

### 요청 내용

```
멀티 캔버스 CRUD API를 구현해주세요.

API 엔드포인트:

# 보드 목록
GET /api/projects/:projectId/boards
- query: { page?, limit? }
- response: { data: Board[], total: number }

# 보드 생성
POST /api/projects/:projectId/boards
- body: { title, description? }
- response: { board: Board }

# 보드 상세
GET /api/boards/:boardId
- response: { board: Board, elements: BoardElement[] }

# 보드 수정
PATCH /api/boards/:boardId
- body: { title?, description?, background_color?, grid_enabled? }
- response: { board: Board }

# 보드 삭제
DELETE /api/boards/:boardId
- response: { success: boolean }

# 공유 링크 생성
POST /api/boards/:boardId/share
- response: { share_url: string, share_token: string }

# 공유 링크 비활성화
DELETE /api/boards/:boardId/share
- response: { success: boolean }

# 요소 목록
GET /api/boards/:boardId/elements
- response: { elements: BoardElement[] }

# 요소 추가
POST /api/boards/:boardId/elements
- body: { type, position_x, position_y, width, height, content, style? }
- response: { element: BoardElement }

# 요소 수정
PATCH /api/boards/:boardId/elements/:elementId
- body: { position_x?, position_y?, width?, height?, rotation?, z_index?, content?, style?, locked? }
- response: { element: BoardElement }

# 요소 삭제
DELETE /api/boards/:boardId/elements/:elementId
- response: { success: boolean }

# 요소 일괄 업데이트 (이동, 크기 변경 등)
PATCH /api/boards/:boardId/elements/batch
- body: { elements: [{ id, ...changes }] }
- response: { elements: BoardElement[] }

타입 정의:

interface Board {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  is_public: boolean;
  share_token?: string;
  background_color: string;
  grid_enabled: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface BoardElement {
  id: string;
  board_id: string;
  type: 'image' | 'video' | 'text' | 'shape' | 'sticky' | 'frame';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  locked: boolean;
  content: ElementContent;
  style: ElementStyle;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface ElementContent {
  // image/video
  url?: string;
  thumbnail_url?: string;
  original_filename?: string;

  // text/sticky
  text?: string;

  // shape
  shape_type?: 'rectangle' | 'circle' | 'triangle' | 'arrow';

  // frame
  children?: string[]; // 자식 요소 ID
}

interface ElementStyle {
  background_color?: string;
  border_color?: string;
  border_width?: number;
  border_radius?: number;
  font_size?: number;
  font_weight?: string;
  text_align?: 'left' | 'center' | 'right';
  text_color?: string;
  opacity?: number;
  shadow?: boolean;
}

요구사항:
1. 요소 추가 시 R2에 파일 업로드 (이미지/영상)
2. 일괄 업데이트 성능 최적화
3. 공유 토큰은 crypto.randomUUID() 사용
4. 썸네일 자동 생성 (첫 이미지 또는 캔버스 스냅샷)
```

---

## 작업 3: 멀티 캔버스 UI (기본)

### 요청 내용

```
무한 캔버스 기반 레퍼런스 보드 UI를 구현해주세요.

페이지: /projects/:projectId/boards/:boardId

레이아웃:
┌────────────────────────────────────────────────────────────┐
│ ← 브랜드 영상 / 레퍼런스 보드        [공유] [설정] [...] │
├──────┬─────────────────────────────────────────────────────┤
│      │                                                     │
│ 도구 │                    캔버스 영역                      │
│ 바   │                                                     │
│      │     ┌─────────┐    ┌─────────────┐                 │
│ [V]  │     │  이미지  │    │             │                 │
│ [T]  │     │         │    │   영상      │                 │
│ [□]  │     └─────────┘    │             │                 │
│ [○]  │                    └─────────────┘                 │
│ [📌] │                                                     │
│      │         ┌───────────────┐                          │
│      │         │  텍스트 메모   │                          │
│      │         └───────────────┘                          │
│      │                                                     │
├──────┴─────────────────────────────────────────────────────┤
│                     줌: 100%  [−] ═══●═══ [+]              │
└────────────────────────────────────────────────────────────┘

도구바:
- [V] 선택 도구 (기본)
- [T] 텍스트 추가
- [□] 사각형
- [○] 원형
- [📌] 스티키 노트
- [🖼️] 이미지 업로드
- [🎬] 영상 업로드
- [⬜] 프레임

기능:
1. 줌/팬 (마우스 휠, 드래그)
2. 요소 선택/다중 선택
3. 드래그 앤 드롭 (파일 업로드 포함)
4. 크기 조절 (8개 핸들)
5. 회전 (Shift 드래그)
6. 복사/붙여넣기 (Cmd+C/V)
7. 삭제 (Delete, Backspace)
8. Undo/Redo (Cmd+Z/Y)
9. 맞춤/정렬 도구
10. 레이어 순서 변경

기술 스택:
- Canvas: Konva.js (react-konva)
- 제스처: @use-gesture/react
- 상태: Zustand (캔버스 상태)

컴포넌트 구조:

BoardPage/
├── BoardCanvas.tsx       # 캔버스 컨테이너
├── BoardToolbar.tsx      # 좌측 도구바
├── BoardHeader.tsx       # 상단 헤더
├── BoardZoomControls.tsx # 줌 컨트롤
├── elements/
│   ├── ImageElement.tsx
│   ├── VideoElement.tsx
│   ├── TextElement.tsx
│   ├── ShapeElement.tsx
│   ├── StickyElement.tsx
│   └── FrameElement.tsx
├── panels/
│   ├── PropertiesPanel.tsx  # 속성 편집
│   └── LayersPanel.tsx      # 레이어 목록
└── hooks/
    ├── useBoardStore.ts     # Zustand 스토어
    ├── useCanvasGestures.ts # 줌/팬
    └── useElementDrag.ts    # 요소 드래그

요구사항:
1. 60fps 부드러운 애니메이션
2. 대용량 캔버스 (10,000 x 10,000 가상 크기)
3. 100개 이상 요소 성능
4. 이미지/영상 lazy loading
5. 반응형 (모바일은 보기 전용)
```

---

## 작업 4: 멀티 캔버스 UI (고급)

### 요청 내용

```
멀티 캔버스 고급 기능을 구현해주세요.

1. 속성 패널
   ┌─────────────────────────┐
   │ 속성                    │
   ├─────────────────────────┤
   │ 위치                    │
   │ X: [100]  Y: [200]      │
   │                         │
   │ 크기                    │
   │ W: [300]  H: [200]      │
   │ 🔗 비율 고정            │
   │                         │
   │ 회전: [0°]              │
   │                         │
   │ 스타일                  │
   │ 배경: [#FFFFFF] ▼       │
   │ 테두리: [#000] 1px      │
   │ 둥글기: [8]             │
   │ 투명도: [100%]          │
   │                         │
   │ 레이어                  │
   │ [↑맨앞] [↓맨뒤]        │
   └─────────────────────────┘

2. 정렬 도구 (다중 선택 시)
   [좌정렬] [중앙] [우정렬]
   [상정렬] [가운데] [하정렬]
   [가로 분배] [세로 분배]

3. 히스토리 (Undo/Redo)
   - Zustand 미들웨어로 히스토리 관리
   - 최대 50개 상태 저장

4. 스냅/그리드
   - 그리드 토글
   - 스냅 토글
   - 요소 가장자리 스냅
   - 중심선 가이드

5. 미니맵
   ┌─────────────┐
   │ ┌───┐      │
   │ │뷰 │      │
   │ └───┘      │
   └─────────────┘

6. 키보드 단축키
   | 단축키 | 기능 |
   |--------|------|
   | V | 선택 도구 |
   | T | 텍스트 |
   | R | 사각형 |
   | O | 원 |
   | Del | 삭제 |
   | Cmd+A | 전체 선택 |
   | Cmd+D | 복제 |
   | Cmd+G | 그룹화 |
   | [ / ] | 레이어 순서 |
   | Cmd+[ / ] | 맨 뒤/앞으로 |

7. 내보내기
   - PNG 다운로드
   - 선택 영역 내보내기
   - PDF 내보내기 (선택적)

요구사항:
1. 속성 변경 실시간 반영
2. 다중 선택 시 공통 속성만 표시
3. 히스토리 배치 처리 (드래그 끝날 때만 저장)
4. 성능 최적화 (React.memo, useMemo)
```

---

## 작업 5: 슬라이더 버전 비교

### 요청 내용

```
두 영상 버전을 슬라이더로 비교하는 기능을 구현해주세요.

페이지: /videos/:videoId/compare?v1=:version1&v2=:version2

레이아웃:
┌────────────────────────────────────────────────────────────┐
│ 버전 비교                                      [X 닫기]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ v1 (초안)                             v2 (수정본)          │
│ ┌───────────────────┬────────────────────────────────────┐ │
│ │                   │                                    │ │
│ │                   │                                    │ │
│ │     좌측 영상     │◀═══ 슬라이더 ═══▶   우측 영상     │ │
│ │                   │                                    │ │
│ │                   │                                    │ │
│ └───────────────────┴────────────────────────────────────┘ │
│                                                            │
│                    [▶] 00:15 / 02:30                       │
│ ├─────────●───────────────────────────────────────────────┤ │
│                                                            │
│ [모드: 슬라이더 ▼]    [동기화: ON]    [전체화면]          │
└────────────────────────────────────────────────────────────┘

비교 모드:
1. 슬라이더: 좌우 드래그로 비교 (기본)
2. 나란히: 두 영상 나란히 표시 (기존)
3. 겹치기: 투명도 조절로 오버레이
4. 와이프: 대각선 와이프 효과

구현:

interface CompareProps {
  leftVideo: { url: string; label: string };
  rightVideo: { url: string; label: string };
  mode: 'slider' | 'side-by-side' | 'overlay' | 'wipe';
}

// 슬라이더 모드: CSS clip-path 사용
const SliderCompare = () => {
  const [sliderPosition, setSliderPosition] = useState(50);

  return (
    <div className="relative">
      {/* 우측 영상 (전체) */}
      <video className="w-full" ref={rightVideoRef} />

      {/* 좌측 영상 (클리핑) */}
      <video
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        ref={leftVideoRef}
      />

      {/* 슬라이더 핸들 */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleDragStart}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          ◀▶
        </div>
      </div>
    </div>
  );
};

기능:
1. 두 영상 동기화 재생
2. 슬라이더 드래그
3. 키보드로 슬라이더 이동 (←/→)
4. 동기화 ON/OFF
5. 전체화면 지원

요구사항:
1. 터치 디바이스 지원
2. 영상 로딩 동기화
3. 버퍼링 상태 표시
4. 성능 최적화 (requestAnimationFrame)
5. 모드 전환 시 재생 위치 유지
```

---

## 작업 6: 변경 구간 하이라이트

### 요청 내용

```
타임라인에 변경된 구간을 표시하는 기능을 구현해주세요.

기능:
1. 사용자가 수동으로 변경 구간 마킹
2. 타임라인에 색상 바로 표시
3. 클릭 시 해당 시점으로 이동

DB 스키마:

-- 00014_change_markers.sql
CREATE TABLE video_change_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES video_versions(id) ON DELETE CASCADE,
  compared_version_id UUID REFERENCES video_versions(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- 'visual', 'audio', 'text', 'effect', 'other'
  start_time FLOAT NOT NULL, -- 초 단위
  end_time FLOAT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_change_markers_version ON video_change_markers(version_id);

API:

# 변경 마커 목록
GET /api/videos/:videoId/versions/:versionId/markers
- response: { markers: ChangeMarker[] }

# 변경 마커 추가
POST /api/videos/:videoId/versions/:versionId/markers
- body: { type, start_time, end_time, description? }
- response: { marker: ChangeMarker }

# 변경 마커 삭제
DELETE /api/videos/:videoId/versions/:versionId/markers/:markerId
- response: { success: boolean }

UI:

타임라인 표시:
┌─────────────────────────────────────────────────────────┐
│ 0:00                                              2:30  │
│ ├────████────────████████────────███───────────────────┤ │
│      시각       효과            오디오                 │
└─────────────────────────────────────────────────────────┘

색상 코드:
- 시각 (visual): 파랑 (#3B82F6)
- 효과 (effect): 보라 (#8B5CF6)
- 오디오 (audio): 초록 (#10B981)
- 텍스트 (text): 노랑 (#F59E0B)
- 기타 (other): 회색 (#6B7280)

마커 추가 UI:
1. 영상 재생 중 "마커 추가" 버튼
2. 시작/종료 시간 드래그로 선택
3. 유형 선택 + 설명 입력
4. 저장

마커 상세 팝오버:
┌─────────────────────────────┐
│ 🎨 시각 변경                │
│ 00:15 ~ 00:25 (10초)        │
│                             │
│ 자막 위치 수정              │
│                             │
│ [이동]          [삭제]      │
└─────────────────────────────┘

요구사항:
1. 마커 hover 시 팝오버
2. 마커 클릭 시 해당 시점 이동
3. 마커 드래그로 위치/길이 조절
4. 필터: 유형별 표시/숨김
5. 영상 비교 모드와 연동
```

---

## 참조 파일

- `rules/CODING_STANDARDS.md` - 코딩 컨벤션
- `rules/DESIGN_SYSTEM.md` - 디자인 시스템
- `10_NAVIG_PRD_PHASE2-3_UNIFIED.md` - 통합 PRD 섹션 2.2

---

## 완료 기준

### 기능 체크리스트

**멀티 캔버스**
- [ ] DB 스키마 + 마이그레이션
- [ ] 보드 CRUD API
- [ ] 요소 CRUD API
- [ ] 캔버스 기본 기능 (줌/팬)
- [ ] 요소 추가 (이미지, 영상, 텍스트, 도형, 스티키)
- [ ] 요소 편집 (이동, 크기, 회전)
- [ ] 다중 선택
- [ ] 속성 패널
- [ ] Undo/Redo
- [ ] 공유 링크

**슬라이더 비교**
- [ ] 슬라이더 모드 구현
- [ ] 영상 동기화
- [ ] 모드 전환
- [ ] 터치 지원

**변경 마커**
- [ ] 마커 DB + API
- [ ] 타임라인 표시
- [ ] 마커 CRUD UI
- [ ] 필터 기능

### 품질 체크리스트

- [ ] 60fps 애니메이션
- [ ] 100개 요소 성능
- [ ] 반응형 (모바일 보기 전용)
- [ ] 영상 동기화 정확도
- [ ] 에러 핸들링
