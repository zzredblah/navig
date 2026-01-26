'use client';

/**
 * 개별 채팅방 페이지 - URL로 직접 접근 시
 * 모바일: 채팅만 표시 + 뒤로가기
 * 데스크톱: 분할 레이아웃 (목록 왼쪽, 채팅 오른쪽)
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageSquare, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { ChatRoomList } from '@/components/chat/ChatRoomList';
import { NewChatModal } from '@/components/chat/NewChatModal';
import { createClient } from '@/lib/supabase/client';

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const initialRoomId = params.id as string;

  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRoomId);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // URL 파라미터가 변경되면 selectedRoomId 업데이트
  useEffect(() => {
    setSelectedRoomId(initialRoomId);
  }, [initialRoomId]);

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    router.push(`/chat/${roomId}`, { scroll: false });
  };

  const handleChatCreated = (roomId: string) => {
    setRefreshKey((prev) => prev + 1);
    setSelectedRoomId(roomId);
    router.push(`/chat/${roomId}`, { scroll: false });
  };

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      {/* 왼쪽: 채팅방 목록 - 데스크톱에서만 표시 */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 flex-col hidden md:flex">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary-600" />
            <h1 className="font-semibold text-gray-900">채팅</h1>
          </div>
          <Button
            size="sm"
            onClick={() => setIsNewChatOpen(true)}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            새 대화
          </Button>
        </div>

        {/* 채팅방 목록 */}
        <div className="flex-1 overflow-hidden">
          <ChatRoomList
            key={refreshKey}
            onRoomSelect={handleRoomSelect}
            selectedRoomId={selectedRoomId}
          />
        </div>
      </div>

      {/* 오른쪽: 채팅 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 모바일 헤더 */}
        <div className="flex items-center gap-2 p-2 border-b border-gray-200 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/chat')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsNewChatOpen(true)}
            className="ml-auto"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* 채팅방 */}
        <div className="flex-1 overflow-hidden">
          <ChatRoom
            key={selectedRoomId}
            roomId={selectedRoomId}
            currentUserId={currentUserId}
          />
        </div>
      </div>

      {/* 새 채팅 모달 */}
      <NewChatModal
        open={isNewChatOpen}
        onOpenChange={setIsNewChatOpen}
        onChatCreated={handleChatCreated}
      />
    </div>
  );
}
