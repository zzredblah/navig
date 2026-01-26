'use client';

/**
 * 채팅 메인 페이지 - 분할 레이아웃
 * 왼쪽: 채팅방 목록, 오른쪽: 채팅 (미선택 시 안내)
 * 모바일: 목록만 표시, 선택 시 채팅 페이지로 이동
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatRoomList } from '@/components/chat/ChatRoomList';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { NewChatModal } from '@/components/chat/NewChatModal';
import { createClient } from '@/lib/supabase/client';

export default function ChatPage() {
  const router = useRouter();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    // 모바일에서는 URL 변경하여 채팅방 페이지로 이동
    if (isMobile) {
      router.push(`/chat/${roomId}`);
    }
  };

  const handleChatCreated = (roomId: string) => {
    setRefreshKey((prev) => prev + 1);
    setSelectedRoomId(roomId);
    if (isMobile) {
      router.push(`/chat/${roomId}`);
    }
  };

  const handleBackToList = () => {
    setSelectedRoomId(null);
  };

  return (
    <div className="flex h-full bg-white">
      {/* 왼쪽: 채팅방 목록 - 데스크톱 또는 모바일에서 채팅방 미선택 시 */}
      <div className={`
        ${isMobile && selectedRoomId ? 'hidden' : 'flex'}
        ${isMobile ? 'w-full' : 'w-80'}
        flex-shrink-0 border-r border-gray-200 flex-col
      `}>
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

      {/* 오른쪽: 채팅 영역 - 데스크톱 또는 모바일에서 채팅방 선택 시 */}
      <div className={`
        ${isMobile && !selectedRoomId ? 'hidden' : 'flex'}
        flex-1 flex-col min-w-0
      `}>
        {selectedRoomId && currentUserId ? (
          <>
            {/* 모바일 뒤로가기 버튼 */}
            {isMobile && (
              <div className="flex items-center gap-2 p-2 border-b border-gray-200 md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToList}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  목록
                </Button>
              </div>
            )}
            <ChatRoom
              key={selectedRoomId}
              roomId={selectedRoomId}
              currentUserId={currentUserId}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gray-50">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              채팅을 시작하세요
            </h2>
            <p className="text-gray-500 text-center mb-6 max-w-sm">
              왼쪽 목록에서 채팅방을 선택하거나
              <br />
              새 대화를 시작하세요
            </p>
            <Button
              onClick={() => setIsNewChatOpen(true)}
              className="bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              새 대화 시작
            </Button>
          </div>
        )}
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
