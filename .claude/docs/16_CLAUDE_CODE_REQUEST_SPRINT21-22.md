# Claude Code 개발 요청서 - Phase 3 Sprint 21-22

## 실시간 협업 + 다국어

**기간**: Week 5-8 (Month 9-10)
**목표**: 캔버스 실시간 공동 편집, 커서 표시, 다국어 지원 (영어, 일본어)

---

## 작업 1: 실시간 협업 기반 구축

### 요청 내용

```
Yjs(CRDT)와 Supabase Realtime을 활용한 실시간 협업 기반을 구축해주세요.

패키지 설치:
npm install yjs y-protocols @supabase/realtime-js

아키텍처:

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client A  │────▶│  Supabase   │◀────│   Client B  │
│   (Yjs)     │     │  Realtime   │     │   (Yjs)     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Y.Doc     │
                    │ (공유 상태)  │
                    └─────────────┘

Supabase Realtime Provider:

// lib/collaboration/SupabaseProvider.ts
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { createClient } from '@/lib/supabase/client';

export class SupabaseProvider {
  private doc: Y.Doc;
  private awareness: Awareness;
  private channel: RealtimeChannel;
  private supabase: SupabaseClient;

  constructor(
    roomName: string,
    doc: Y.Doc,
    options?: { awareness?: boolean }
  ) {
    this.doc = doc;
    this.supabase = createClient();
    this.awareness = new Awareness(doc);

    // Realtime 채널 설정
    this.channel = this.supabase.channel(`yjs:${roomName}`, {
      config: { broadcast: { self: false } },
    });

    // 문서 변경 구독
    this.doc.on('update', this.handleDocUpdate.bind(this));

    // Awareness 변경 구독
    if (options?.awareness) {
      this.awareness.on('change', this.handleAwarenessChange.bind(this));
    }

    // 채널 이벤트 핸들러
    this.channel
      .on('broadcast', { event: 'sync' }, this.handleSync.bind(this))
      .on('broadcast', { event: 'update' }, this.handleUpdate.bind(this))
      .on('broadcast', { event: 'awareness' }, this.handleAwareness.bind(this))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.requestSync();
        }
      });
  }

  private handleDocUpdate(update: Uint8Array, origin: unknown) {
    if (origin === this) return; // 자신의 업데이트는 무시

    this.channel.send({
      type: 'broadcast',
      event: 'update',
      payload: { update: Array.from(update) },
    });
  }

  private handleUpdate(payload: { update: number[] }) {
    const update = new Uint8Array(payload.update);
    Y.applyUpdate(this.doc, update, this);
  }

  private handleAwarenessChange() {
    const states = this.awareness.getStates();
    this.channel.send({
      type: 'broadcast',
      event: 'awareness',
      payload: { states: Object.fromEntries(states) },
    });
  }

  private handleAwareness(payload: { states: Record<string, unknown> }) {
    // Awareness 상태 업데이트
    Object.entries(payload.states).forEach(([clientId, state]) => {
      this.awareness.setLocalStateField(clientId, state);
    });
  }

  setLocalState(state: Record<string, unknown>) {
    this.awareness.setLocalState(state);
  }

  destroy() {
    this.doc.off('update', this.handleDocUpdate);
    this.awareness.destroy();
    this.channel.unsubscribe();
  }
}

사용 예시:

// hooks/useCollaboration.ts
import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { SupabaseProvider } from '@/lib/collaboration/SupabaseProvider';

export function useCollaboration(boardId: string, user: User) {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SupabaseProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    const doc = new Y.Doc();
    const provider = new SupabaseProvider(`board:${boardId}`, doc, {
      awareness: true,
    });

    // 로컬 상태 설정
    provider.setLocalState({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar_url,
        color: getRandomColor(),
      },
      cursor: null,
      selection: [],
    });

    docRef.current = doc;
    providerRef.current = provider;
    setIsConnected(true);

    return () => {
      provider.destroy();
      doc.destroy();
    };
  }, [boardId, user]);

  const updateCursor = (position: { x: number; y: number } | null) => {
    providerRef.current?.setLocalState({
      cursor: position,
    });
  };

  const updateSelection = (elementIds: string[]) => {
    providerRef.current?.setLocalState({
      selection: elementIds,
    });
  };

  return {
    doc: docRef.current,
    isConnected,
    collaborators,
    updateCursor,
    updateSelection,
  };
}

요구사항:
1. 연결 상태 표시
2. 재연결 로직
3. 오프라인 지원 (로컬 저장 후 동기화)
4. 충돌 해결 (CRDT 기반)
5. 성능 최적화 (배치 업데이트)
```

