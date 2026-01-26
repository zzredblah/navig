'use client';

/**
 * 새 채팅 시작 모달
 * 사용자 검색 및 DM/그룹 채팅방 생성
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, MessageSquare, User, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated?: (roomId: string) => void;
}

export function NewChatModal({ open, onOpenChange, onChatCreated }: NewChatModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);

  // 사용자 검색 (디바운스)
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();

        if (response.ok) {
          // 이미 선택된 사용자는 제외
          const selectedIds = selectedUsers.map((u) => u.id);
          const filteredUsers = (data.users || []).filter(
            (u: SearchUser) => !selectedIds.includes(u.id)
          );
          setUsers(filteredUsers);
        } else {
          console.error('사용자 검색 API 오류:', data);
          setUsers([]);
        }
      } catch (error) {
        console.error('사용자 검색 실패:', error);
        setUsers([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUsers]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setUsers([]);
      setSelectedUsers([]);
    }
  }, [open]);

  // 사용자 선택/해제
  const handleSelectUser = (user: SearchUser) => {
    setSelectedUsers((prev) => [...prev, user]);
    setSearchQuery('');
    setUsers([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // 채팅방 생성
  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: selectedUsers.map((u) => u.id),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onOpenChange(false);

        if (onChatCreated) {
          onChatCreated(data.room.id);
        } else {
          router.push(`/chat/${data.room.id}`);
        }
      } else {
        console.error('채팅방 생성 실패:', data);
        alert(data.error || '채팅방 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      alert('채팅방 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  const isGroupChat = selectedUsers.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isGroupChat ? (
              <Users className="h-5 w-5 text-primary-600" />
            ) : (
              <MessageSquare className="h-5 w-5 text-primary-600" />
            )}
            {isGroupChat ? '그룹 대화 시작' : '새 대화 시작'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 선택된 사용자들 */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-full"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary-100 text-primary-700 text-xs">
                      {user.name?.slice(0, 1) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700">{user.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveUser(user.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 검색 입력 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={selectedUsers.length > 0 ? '더 추가하려면 검색...' : '이메일 또는 이름으로 검색...'}
              className="pl-9"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* 검색 결과 - 고정 높이 */}
          <div className="h-52 overflow-y-auto border border-gray-100 rounded-lg">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-2" />
                <p className="text-sm text-gray-500">검색 중...</p>
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <User className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  {selectedUsers.length > 0 ? '그룹에 추가할 사람을 검색하세요' : '대화할 상대를 검색하세요'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  이메일 또는 이름 2글자 이상 입력
                </p>
                {selectedUsers.length > 0 && (
                  <p className="text-xs text-primary-500 mt-2">
                    여러 명 선택 시 그룹 대화가 생성됩니다
                  </p>
                )}
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Search className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  검색 결과가 없습니다
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  다른 이메일이나 이름으로 검색해보세요
                </p>
              </div>
            ) : (
              <div className="p-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                      'hover:bg-gray-50'
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-gray-100 text-gray-600">
                        {user.name?.slice(0, 2) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              취소
            </Button>
            <Button
              onClick={handleCreateChat}
              disabled={selectedUsers.length === 0 || isCreating}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : isGroupChat ? (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  그룹 대화 시작 ({selectedUsers.length}명)
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  대화 시작
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
