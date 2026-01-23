'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Mail, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  invited_at: string;
  joined_at: string | null;
  project_id: string;
  profiles: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
  projects: {
    id: string;
    title: string;
  };
}

const roleLabels: Record<string, string> = {
  owner: '소유자',
  editor: '편집자',
  viewer: '뷰어',
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.data || []);
      }
    } catch (err) {
      console.error('팀 멤버 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchProjects();
  }, [fetchMembers, fetchProjects]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedProjectId) return;

    setInviting(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      if (res.ok) {
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('editor');
        setSelectedProjectId('');
        fetchMembers();
      } else {
        const data = await res.json();
        alert(data.error || '초대에 실패했습니다');
      }
    } catch {
      alert('초대에 실패했습니다');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, projectId: string) => {
    if (!confirm('이 멤버를 프로젝트에서 제거하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMembers();
      } else {
        const data = await res.json();
        alert(data.error || '제거에 실패했습니다');
      }
    } catch {
      alert('제거에 실패했습니다');
    }
  };

  // 멤버를 사용자별로 그룹핑
  const membersByUser = members.reduce((acc, member) => {
    const userId = member.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        profile: member.profiles,
        projects: [],
      };
    }
    acc[userId].projects.push({
      id: member.id,
      projectId: member.project_id,
      projectTitle: member.projects?.title || '알 수 없음',
      role: member.role,
      joinedAt: member.joined_at,
      invitedAt: member.invited_at,
    });
    return acc;
  }, {} as Record<string, { profile: TeamMember['profiles']; projects: { id: string; projectId: string; projectTitle: string; role: string; joinedAt: string | null; invitedAt: string }[] }>);

  const uniqueMembers = Object.entries(membersByUser);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">팀 멤버</h1>
          <p className="text-sm text-gray-500 mt-1">프로젝트에 참여하는 멤버를 관리합니다</p>
        </div>
        <Button
          onClick={() => setShowInviteModal(true)}
          className="bg-primary-600 hover:bg-primary-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          멤버 초대
        </Button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{uniqueMembers.length}</div>
              <p className="text-xs text-gray-500">전체 멤버</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">
                {members.filter(m => m.joined_at).length}
              </div>
              <p className="text-xs text-gray-500">참여 중</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">
                {members.filter(m => !m.joined_at).length}
              </div>
              <p className="text-xs text-gray-500">초대 대기</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 멤버 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : uniqueMembers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">팀 멤버가 없습니다</p>
            <p className="text-sm text-gray-400 mb-4">프로젝트에 멤버를 초대해보세요</p>
            <Button variant="outline" onClick={() => setShowInviteModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              멤버 초대
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">멤버 목록</CardTitle>
            <CardDescription className="text-xs">모든 프로젝트의 팀 멤버</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {uniqueMembers.map(([userId, { profile, projects: memberProjects }]) => (
                <div key={userId} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                        <AvatarFallback className="bg-primary-100 text-primary-700 text-sm">
                          {profile.name?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{profile.name}</p>
                        <p className="text-sm text-gray-500">{profile.email}</p>
                      </div>
                    </div>
                  </div>
                  {/* 참여 프로젝트 목록 */}
                  <div className="ml-12 mt-2 space-y-1">
                    {memberProjects.map((mp) => (
                      <div key={mp.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{mp.projectTitle}</span>
                          <Badge variant="outline" className="text-xs">{roleLabels[mp.role] || mp.role}</Badge>
                          {!mp.joinedAt && (
                            <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-600">
                              초대 대기
                            </Badge>
                          )}
                        </div>
                        {mp.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(mp.id, mp.projectId)}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="제거"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 초대 모달 */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>멤버 초대</DialogTitle>
            <DialogDescription>프로젝트에 새 멤버를 초대합니다</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">프로젝트</Label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full h-10 mt-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
              >
                <option value="">프로젝트를 선택하세요</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">이메일</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="초대할 멤버의 이메일"
                  className="pl-10"
                  type="email"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">역할</Label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full h-10 mt-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
              >
                <option value="editor">편집자</option>
                <option value="viewer">뷰어</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowInviteModal(false)}>
                취소
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || !selectedProjectId || inviting}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {inviting ? '초대 중...' : '초대하기'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