---

## 작업 2: 캔버스 공동 편집

### 요청 내용

```
Sprint 13-14에서 만든 멀티 캔버스에 실시간 공동 편집 기능을 추가해주세요.

공유 상태 구조:

// Y.Doc 내 데이터 구조
const elements = doc.getMap<BoardElement>('elements');
const metadata = doc.getMap('metadata'); // 보드 메타데이터

// 요소 추가
elements.set(elementId, {
  id: elementId,
  type: 'image',
  position: { x: 100, y: 200 },
  size: { width: 300, height: 200 },
  // ...
});

// 요소 수정
const element = elements.get(elementId);
if (element) {
  element.position = { x: 150, y: 250 };
  elements.set(elementId, element);
}

// 요소 삭제
elements.delete(elementId);

캔버스 컴포넌트 수정:

// components/board/CollaborativeCanvas.tsx
export function CollaborativeCanvas({ boardId }: Props) {
  const { user } = useAuth();
  const {
    doc,
    isConnected,
    collaborators,
    updateCursor,
    updateSelection,
  } = useCollaboration(boardId, user);

  const [elements, setElements] = useState<BoardElement[]>([]);

  // Yjs 데이터 구독
  useEffect(() => {
    if (!doc) return;

    const elementsMap = doc.getMap<BoardElement>('elements');

    const updateElements = () => {
      const newElements = Array.from(elementsMap.values());
      setElements(newElements);
    };

    elementsMap.observe(updateElements);
    updateElements();

    return () => elementsMap.unobserve(updateElements);
  }, [doc]);

  // 마우스 이동 시 커서 위치 공유
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (point) {
      updateCursor(point);
    }
  }, [updateCursor]);

  // 마우스 나갈 때 커서 숨김
  const handleMouseLeave = useCallback(() => {
    updateCursor(null);
  }, [updateCursor]);

  // 요소 선택 시 공유
  const handleSelect = useCallback((elementIds: string[]) => {
    updateSelection(elementIds);
  }, [updateSelection]);

  // 요소 변경 (이동, 크기 등)
  const handleElementChange = useCallback((
    elementId: string,
    changes: Partial<BoardElement>
  ) => {
    if (!doc) return;

    const elementsMap = doc.getMap<BoardElement>('elements');
    const element = elementsMap.get(elementId);

    if (element) {
      elementsMap.set(elementId, { ...element, ...changes });
    }
  }, [doc]);

  return (
    <div className="relative w-full h-full">
      {/* 연결 상태 */}
      <ConnectionStatus isConnected={isConnected} />

      {/* 협업자 아바타 */}
      <CollaboratorAvatars collaborators={collaborators} />

      {/* 캔버스 */}
      <Stage
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <Layer>
          {/* 요소 렌더링 */}
          {elements.map((element) => (
            <CanvasElement
              key={element.id}
              element={element}
              isSelected={selectedIds.includes(element.id)}
              isLockedByOther={isLockedByOther(element.id)}
              onSelect={() => handleSelect([element.id])}
              onChange={(changes) => handleElementChange(element.id, changes)}
            />
          ))}

          {/* 다른 사용자 커서 */}
          {collaborators.map((collab) => (
            collab.cursor && (
              <CollaboratorCursor
                key={collab.user.id}
                position={collab.cursor}
                user={collab.user}
              />
            )
          ))}

          {/* 다른 사용자 선택 영역 */}
          {collaborators.map((collab) => (
            collab.selection.map((elementId) => (
              <SelectionOverlay
                key={`${collab.user.id}-${elementId}`}
                elementId={elementId}
                color={collab.user.color}
                userName={collab.user.name}
              />
            ))
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

충돌 방지:

// 다른 사용자가 선택한 요소는 편집 불가
const isLockedByOther = (elementId: string): boolean => {
  return collaborators.some(
    (c) => c.user.id !== user.id && c.selection.includes(elementId)
  );
};

// 요소 선택 시 잠금 표시
<CanvasElement
  isLockedByOther={isLockedByOther(element.id)}
  lockedBy={getLockedByUser(element.id)}
/>

요구사항:
1. 실시간 요소 동기화
2. 충돌 방지 (선택한 요소 잠금)
3. 커서 공유
4. 선택 영역 공유
5. 연결 끊김 시 로컬 저장
6. 재연결 시 동기화
```

