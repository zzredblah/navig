'use client';

/**
 * 채팅방 메인 컴포넌트
 */

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Loader2, ArrowDown, Users, FolderOpen, MoreVertical, LogOut, Trash2, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
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
import { playSound } from '@/lib/sounds';

interface ChatRoomProps {
  roomId: string;
  currentUserId?: string;
  onBack?: () => void;
  isPanel?: boolean;
}

export function ChatRoom({ roomId, currentUserId: propUserId, onBack, isPanel = false }: ChatRoomProps) {
  const [currentUserId, setCurrentUserId] = useState<string>(propUserId || '');
  const [room, setRoom] = useState<ChatRoomWithDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserLoaded, setIsUserLoaded] = useState(!!propUserId); // 사용자 정보 로드 완료
  const [isReady, setIsReady] = useState(false); // 로딩 완료 + 스크롤 완료
  const [newMessageCount, setNewMessageCount] = useState(0); // 새 메시지 알림용
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

  // 선택 모드 관련 상태
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteTypeDialog, setShowDeleteTypeDialog] = useState(false);
  const [deleteAllMode, setDeleteAllMode] = useState(false); // 전체 삭제 모드인지

  // 드래그 앤 드롭 관련 상태
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const dragCounterRef = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const shouldScrollToBottomRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);

  // 현재 사용자 프로필 조회
  const fetchCurrentUserProfile = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const json = await response.json();
        const profile = json.data; // API는 { data: profile } 형태로 반환
        if (profile) {
          setCurrentUserProfile({
            id: profile.id,
            name: profile.name,
            avatar_url: profile.avatar_url,
          });
          if (!propUserId && profile.id) {
            setCurrentUserId(profile.id);
          }
          return profile.id || null;
        }
      }
    } catch (error) {
      console.error('프로필 조회 실패:', error);
    }
    return null;
  }, [propUserId]);

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

  // 스크롤을 맨 아래로 이동 (즉시)
  const scrollToBottomInstant = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // 스크롤을 맨 아래로 이동 (부드럽게)
  const scrollToBottomSmooth = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // 메시지 읽음 처리 (KakaoTalk 스타일)
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    try {
      await fetch(`/api/chat/rooms/${roomId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_ids: messageIds }),
      });
    } catch (error) {
      console.error('메시지 읽음 처리 실패:', error);
    }
  }, [roomId]);

  // 메시지 조회
  const fetchMessages = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('limit', isLoadMore ? '20' : '30');
      if (isLoadMore && cursor) {
        params.set('cursor', cursor);
      }

      const response = await fetch(
        `/api/chat/rooms/${roomId}/messages?${params}`
      );
      if (response.ok) {
        const data = await response.json();

        if (isLoadMore) {
          const container = messagesContainerRef.current;
          const prevScrollHeight = container?.scrollHeight || 0;

          setMessages((prev) => [...data.messages, ...prev]);

          // 스크롤 위치 복원
          requestAnimationFrame(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - prevScrollHeight;
            }
          });

          // 로드한 메시지 읽음 처리
          const newMessageIds = data.messages
            .filter((m: { sender_id: string }) => m.sender_id !== currentUserId)
            .map((m: { id: string }) => m.id);
          if (newMessageIds.length > 0) {
            markMessagesAsRead(newMessageIds);
          }
        } else {
          setMessages(data.messages);
          shouldScrollToBottomRef.current = true;

          // 초기 로드 시 다른 사람 메시지 읽음 처리
          const otherMessageIds = data.messages
            .filter((m: { sender_id: string }) => m.sender_id !== currentUserId)
            .map((m: { id: string }) => m.id);
          if (otherMessageIds.length > 0) {
            markMessagesAsRead(otherMessageIds);
          }
        }

        setHasMore(data.pagination.has_more);
        setCursor(data.pagination.cursor);
      }
    } catch (error) {
      console.error('메시지 조회 실패:', error);
    } finally {
      if (isLoadMore) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [roomId, cursor, currentUserId, markMessagesAsRead]);

  // 읽음 상태 업데이트
  const updateReadStatus = useCallback(async () => {
    try {
      await fetch(`/api/chat/rooms/${roomId}`, {
        method: 'PATCH',
      });
      // 헤더의 unread count 배지 갱신을 위해 커스텀 이벤트 발생
      window.dispatchEvent(new CustomEvent('chat-read-update'));
    } catch (error) {
      console.error('읽음 상태 업데이트 실패:', error);
    }
  }, [roomId]);

  // 초기 로드
  useEffect(() => {
    let cancelled = false;

    const initChat = async () => {
      setIsLoading(true);
      setIsReady(false);
      setIsUserLoaded(!!propUserId);
      setMessages([]);
      setCursor(undefined);
      setNewMessageCount(0);
      prevMessagesLengthRef.current = 0;

      // 사용자 정보를 먼저 가져옴 (await으로 완료 대기)
      if (!propUserId) {
        try {
          const response = await fetch('/api/profile');
          if (response.ok && !cancelled) {
            const json = await response.json();
            const profile = json.data; // API는 { data: profile } 형태로 반환
            if (profile) {
              setCurrentUserProfile({
                id: profile.id,
                name: profile.name,
                avatar_url: profile.avatar_url,
              });
              if (profile.id) {
                setCurrentUserId(profile.id);
              }
            }
          }
        } catch (error) {
          console.error('프로필 조회 실패:', error);
        }
        if (!cancelled) {
          setIsUserLoaded(true);
        }
      }

      if (cancelled) return;

      // 채팅방 정보와 메시지 로드
      fetchRoom();
      fetchMessages();
      updateReadStatus();
    };

    initChat();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // 메시지 로드 후 스크롤 처리 (useLayoutEffect로 DOM 업데이트 직후 실행)
  useLayoutEffect(() => {
    // 초기 로드 시 스크롤
    if (shouldScrollToBottomRef.current && !isLoading && messages.length > 0) {
      // 즉시 스크롤 시도
      scrollToBottomInstant();
      shouldScrollToBottomRef.current = false;

      // DOM 렌더링 완료 대기 후 다시 한번 스크롤 (확실히 하기 위해)
      requestAnimationFrame(() => {
        scrollToBottomInstant();
        requestAnimationFrame(() => {
          scrollToBottomInstant();
          setIsReady(true);
        });
      });
    }
  }, [messages, isLoading, scrollToBottomInstant]);

  // 새 메시지 추가 시 자동 스크롤 (내가 보낸 메시지)
  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !isReady) return;

    // 메시지가 추가됨
    if (messages.length > prevMessagesLengthRef.current) {
      const lastMessage = messages[messages.length - 1];
      // 내가 보낸 메시지이거나 스크롤이 하단 근처에 있으면 스크롤
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

      if (lastMessage?.sender_id === currentUserId || isNearBottom) {
        // DOM 업데이트 완료 후 스크롤
        requestAnimationFrame(() => {
          scrollToBottomInstant();
        });
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, currentUserId, isReady, scrollToBottomInstant]);

  // 메시지가 없는 경우도 ready로 전환 + 안전장치
  useEffect(() => {
    if (!isLoading && !isReady) {
      // 메시지가 없거나 이미 스크롤 처리가 완료된 경우
      if (messages.length === 0) {
        setIsReady(true);
      } else {
        // 메시지가 있는데 isReady가 안됐으면 (useLayoutEffect가 안 돌았으면) 강제로 스크롤
        const scrollWithRetry = () => {
          scrollToBottomInstant();
          // 100ms 후 다시 한번 스크롤 (이미지/미디어 로딩 등으로 인한 높이 변화 대응)
          setTimeout(() => {
            scrollToBottomInstant();
            setIsReady(true);
          }, 100);
        };
        requestAnimationFrame(scrollWithRetry);
      }
    }
  }, [isLoading, isReady, messages.length, scrollToBottomInstant]);

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

                // 채팅 알림음 재생 (다른 사용자의 메시지)
                playSound('chat');

                // 스크롤이 하단 근처인지 확인
                const container = messagesContainerRef.current;
                if (container) {
                  const { scrollTop, scrollHeight, clientHeight } = container;
                  const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

                  if (isNearBottom) {
                    // 하단 근처면 자동 스크롤 + 메시지 읽음 처리
                    requestAnimationFrame(() => {
                      scrollToBottomSmooth();
                    });
                    updateReadStatus();
                    markMessagesAsRead([newMessage.id]);
                  } else {
                    // 위에 있으면 새 메시지 카운트 증가
                    setNewMessageCount((prev) => prev + 1);
                  }
                }
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
        async () => {
          const response = await fetch(
            `/api/chat/rooms/${roomId}/messages?limit=50`
          );
          if (response.ok) {
            const data = await response.json();
            setMessages(data.messages);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, currentUserId, updateReadStatus, scrollToBottomSmooth, markMessagesAsRead]);

  // 읽음 상태 실시간 구독 (unread_count 업데이트)
  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();

    const readChannel = supabase
      .channel(`chat_reads:${roomId}:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_message_reads',
        },
        (payload) => {
          const { message_id, user_id } = payload.new as { message_id: string; user_id: string };

          // 내가 읽은 건 무시 (이미 처리됨)
          if (user_id === currentUserId) return;

          // 해당 메시지의 unread_count 감소 (해당 메시지가 없으면 prev 그대로 반환)
          setMessages((prev) => {
            const messageIndex = prev.findIndex((m) => m.id === message_id);
            // 해당 메시지가 현재 방에 없으면 상태 변경 안 함
            if (messageIndex === -1) return prev;

            return prev.map((msg, idx) => {
              if (idx !== messageIndex) return msg;
              const newUnreadCount = Math.max(0, (msg.unread_count || 0) - 1);
              return { ...msg, unread_count: newUnreadCount };
            });
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[ChatRoom] 읽음 상태 구독 성공');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[ChatRoom] 읽음 상태 구독 실패');
        }
      });

    return () => {
      supabase.removeChannel(readChannel);
    };
  }, [roomId, currentUserId]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);

    // 하단 근처에 도달하면 새 메시지 카운트 리셋 및 읽음 처리
    if (isNearBottom && newMessageCount > 0) {
      setNewMessageCount(0);
      updateReadStatus();

      // 아직 읽지 않은 다른 사람 메시지 읽음 처리
      const unreadMessageIds = messages
        .filter((m) => m.sender_id !== currentUserId && (m.unread_count || 0) > 0)
        .map((m) => m.id);
      if (unreadMessageIds.length > 0) {
        markMessagesAsRead(unreadMessageIds);
      }
    }

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
    const tempId = `temp-${Date.now()}`;

    // 낙관적 업데이트: 즉시 UI에 표시
    // unread_count = 채팅방 멤버 수 (나 제외, 본인 포함해서 members + 1이므로 members.length가 나 제외한 수)
    const estimatedUnreadCount = room?.members?.length || 0;

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
      unread_count: estimatedUnreadCount,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    // 스크롤은 useLayoutEffect에서 자동 처리됨

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
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw new Error('메시지 전송 실패');
      }

      const data = await response.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data.message : m))
      );
    } catch (error) {
      console.error('메시지 전송 실패:', error);
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

  // 메시지 삭제 (모두에게/나에게만)
  const handleDelete = async (messageId: string, type: 'everyone' | 'me_only') => {
    const response = await fetch(`/api/chat/messages/${messageId}?type=${type}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      if (type === 'everyone') {
        // 모두에게 삭제: 메시지를 "삭제됨"으로 표시
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, is_deleted: true, content: '삭제된 메시지입니다' }
              : m
          )
        );
      } else {
        // 나에게만 삭제: 목록에서 제거
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
      toast({ description: '메시지가 삭제되었습니다.' });
    }
  };

  // 선택 모드 시작 (대화내용 지우기 클릭 시)
  const enterSelectMode = () => {
    setIsSelectMode(true);
    setSelectedMessages(new Set());
  };

  // 선택 모드 종료
  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedMessages(new Set());
    setDeleteAllMode(false);
  };

  // 메시지 선택/해제
  const handleSelectMessage = (messageId: string) => {
    setSelectedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // 삭제 버튼 클릭 (선택된 메시지)
  const handleDeleteButtonClick = () => {
    if (selectedMessages.size === 0) return;
    setDeleteAllMode(false);
    setShowDeleteTypeDialog(true);
  };

  // 전체 삭제 버튼 클릭
  const handleDeleteAllButtonClick = () => {
    setDeleteAllMode(true);
    setShowDeleteTypeDialog(true);
  };

  // 삭제 유형 선택 후 실행
  const handleDeleteConfirm = async (type: 'everyone' | 'me_only') => {
    setShowDeleteTypeDialog(false);

    if (deleteAllMode) {
      // 전체 삭제
      const response = await fetch(`/api/chat/rooms/${roomId}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        if (type === 'me_only') {
          setMessages([]);
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.sender_id === currentUserId
                ? { ...m, is_deleted: true, content: '삭제된 메시지입니다' }
                : m
            )
          );
        }
        toast({ description: '대화 내용이 삭제되었습니다.' });
      }
    } else {
      // 선택된 메시지 삭제
      const count = selectedMessages.size;
      for (const messageId of selectedMessages) {
        await handleDelete(messageId, type);
      }
      toast({ description: `${count}개 메시지가 삭제되었습니다.` });
    }

    exitSelectMode();
  };

  // 채팅방 나가기
  const handleLeaveRoom = async () => {
    setShowLeaveDialog(false);
    const response = await fetch(`/api/chat/rooms/${roomId}/leave`, {
      method: 'POST',
    });

    if (response.ok) {
      toast({ description: '채팅방에서 나왔습니다.' });
      onBack?.();
    } else {
      const data = await response.json();
      toast({ variant: 'destructive', description: data.error || '채팅방 나가기에 실패했습니다.' });
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (isSelectMode) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setPendingFiles(Array.from(files));
    }
  }, [isSelectMode]);

  // 리액션 추가 (낙관적 업데이트)
  const handleReaction = async (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const existingReaction = msg.reactions?.find((r) => r.emoji === emoji);
        if (existingReaction) {
          if (existingReaction.reacted_by_me) return msg;
          return {
            ...msg,
            reactions: msg.reactions?.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, reacted_by_me: true }
                : r
            ),
          };
        } else {
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

    try {
      await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
    } catch (error) {
      console.error('리액션 추가 실패:', error);
    }
  };

  // 리액션 제거 (낙관적 업데이트)
  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const updatedReactions = msg.reactions
          ?.map((r) => {
            if (r.emoji !== emoji) return r;
            if (r.count <= 1) return null;
            return { ...r, count: r.count - 1, reacted_by_me: false };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);
        return { ...msg, reactions: updatedReactions };
      })
    );

    try {
      await fetch(
        `/api/chat/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`,
        { method: 'DELETE' }
      );
    } catch (error) {
      console.error('리액션 제거 실패:', error);
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

  // 로딩 중이거나 사용자 정보가 없거나 스크롤이 완료되지 않은 경우 로딩 화면 표시
  if (isLoading || !isUserLoaded || !isReady) {
    return (
      <div className="flex flex-col h-full">
        {/* 헤더 스켈레톤 */}
        {!isPanel && (
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white shrink-0">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        )}
        {isPanel && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
            <div className="h-6 w-6 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        )}
        {/* 로딩 스피너 */}
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
        {/* 입력창 스켈레톤 */}
        <div className="p-3 border-t border-gray-200 shrink-0">
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 드래그 앤 드롭 오버레이 */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary-500/10 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl shadow-xl border-2 border-dashed border-primary-400">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">파일을 여기에 놓으세요</p>
              <p className="text-sm text-gray-500 mt-1">이미지, 영상, 문서 파일 지원</p>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 - 패널 모드가 아닐 때만 표시 */}
      {!isPanel && (
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
          {/* 설정 메뉴 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={enterSelectMode}>
                <Trash2 className="h-4 w-4 mr-2" />
                대화내용 지우기
              </DropdownMenuItem>
              {room?.type === 'project' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowLeaveDialog(true)}
                    className="text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    채팅방 나가기
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* 패널 모드일 때 간략한 룸 정보 표시 */}
      {isPanel && room && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
          {room.type === 'direct' && room.otherUser ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={room.otherUser.avatar_url || undefined} />
              <AvatarFallback className="bg-primary-100 text-primary-700 text-xs">
                {room.otherUser.name?.slice(0, 1) || 'U'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
              <FolderOpen className="h-3 w-3 text-gray-500" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-700 truncate flex-1">
            {room.type === 'project'
              ? room.project?.title || room.project?.name || '프로젝트 채팅'
              : room.name || room.otherUser?.name || 'DM'}
          </span>
          {room.members && (
            <span className="text-xs text-gray-400">
              ({room.members.length}명)
            </span>
          )}
          {/* 설정 메뉴 (패널 모드) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={enterSelectMode}>
                <Trash2 className="h-4 w-4 mr-2" />
                대화내용 지우기
              </DropdownMenuItem>
              {room.type === 'project' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowLeaveDialog(true)}
                    className="text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    채팅방 나가기
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* 선택 모드 헤더 */}
      {isSelectMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-primary-50 border-b border-primary-200 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exitSelectMode}>
              <X className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium text-primary-700">
              {selectedMessages.size}개 선택됨
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white"
              disabled={selectedMessages.size === 0}
              onClick={handleDeleteButtonClick}
            >
              삭제
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white text-red-600 hover:text-red-700 hover:bg-red-50 disabled:text-gray-400 disabled:hover:bg-white"
              disabled={selectedMessages.size > 0}
              onClick={handleDeleteAllButtonClick}
            >
              전체 삭제
            </Button>
          </div>
        </div>
      )}

      {/* 메시지 목록 */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
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
          <div className="py-2">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                {/* 날짜 구분선 */}
                <div className="flex items-center justify-center my-4 px-4">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="px-3 text-xs text-gray-400 bg-white">
                    {formatMessageDate(msgs[0].created_at)}
                  </span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* 메시지들 */}
                {msgs.map((message, index) => {
                  const prevMessage = index > 0 ? msgs[index - 1] : null;
                  const isSameSender = prevMessage?.sender_id === message.sender_id;
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
                      isSelectMode={isSelectMode}
                      isSelected={selectedMessages.has(message.id)}
                      onSelect={handleSelectMessage}
                      onReply={setReplyTo}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onReaction={handleReaction}
                      onRemoveReaction={handleRemoveReaction}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* 새 메시지 / 스크롤 버튼 */}
      {(showScrollButton || newMessageCount > 0) && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <Button
            variant={newMessageCount > 0 ? 'default' : 'secondary'}
            size="sm"
            className={newMessageCount > 0
              ? 'rounded-full shadow-lg bg-primary-600 hover:bg-primary-700 text-white px-4'
              : 'rounded-full shadow-lg'
            }
            onClick={() => {
              scrollToBottomSmooth();
              setNewMessageCount(0);
              updateReadStatus();

              // 읽지 않은 메시지 읽음 처리
              const unreadMessageIds = messages
                .filter((m) => m.sender_id !== currentUserId && (m.unread_count || 0) > 0)
                .map((m) => m.id);
              if (unreadMessageIds.length > 0) {
                markMessagesAsRead(unreadMessageIds);
              }
            }}
          >
            <ArrowDown className="h-4 w-4" />
            {newMessageCount > 0 && (
              <span className="ml-1">새 메시지 {newMessageCount}개</span>
            )}
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
          disabled={isSelectMode}
          pendingFiles={pendingFiles}
          onPendingFilesProcessed={() => setPendingFiles([])}
        />
      </div>

      {/* 채팅방 나가기 다이얼로그 */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-[280px] p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 pb-4 text-center">
            <DialogTitle className="text-base font-semibold">채팅방 나가기</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              채팅방을 나가면 대화 내용을<br />더 이상 볼 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="border-t border-gray-200">
            <button
              className="w-full px-4 py-3.5 text-sm text-red-500 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors text-center border-b border-gray-200"
              onClick={handleLeaveRoom}
            >
              나가기
            </button>
            <button
              className="w-full px-4 py-3.5 text-sm text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors text-center"
              onClick={() => setShowLeaveDialog(false)}
            >
              취소
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 유형 선택 다이얼로그 */}
      <Dialog open={showDeleteTypeDialog} onOpenChange={setShowDeleteTypeDialog}>
        <DialogContent className="sm:max-w-[280px] p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 pb-4 text-center">
            <DialogTitle className="text-base font-semibold">
              {deleteAllMode ? '전체 대화 삭제' : `${selectedMessages.size}개 메시지 삭제`}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              {deleteAllMode
                ? '모든 대화 내용을 삭제하시겠습니까?'
                : '선택한 메시지를 삭제하시겠습니까?'}
            </DialogDescription>
          </DialogHeader>
          <div className="border-t border-gray-200">
            <button
              className="w-full px-4 py-3.5 text-sm text-red-500 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors text-center border-b border-gray-200"
              onClick={() => handleDeleteConfirm('everyone')}
            >
              모두에게서 삭제
            </button>
            <button
              className="w-full px-4 py-3.5 text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors text-center border-b border-gray-200"
              onClick={() => handleDeleteConfirm('me_only')}
            >
              나에게서만 삭제
            </button>
            <button
              className="w-full px-4 py-3.5 text-sm text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors text-center"
              onClick={() => setShowDeleteTypeDialog(false)}
            >
              취소
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
