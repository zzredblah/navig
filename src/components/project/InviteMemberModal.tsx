'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, User, X, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

export function InviteMemberModal({ isOpen, onClose, onSuccess, projectId }: InviteMemberModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor' | 'approver' | 'owner'>('viewer');

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
          setUsers(data.users || []);
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
  }, [searchQuery]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setUsers([]);
      setSelectedUser(null);
      setSelectedRole('viewer');
      setError(null);
    }
  }, [isOpen]);

  // 사용자 선택
  const handleSelectUser = (user: SearchUser) => {
    setSelectedUser(user);
    setSearchQuery('');
    setUsers([]);
  };

  // 사용자 선택 해제
  const handleRemoveUser = () => {
    setSelectedUser(null);
  };

  // 멤버 초대
  const handleInvite = async () => {
    if (!selectedUser) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          role: selectedRole,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || '멤버 초대에 실패했습니다');
        return;
      }

      onSuccess();
    } catch {
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary-600" />
            멤버 초대
          </DialogTitle>
          <DialogDescription>
            이름 또는 이메일로 사용자를 검색하여 초대하세요
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-md bg-error-50 border border-error-200 text-error-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* 선택된 사용자 */}
          {selectedUser && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary-100 text-primary-700">
                      {selectedUser.name?.slice(0, 2) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900">{selectedUser.name}</p>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveUser}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* 검색 입력 (사용자 미선택 시) */}
          {!selectedUser && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이메일 또는 이름으로 검색..."
                  className="pl-9"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>

              {/* 검색 결과 */}
              <div className="h-48 overflow-y-auto border border-gray-100 rounded-lg">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-2" />
                    <p className="text-sm text-gray-500">검색 중...</p>
                  </div>
                ) : searchQuery.length < 2 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <User className="h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">
                      초대할 멤버를 검색하세요
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      이메일 또는 이름 2글자 이상 입력
                    </p>
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
            </>
          )}

          {/* 역할 선택 */}
          <div className="space-y-2">
            <Label htmlFor="role">역할</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as 'viewer' | 'editor' | 'approver' | 'owner')}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="역할 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">뷰어 - 조회만 가능</SelectItem>
                <SelectItem value="editor">편집자 - 수정 가능</SelectItem>
                <SelectItem value="approver">승인자 - 영상 승인 권한</SelectItem>
                <SelectItem value="owner">소유자 - 모든 권한</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              취소
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!selectedUser || isLoading}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  초대 중...
                </>
              ) : (
                '초대'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