---

## 작업 3: 실시간 커서 표시

### 요청 내용

```
다른 사용자의 커서를 실시간으로 표시하는 기능을 구현해주세요.

커서 컴포넌트:

// components/board/CollaboratorCursor.tsx
interface CollaboratorCursorProps {
  position: { x: number; y: number };
  user: {
    id: string;
    name: string;
    color: string;
  };
}

export function CollaboratorCursor({ position, user }: CollaboratorCursorProps) {
  return (
    <Group x={position.x} y={position.y}>
      {/* 커서 아이콘 */}
      <Path
        data="M0 0 L0 16 L4 12 L8 20 L12 18 L8 10 L14 10 Z"
        fill={user.color}
        stroke="white"
        strokeWidth={1}
      />

      {/* 사용자 이름 */}
      <Label offsetX={-16} offsetY={-8}>
        <Tag
          fill={user.color}
          cornerRadius={4}
          pointerDirection="left"
          pointerWidth={6}
          pointerHeight={6}
        />
        <Text
          text={user.name}
          fontFamily="sans-serif"
          fontSize={12}
          padding={4}
          fill="white"
        />
      </Label>
    </Group>
  );
}

커서 스무딩 (부드러운 움직임):

// hooks/useSmoothCursor.ts
export function useSmoothCursor(targetPosition: Position | null) {
  const [smoothPosition, setSmoothPosition] = useState<Position | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!targetPosition) {
      setSmoothPosition(null);
      return;
    }

    const animate = () => {
      setSmoothPosition((prev) => {
        if (!prev) return targetPosition;

        const dx = targetPosition.x - prev.x;
        const dy = targetPosition.y - prev.y;

        // 거리가 작으면 바로 이동
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
          return targetPosition;
        }

        // 선형 보간
        return {
          x: prev.x + dx * 0.3,
          y: prev.y + dy * 0.3,
        };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetPosition]);

  return smoothPosition;
}

협업자 아바타 목록:

// components/board/CollaboratorAvatars.tsx
export function CollaboratorAvatars({ collaborators }: Props) {
  return (
    <div className="absolute top-4 right-4 flex -space-x-2 z-50">
      {collaborators.slice(0, 5).map((collab) => (
        <div
          key={collab.user.id}
          className="relative"
          title={collab.user.name}
        >
          <Avatar
            className="border-2"
            style={{ borderColor: collab.user.color }}
          >
            <AvatarImage src={collab.user.avatar} />
            <AvatarFallback style={{ backgroundColor: collab.user.color }}>
              {collab.user.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          {/* 활동 표시 (현재 작업 중) */}
          {collab.cursor && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white animate-pulse"
              style={{ backgroundColor: collab.user.color }}
            />
          )}
        </div>
      ))}

      {collaborators.length > 5 && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
          +{collaborators.length - 5}
        </div>
      )}
    </div>
  );
}

요구사항:
1. 커서 애니메이션 (부드러운 움직임)
2. 사용자별 색상
3. 이름 라벨
4. 커서 페이드아웃 (일정 시간 비활성)
5. 성능 최적화 (throttle)
```

---

## 작업 4: 다국어 지원 (i18n)

### 요청 내용

