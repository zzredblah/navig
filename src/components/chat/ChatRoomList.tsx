'use client';

/**
 * 채팅방 목록 컴포넌트
 */

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Users,
  Loader2,
  FolderOpen,
  Search,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChatRoomWithDetails, formatChatTime } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatRoomListProps {
  onRoomSelect?: (roomId: string) => void;
  selectedRoomId?: string | null;
}

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
}

export function ChatRoomList({ onRoomSelect, selectedRoomId }: ChatRoomListProps) {
  const pathname = usePathname();
  const [rooms, setRooms] = useState<ChatRoomWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 새 채팅 생성 관련 상태
  const [showNewChat, setShowNewChat] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/rooms');
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('채팅방 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 팀 멤버 목록 조회
  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team/members');
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('팀 멤버 조회 실패:', error);
    }
  };

  // 새 채팅 모드 열기
  const handleOpenNewChat = () => {
    setShowNewChat(true);
    setSelectedMembers([]);
    setMemberSearchQuery('');
    fetchTeamMembers();
  };

  // 멤버 선택/해제
  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  // 새 채팅방 생성
  const handleCreateChat = async () => {
    if (selectedMembers.length === 0) return;

    setIsCreatingChat(true);
    try {
      const response = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: selectedMembers,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // 채팅방 목록 새로고침
        await fetchRooms();
        // 새로 생성된 채팅방으로 이동
        onRoomSelect?.(data.room.id);
        setShowNewChat(false);
      }
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
    } finally {
      setIsCreatingChat(false);
    }
  };

  // 필터된 팀 멤버
  const filteredMembers = teamMembers.filter(member => {
    if (!memberSearchQuery) return true;
    const query = memberSearchQuery.toLowerCase();
    return (
      member.name?.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  // 채팅방 이름 가져오기 (filteredRooms보다 먼저 정의)
  const getRoomName = (room: ChatRoomWithDetails): string => {
    if (room.type === 'project') {
      return room.project?.title || room.project?.name || room.name || '프로젝트 채팅';
    }
    // 그룹 채팅 (2명 이상)
    if (room.members && room.members.length > 1) {
      return room.name || room.members.map((m) => m.name || '').join(', ');
    }
    // 1:1 DM
    return room.otherUser?.name || room.members?.[0]?.name || 'DM';
  };

  const isGroupChat = (room: ChatRoomWithDetails): boolean => {
    return room.type === 'direct' && (room.members?.length || 0) > 1;
  };

  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = getRoomName(room).toLowerCase();
    return name.includes(query);
  });

  const getRoomAvatar = (room: ChatRoomWithDetails) => {
    // 그룹 채팅
    if (isGroupChat(room)) {
      return (
        <div className="relative h-10 w-10">
          <div className="absolute top-0 left-0 h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center border-2 border-white z-10">
            <span className="text-xs font-medium text-primary-700">
              {room.members?.[0]?.name?.slice(0, 1) || 'U'}
            </span>
          </div>
          <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white">
            <span className="text-xs font-medium text-gray-600">
              +{(room.members?.length || 0) - 1}
            </span>
          </div>
        </div>
      );
    }

    // 1:1 DM
    if (room.type === 'direct') {
      const user = room.otherUser || room.members?.[0];
      return (
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary-100 text-primary-700">
            {user?.name?.slice(0, 2) || 'U'}
          </AvatarFallback>
        </Avatar>
      );
    }

    // 프로젝트 채팅
    return (
      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
        <FolderOpen className="h-5 w-5 text-gray-500" />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // 새 채팅 생성 화면
  if (showNewChat) {
    return (
      <div className="flex flex-col h-full">
        {/* 헤더 */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">새 채팅</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowNewChat(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              placeholder="이름 또는 이메일로 검색..."
              className="pl-9"
            />
          </div>
        </div>

        {/* 선택된 멤버 */}
        {selectedMembers.length > 0 && (
          <div className="p-2 border-b border-gray-100 flex flex-wrap gap-1">
            {selectedMembers.map(memberId => {
              const member = teamMembers.find(m => m.id === memberId);
              if (!member) return null;
              return (
                <span
                  key={memberId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full"
                >
                  {member.name || member.email}
                  <button
                    onClick={() => toggleMember(memberId)}
                    className="hover:text-primary-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* 멤버 목록 */}
        <div className="flex-1 overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Users className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                {memberSearchQuery ? '검색 결과가 없습니다' : '팀 멤버가 없습니다'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMembers.map(member => {
                const isSelected = selectedMembers.includes(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left',
                      isSelected && 'bg-primary-50'
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary-100 text-primary-700 text-sm">
                        {member.name?.slice(0, 2) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.name || '이름 없음'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 생성 버튼 */}
        <div className="p-3 border-t border-gray-200">
          <Button
            className="w-full"
            disabled={selectedMembers.length === 0 || isCreatingChat}
            onClick={handleCreateChat}
          >
            {isCreatingChat ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <MessageSquare className="h-4 w-4 mr-2" />
            )}
            {selectedMembers.length === 1 ? '1:1 채팅 시작' : `그룹 채팅 시작 (${selectedMembers.length}명)`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 검색 + 새 채팅 버튼 */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="채팅방 검색..."
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleOpenNewChat}
            title="새 채팅"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 채팅방 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 mb-1">
              {searchQuery ? '검색 결과가 없습니다' : '채팅방이 없습니다'}
            </p>
            <p className="text-sm text-gray-400">
              {searchQuery
                ? '다른 검색어를 입력해보세요'
                : '프로젝트를 생성하거나 팀원과 대화를 시작하세요'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRooms.map((room) => {
              const isActive = selectedRoomId ? selectedRoomId === room.id : pathname === `/chat/${room.id}`;
              const unreadCount = room.unread_count || 0;

              return (
                <button
                  key={room.id}
                  onClick={() => onRoomSelect?.(room.id)}
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left',
                    isActive && 'bg-primary-50 hover:bg-primary-50'
                  )}
                >
                  {getRoomAvatar(room)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'font-medium truncate',
                          unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                        )}
                      >
                        {getRoomName(room)}
                      </span>
                      {room.last_message_at && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatChatTime(room.last_message_at)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p
                        className={cn(
                          'text-sm truncate',
                          unreadCount > 0 ? 'text-gray-700' : 'text-gray-500'
                        )}
                      >
                        {room.last_message_preview || '메시지가 없습니다'}
                      </p>
                      {unreadCount > 0 && (
                        <Badge className="bg-primary-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] flex items-center justify-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
