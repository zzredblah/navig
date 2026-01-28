'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, UserPlus, CheckCircle, Clock, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InviteMemberModal } from '@/components/project/InviteMemberModal';

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  invited_at: string;
  joined_at: string | null;
  profiles: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface Project {
  id: string;
  title: string;
  client_id: string;
}

const roleLabels: Record<string, string> = {
  owner: '소유자',
  approver: '승인자',
  editor: '편집자',
  viewer: '뷰어',
};

export default function ProjectMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project || data);
      }
    } catch (err) {
      console.error('프로젝트 조회 실패:', err);
    }
  }, [resolvedParams.id]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.data || []);
      }
    } catch (err) {
      console.error('멤버 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchProject();
    fetchMembers();
  }, [fetchProject, fetchMembers]);

  const handleInviteSuccess = () => {
    setShowInviteModal(false);
    fetchMembers();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('이 멤버를 프로젝트에서 제거하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}/members/${memberId}`, {
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

  if (loading && !project) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const activeMembers = members.filter(m => m.joined_at);
  const pendingMembers = members.filter(m => !m.joined_at);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${resolvedParams.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">팀 멤버</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {project?.title || '프로젝트'} 멤버 관리
            </p>
          </div>
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
              <div className="text-xl font-bold text-gray-900">{members.length}</div>
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
              <div className="text-xl font-bold text-gray-900">{activeMembers.length}</div>
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
              <div className="text-xl font-bold text-gray-900">{pendingMembers.length}</div>
              <p className="text-xs text-gray-500">초대 대기</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 멤버 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">아직 멤버가 없습니다</p>
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
            <CardDescription className="text-xs">프로젝트에 참여하는 멤버</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {members.map((member) => (
                <div key={member.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.profiles.avatar_url || undefined} alt={member.profiles.name} />
                      <AvatarFallback className="bg-primary-100 text-primary-700 text-sm">
                        {member.profiles.name?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{member.profiles.name}</p>
                        <Badge variant="outline" className="text-xs">{roleLabels[member.role] || member.role}</Badge>
                        {!member.joined_at && (
                          <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-600">
                            초대 대기
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{member.profiles.email}</p>
                    </div>
                  </div>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="제거"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 멤버 초대 모달 (InviteMemberModal 사용) */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
        projectId={resolvedParams.id}
      />
    </div>
  );
}