```
next-intl을 사용하여 영어, 일본어 지원을 구현해주세요.

패키지 설치:
npm install next-intl

폴더 구조:

messages/
├── ko.json
├── en.json
└── ja.json

src/
├── i18n/
│   ├── config.ts
│   └── request.ts
└── middleware.ts (수정)

설정:

// i18n/config.ts
export const locales = ['ko', 'en', 'ja'] as const;
export const defaultLocale = 'ko' as const;

export type Locale = (typeof locales)[number];

// i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export default getRequestConfig(async () => {
  // 1. 쿠키에서 언어 확인
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value;

  // 2. Accept-Language 헤더 확인
  const headerLocale = headers().get('accept-language')?.split(',')[0].split('-')[0];

  // 3. 기본값
  const locale = cookieLocale || headerLocale || 'ko';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // URL에 기본 언어는 표시 안함
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};

번역 파일:

// messages/ko.json
{
  "common": {
    "save": "저장",
    "cancel": "취소",
    "delete": "삭제",
    "edit": "수정",
    "create": "만들기",
    "search": "검색",
    "loading": "로딩 중...",
    "error": "오류가 발생했습니다"
  },
  "auth": {
    "login": "로그인",
    "logout": "로그아웃",
    "signup": "회원가입",
    "email": "이메일",
    "password": "비밀번호",
    "forgotPassword": "비밀번호를 잊으셨나요?"
  },
  "dashboard": {
    "title": "대시보드",
    "totalProjects": "전체 프로젝트",
    "inProgress": "진행중",
    "completed": "완료",
    "urgent": "긴급"
  },
  "projects": {
    "title": "프로젝트",
    "newProject": "새 프로젝트",
    "noProjects": "프로젝트가 없습니다",
    "createFirst": "첫 프로젝트를 만들어보세요"
  },
  "feedback": {
    "title": "피드백",
    "addFeedback": "피드백 추가",
    "resolve": "해결",
    "unresolve": "미해결로 변경",
    "reply": "답글"
  }
}

// messages/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "loading": "Loading...",
    "error": "An error occurred"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "signup": "Sign up",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot your password?"
  },
  "dashboard": {
    "title": "Dashboard",
    "totalProjects": "Total Projects",
    "inProgress": "In Progress",
    "completed": "Completed",
    "urgent": "Urgent"
  },
  // ...
}

// messages/ja.json
{
  "common": {
    "save": "保存",
    "cancel": "キャンセル",
    "delete": "削除",
    "edit": "編集",
    "create": "作成",
    "search": "検索",
    "loading": "読み込み中...",
    "error": "エラーが発生しました"
  },
  // ...
}

컴포넌트에서 사용:

// Server Component
import { useTranslations } from 'next-intl';

export default function Dashboard() {
  const t = useTranslations('dashboard');

  return (
    <div>
      <h1>{t('title')}</h1>
      <StatCard label={t('totalProjects')} value={45} />
    </div>
  );
}

// Client Component
'use client';
import { useTranslations } from 'next-intl';

export function ProjectCard() {
  const t = useTranslations('projects');

  return (
    <Card>
      <Button>{t('newProject')}</Button>
    </Card>
  );
}

언어 전환 UI:

// components/LanguageSwitcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';

const languages = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const changeLanguage = (newLocale: string) => {
    Cookies.set('NEXT_LOCALE', newLocale, { expires: 365 });
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {languages.find((l) => l.code === locale)?.flag}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={locale === lang.code ? 'bg-gray-100' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

요구사항:
1. 모든 UI 텍스트 번역
2. 날짜/시간 포맷 로케일화
3. 숫자 포맷 로케일화
4. 언어 자동 감지
5. 언어 설정 저장 (쿠키)
6. SEO 대응 (hreflang)
```

---

## 참조 파일

- `rules/CODING_STANDARDS.md` - 코딩 컨벤션
- `rules/DESIGN_SYSTEM.md` - 디자인 시스템
- `10_NAVIG_PRD_PHASE2-3_UNIFIED.md` - 통합 PRD 섹션 3.2
- Yjs 문서: https://docs.yjs.dev/
- next-intl 문서: https://next-intl-docs.vercel.app/

---

## 완료 기준

### 기능 체크리스트

**실시간 협업 기반**
- [ ] SupabaseProvider 구현
- [ ] Yjs 연동
- [ ] 연결 상태 관리
- [ ] 재연결 로직

**캔버스 공동 편집**
- [ ] 실시간 요소 동기화
- [ ] 충돌 방지 (잠금)
- [ ] 오프라인 지원
- [ ] 재동기화

**커서 표시**
- [ ] 커서 컴포넌트
- [ ] 스무딩 애니메이션
- [ ] 협업자 아바타
- [ ] 활동 표시

**다국어**
- [ ] next-intl 설정
- [ ] 한국어 번역
- [ ] 영어 번역
- [ ] 일본어 번역
- [ ] 언어 전환 UI
- [ ] 날짜/숫자 포맷

### 품질 체크리스트

- [ ] 실시간 동기화 안정성
- [ ] 성능 최적화
- [ ] 번역 누락 체크
- [ ] 에러 핸들링
