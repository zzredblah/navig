# 알림 시스템 (Notification System)

NAVIG 프로젝트의 알림 시스템 사용 가이드

---

## 개요

알림 시스템은 사용자에게 중요한 이벤트를 실시간으로 알려주는 기능입니다.

### 주요 기능

1. **인앱 알림** - 헤더 알림 벨에 표시
2. **이메일 알림** - Resend를 통한 이메일 전송 ✅
3. **마감 알림** - D-3, D-1, D-day 자동 알림 ✅
4. **알림 설정** - 사용자별 알림 수신 설정

---

## API 엔드포인트

### 1. 알림 목록 조회

```http
GET /api/notifications?page=1&limit=20&unread_only=true
```

**Query Parameters:**
- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지당 개수 (기본값: 20, 최대: 100)
- `unread_only` (optional): 읽지 않은 알림만 조회 (true/false)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "new_feedback",
      "title": "새로운 피드백이 등록되었습니다",
      "content": "프로젝트 A에 새로운 피드백이 추가되었습니다",
      "link": "/projects/xxx/feedback/yyy",
      "metadata": { "project_id": "xxx", "feedback_id": "yyy" },
      "is_read": false,
      "created_at": "2026-01-27T10:00:00Z"
    }
  ],
  "total": 50,
  "unread_count": 5
}
```

---

### 2. 단일 알림 읽음 처리

```http
PATCH /api/notifications/[id]/read
```

**Response:**
```json
{
  "success": true
}
```

---

### 3. 전체 알림 읽음 처리

```http
PATCH /api/notifications/read-all
```

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

---

### 4. 알림 설정 조회

```http
GET /api/notification-settings
```

**Response:**
```json
{
  "settings": {
    "user_id": "uuid",
    "email_new_feedback": true,
    "email_urgent_feedback": true,
    "email_version_upload": true,
    "email_document_status": true,
    "email_deadline_reminder": true,
    "email_chat_message": false,
    "inapp_enabled": true,
    "created_at": "2026-01-27T10:00:00Z",
    "updated_at": "2026-01-27T10:00:00Z"
  }
}
```

---

### 5. 알림 설정 변경

```http
PATCH /api/notification-settings
Content-Type: application/json

{
  "email_new_feedback": false,
  "email_chat_message": true
}
```

**Response:**
```json
{
  "settings": {
    "user_id": "uuid",
    "email_new_feedback": false,
    "email_urgent_feedback": true,
    "email_version_upload": true,
    "email_document_status": true,
    "email_deadline_reminder": true,
    "email_chat_message": true,
    "inapp_enabled": true,
    "created_at": "2026-01-27T10:00:00Z",
    "updated_at": "2026-01-27T12:00:00Z"
  }
}
```

---

## 알림 타입 (NotificationType)

| 타입 | 설명 | 예시 |
|------|------|------|
| `new_feedback` | 새 피드백 등록 | "프로젝트 A에 새로운 피드백이 추가되었습니다" |
| `urgent_feedback` | 긴급 피드백 등록 | "긴급 피드백이 등록되었습니다" |
| `feedback_status` | 피드백 상태 변경 | "피드백이 완료 처리되었습니다" |
| `feedback_reply` | 피드백 답글 | "피드백에 새 답글이 달렸습니다" |
| `new_version` | 새 영상 버전 업로드 | "새로운 영상 버전이 업로드되었습니다" |
| `document_status` | 문서 상태 변경 | "문서가 승인되었습니다" |
| `project_invite` | 프로젝트 초대 | "프로젝트에 초대되었습니다" |
| `deadline_reminder` | 마감 알림 | "프로젝트 마감이 3일 남았습니다" |
| `chat_message` | 새 채팅 메시지 | "새로운 메시지가 도착했습니다" |

---

## NotificationService 사용법

### 기본 사용

```typescript
import { NotificationService } from '@/lib/notifications/service';

// 단일 사용자에게 알림 전송
await NotificationService.create({
  userId: 'user-id',
  type: 'new_feedback',
  title: '새로운 피드백이 등록되었습니다',
  content: '프로젝트 A에 새로운 피드백이 추가되었습니다',
  link: '/projects/xxx/feedback/yyy',
  metadata: {
    project_id: 'xxx',
    feedback_id: 'yyy',
  },
});
```

---

### 여러 사용자에게 동일한 알림 전송

```typescript
await NotificationService.createBulk(
  ['user-1', 'user-2', 'user-3'],
  {
    type: 'new_version',
    title: '새로운 영상 버전이 업로드되었습니다',
    content: '프로젝트 A의 v2.0이 업로드되었습니다',
    link: '/projects/xxx/videos/yyy',
  }
);
```

---

### 프로젝트 멤버 전체에게 알림 전송

```typescript
// 특정 사용자 제외 가능 (예: 본인)
await NotificationService.notifyProjectMembers(
  'project-id',
  {
    type: 'new_feedback',
    title: '새로운 피드백이 등록되었습니다',
    content: '김철수님이 새 피드백을 추가했습니다',
    link: '/projects/xxx/feedback/yyy',
  },
  'exclude-user-id' // 선택적
);
```

---

## 실제 사용 예시

### 1. 피드백 생성 시 알림

```typescript
// src/app/api/feedback/route.ts
import { NotificationService } from '@/lib/notifications/service';

