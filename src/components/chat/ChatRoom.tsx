'use client';

/**
 * 채팅방 메인 컴포넌트
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ArrowDown, Users, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import {
  ChatRoomWithDetails,
  ChatMessageWithDetails,
  ChatAttachment,
  formatMessageDate,
} from '@/types/chat';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatRoomProps {
  roomId: string;
  currentUserId: string;
}

export function ChatRoom({ roomId, currentUserId }: ChatRoomProps) {
  const [room, setRoom] = useState<ChatRoomWithDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [replyTo, setReplyTo] = useState<ChatMessageWithDetails | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 현재 사용자 프로필 조회
  const fetchCurrentUserProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserProfile({
          id: data.id,
          name: data.name,
          avatar_url: data.avatar_url,
        });
      }
    } catch (error) {
      console.error('프로필 조회 실패:', error);
    }
  }, []);

  // 채팅방 정보 조회
  const fetchRoom = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}`);
      if (response.ok) {
        const data = await response.json();
        setRoom(data.room);
      }
    } catch (error) {
      console.error('채팅방 조회 실패:', error);
    }
  }, [roomId]);

  // 메시지 조회
  const fetchMessages = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (isLoadMore && cursor) {
        params.set('cursor', cursor);
      }

      const response = await fetch(
        `/api/chat/rooms/${roomId}/messages?${params}`
      );
      if (response.ok) {
        const data = await response.json();

        if (isLoadMore) {
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
        }

        setHasMore(data.pagination.has_more);
        setCursor(data.pagination.cursor);
      }
    } catch (error) {
      console.error('메시지 조회 실패:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [roomId, cursor]);

  // 읽음 상태 업데이트
  const updateReadStatus = useCallback(async () => {
    try {
      await fetch(`/api/chat/rooms/${roomId}`, {
        method: 'PATCH',
      });
    } catch (error) {
      console.error('읽음 상태 업데이트 실패:', error);
    }
  }, [roomId]);

  // 초기 로드
  useEffect(() => {
    fetchCurrentUserProfile();
    fetchRoom();
    fetchMessages();
    updateReadStatus();
  }, [roomId]);

  // 실시간 구독
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat_room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMessage = payload.new as { id: string; sender_id: string };

          // 이미 존재하는 메시지인지 확인 (낙관적 업데이트 또는 중복)
          setMessages((prev) => {
            const exists = prev.some(
              (m) => m.id === newMessage.id || (m.id.startsWith('temp-') && m.sender_id === newMessage.sender_id)
            );
            if (exists) return prev;

            // 다른 사용자의 메시지일 때만 새로 가져옴
            return prev;
          });

          // 다른 사용자의 메시지만 fetch
          if (newMessage.sender_id !== currentUserId) {
            const response = await fetch(
              `/api/chat/rooms/${roomId}/messages?limit=1`
            );
            if (response.ok) {
              const data = await response.json();
              if (data.messages.length > 0) {
                setMessages((prev) => {
                  const exists = prev.some((m) => m.id === data.messages[0].id);
                  if (exists) return prev;
                  return [...prev, data.messages[0]];
                });
                scrollToBottom();
                updateReadStatus();
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const updatedMessage = payload.new as { id: string };
          // 메시지 업데이트 시 해당 메시지만 갱신
          const response = await fetch(
            `/api/chat/rooms/${roomId}/messages?limit=50`
          );
          if (response.ok) {
            const data = await response.json();
            setMessages(data.messages);
          }
        }
      )
      .subscribe((status) => {
        console.log('[ChatRoom] Realtime 구독 상태:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, currentUserId, updateReadStatus]);

  // 스크롤 관련
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);

    // 맨 위에 도달하면 이전 메시지 로드
    if (scrollTop < 100 && hasMore && !isLoadingMore) {
      fetchMessages(true);
    }
  };

  // 메시지 전송 (낙관적 업데이트)
  const handleSend = async (
    content: string,
    attachments?: ChatAttachment[],
    replyToId?: string
  ) => {
    // 임시 메시지 ID 생성
    const tempId = `temp-${Date.now()}`;

    // 낙관적 업데이트: 즉시 UI에 표시
    const optimisticMessage: ChatMessageWithDetails = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUserId,
      content,
      reply_to_id: replyToId || null,
      mentions: [],
      attachments: attachments || [],
      is_edited: false,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: currentUserProfile || { id: currentUserId, name: '나', avatar_url: null },
      reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          attachments,
          reply_to_id: replyToId,
        }),
      });

      if (!response.ok) {
        // 실패 시 임시 메시지 제거
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw new Error('메시지 전송 실패');
      }

      const data = await response.json();

      // 서버 응답으로 임시 메시지 교체
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data.message : m))
      );
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      // 임시 메시지 제거
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      throw error;
    }
  };

  // 메시지 수정
  const handleEdit = async (messageId: string, content: string) => {
    await fetch(`/api/chat/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  };

  // 메시지 삭제
  const handleDelete = async (messageId: string) => {
    if (!confirm('메시지를 삭제하시겠습니까?')) return;

    await fetch(`/api/chat/messages/${messageId}`, {
      method: 'DELETE',
    });
  };

  // 리액션 추가 (낙관적 업데이트)
  const handleReaction = async (messageId: string, emoji: string) => {
    // 낙관적 업데이트: UI 즉시 반영
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const existingReaction = msg.reactions?.find((r) => r.emoji === emoji);
        if (existingReaction) {
          // 이미 있는 이모지에 내가 추가
          if (existingReaction.reacted_by_me) return msg; // 이미 반응함
          return {
            ...msg,
            reactions: msg.reactions?.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, reacted_by_me: true }
                : r
            ),
          };
        } else {
          // 새 이모지 추가
          return {
            ...msg,
            reactions: [
              ...(msg.reactions || []),
              { emoji, count: 1, users: [], reacted_by_me: true },
            ],
          };
        }
      })
    );

    // 서버에 요청 (백그라운드)
    try {
      await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
    } catch (error) {
      console.error('리액션 추가 실패:', error);
      // 실패 시 롤백 (선택적)
    }
  };

  // 리액션 제거 (낙관적 업데이트)
  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    // 낙관적 업데이트: UI 즉시 반영
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const updatedReactions = msg.reactions
          ?.map((r) => {
            if (r.emoji !== emoji) return r;
            if (r.count <= 1) return null; // 삭제
            return { ...r, count: r.count - 1, reacted_by_me: false };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);
        return { ...msg, reactions: updatedReactions };
      })
    );

    // 서버에 요청 (백그라운드)
    try {
      await fetch(
        `/api/chat/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`,
        { method: 'DELETE' }
      );
    } catch (error) {
      console.error('리액션 제거 실패:', error);
      // 실패 시 롤백 (선택적)
    }
  };

  // 날짜 구분선을 위한 메시지 그룹화
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessageWithDetails[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* 헤더 */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white shrink-0">
        {room?.type === 'direct' && room.otherUser ? (
          <Avatar className="h-10 w-10">
            <AvatarImage src={room.otherUser.avatar_url || undefined} />
            <AvatarFallback className="bg-primary-100 text-primary-700">
              {room.otherUser.name?.slice(0, 2) || 'U'}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-gray-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">
            {room?.type === 'project'
              ? room.project?.title || room.project?.name || '프로젝트 채팅'
              : room?.name || room?.otherUser?.name || 'DM'}
          </h2>
          {room?.members && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Users className="h-3 w-3" />
              {room.members.length}명 참여
            </p>
          )}
        </div>
      </div>

      {/* 메시지 목록 */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin min-h-0"
      >
        {/* 이전 메시지 로드 중 */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}

        {/* 메시지 없음 */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-1">아직 메시지가 없습니다</p>
            <p className="text-sm text-gray-400">
              첫 번째 메시지를 보내보세요!
            </p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* 날짜 구분선 */}
              <div className="flex items-center justify-center my-4">
                <div className="flex-1 border-t border-gray-200" />
                <span className="px-3 text-xs text-gray-400">
                  {formatMessageDate(msgs[0].created_at)}
                </span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* 메시지들 */}
              {msgs.map((message, index) => {
                // 이전 메시지와 같은 발신자인지 확인 (연속 메시지 그룹화)
                const prevMessage = index > 0 ? msgs[index - 1] : null;
                const isSameSender = prevMessage?.sender_id === message.sender_id;
                // 5분 이내 연속 메시지만 그룹화
                const isWithinTimeWindow = prevMessage
                  ? new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 5 * 60 * 1000
                  : false;
                const showProfile = !isSameSender || !isWithinTimeWindow;

                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    currentUserId={currentUserId}
                    showProfile={showProfile}
                    onReply={setReplyTo}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onReaction={handleReaction}
                    onRemoveReaction={handleRemoveReaction}
                  />
                );
              })}
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 스크롤 버튼 */}
      {showScrollButton && (
        <div className="absolute bottom-20 right-4 z-10">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full shadow-lg"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 입력 */}
      <div className="shrink-0">
        <ChatInput
          roomId={roomId}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