export async function POST(request: NextRequest) {
  // ... 피드백 생성 로직 ...

  // 프로젝트 멤버들에게 알림 (작성자 제외)
  await NotificationService.notifyProjectMembers(
    feedback.project_id,
    {
      type: feedback.is_urgent ? 'urgent_feedback' : 'new_feedback',
      title: feedback.is_urgent
        ? '긴급 피드백이 등록되었습니다'
        : '새로운 피드백이 등록되었습니다',
      content: `${feedback.title}`,
      link: `/projects/${feedback.project_id}/feedback/${feedback.id}`,
      metadata: {
        project_id: feedback.project_id,
        feedback_id: feedback.id,
      },
    },
    user.id // 작성자 제외
  );

  return NextResponse.json({ data: feedback });
}
```

---

### 2. 영상 버전 업로드 시 알림

```typescript
// src/app/api/videos/route.ts
import { NotificationService } from '@/lib/notifications/service';

export async function POST(request: NextRequest) {
  // ... 영상 업로드 로직 ...

  // 프로젝트 멤버들에게 알림
  await NotificationService.notifyProjectMembers(
    video.project_id,
    {
      type: 'new_version',
      title: '새로운 영상 버전이 업로드되었습니다',
      content: `${video.title} v${video.version}`,
      link: `/projects/${video.project_id}/videos/${video.id}`,
      metadata: {
        project_id: video.project_id,
        video_id: video.id,
        version: video.version,
      },
    },
    user.id
  );

  return NextResponse.json({ data: video });
}
```

---

### 3. 문서 상태 변경 시 알림

```typescript
// src/app/api/documents/[id]/route.ts
import { NotificationService } from '@/lib/notifications/service';

export async function PATCH(request: NextRequest, { params }) {
  // ... 문서 상태 변경 로직 ...

  // 문서 작성자에게 알림
  await NotificationService.create({
    userId: document.created_by,
    type: 'document_status',
    title: `문서가 ${newStatus}되었습니다`,
    content: document.title,
    link: `/projects/${document.project_id}/documents/${document.id}`,
    metadata: {
      project_id: document.project_id,
      document_id: document.id,
      status: newStatus,
    },
  });

  return NextResponse.json({ data: document });
}
```

---

## 프론트엔드 연동 예시

### React Hook (useNotifications)

```typescript
// src/hooks/use-notifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useNotifications() {
  const queryClient = useQueryClient();

  // 알림 목록 조회
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=10');
      return res.json();
    },
    refetchInterval: 60000, // 1분마다 자동 갱신
  });

  // 단일 알림 읽음 처리
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // 전체 읽음 처리
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications: data?.data || [],
    unreadCount: data?.unread_count || 0,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}
```

---

### 알림 드롭다운 컴포넌트

```tsx
// src/components/notifications/NotificationDropdown.tsx
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-medium">알림</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
            >
              모두 읽음
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">알림이 없습니다</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => {
                  markAsRead.mutate(notification.id);
                  if (notification.link) {
                    window.location.href = notification.link;
                  }
                }}
                className={`w-full px-3 py-3 text-left hover:bg-gray-50 border-b ${
                  !notification.is_read ? 'bg-primary-50' : ''
                }`}
              >
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
                {notification.content && (
                  <p className="text-xs text-gray-600 mt-1">
                    {notification.content}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(notification.created_at).toLocaleString('ko-KR')}
                </p>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 보안 고려사항

1. **RLS (Row Level Security)**
   - 사용자는 자신의 알림만 조회/수정/삭제 가능
   - 알림 생성은 Admin 클라이언트만 가능 (서버 API에서)

2. **인증**
   - 모든 API는 인증된 사용자만 접근 가능

3. **데이터 검증**
   - Zod 스키마로 요청 데이터 검증

---

## 향후 개선 사항

1. **푸시 알림** - PWA 푸시 알림 (웹/모바일)
2. **알림 그룹화** - 유사한 알림 묶음 표시
3. **알림 필터링** - 타입별 필터링
4. **알림 삭제** - 개별/전체 삭제 기능

## 완료된 기능

- ✅ **실시간 알림** - Supabase Realtime 연동
- ✅ **이메일 알림** - Resend 연동, 알림 설정 반영
- ✅ **마감 알림 스케줄러** - D-3, D-1, D-day 자동 발송 (Vercel Cron)

---

## 문제 해결

### 알림이 생성되지 않음

1. `SUPABASE_SERVICE_ROLE_KEY` 환경 변수 확인
2. RLS 정책 확인 (서비스 역할만 INSERT 가능)
3. 서버 로그 확인 (`console.error`)

### 알림이 조회되지 않음

1. 인증 상태 확인
2. RLS 정책 확인 (자신의 알림만 조회 가능)
3. `user_id`가 올바른지 확인

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `src/types/notification.ts` | 타입 정의 |
| `src/lib/notifications/service.ts` | 알림 생성 서비스 |
| `src/lib/validations/notification.ts` | Zod 스키마 |
| `src/app/api/notifications/route.ts` | 알림 목록 API |
| `src/app/api/notifications/[id]/read/route.ts` | 단일 읽음 API |
| `src/app/api/notifications/read-all/route.ts` | 전체 읽음 API |
| `src/app/api/notification-settings/route.ts` | 설정 API |
| `supabase/migrations/00011_notifications.sql` | DB 스키마 |
