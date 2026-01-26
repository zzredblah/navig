'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, UserPlus, Users, Trash2, Pencil, FileText, Video } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InviteMemberModal } from '@/components/project/InviteMemberModal';
import { EditProjectModal } from '@/components/project/EditProjectModal';
import type { Project, MemberRole } from '@/types/database';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  planning: { label: '기획', variant: 'secondary' },
  production: { label: '제작', variant: 'default' },
  review: { label: '검수', variant: 'outline' },
  completed: { label: '완료', variant: 'secondary' },
};

const roleLabels: Record<MemberRole, string> = {
  owner: '소유자',
  editor: '편집자',
  viewer: '뷰어',
};

interface ProjectMember {
  id: string;
  user_id: string;
  role: MemberRole;
  invited_at: string;
  profiles: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface ProjectDetailResponse {
  data: {
    project: Project & { project_members: ProjectMember[] };
    userRole: MemberRole;
  };
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [project, setProject] = useState<(Project & { project_members: ProjectMember[] }) | null>(null);
  const [userRole, setUserRole] = useState<MemberRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}`);
      const result: ProjectDetailResponse = await response.json();

      if (response.ok) {
        setProject(result.data.project);
        setUserRole(result.data.userRole);
      } else if (response.status === 404) {
        router.push('/projects');
      }
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleDelete = async () => {
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/projects');
      }
    } catch {
      // Handle error
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('이 멤버를 프로젝트에서 제거하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProject();
      }
    } catch {
      // Handle error
    }
  };

  const canEdit = userRole === 'owner' || userRole === 'editor';
  const canManageMembers = userRole === 'owner' || userRole === 'editor';
  const canDelete = userRole === 'owner';

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          프로젝트 목록
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <Badge variant={statusLabels[project.status]?.variant || 'default'}>
                {statusLabels[project.status]?.label || project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="text-gray-600 mt-2">{project.description}</p>
            )}
          </div>

          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                <Pencil className="h-4 w-4 mr-1" />
                수정
              </Button>
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-error-600 hover:text-error-700"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  삭제
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* 문서 관리 카드 */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/projects/${resolvedParams.id}/documents`)}>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">문서 관리</h3>
                <p className="text-sm text-gray-500">요청서, 견적서, 계약서를 관리합니다</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              바로가기
            </Button>
          </CardContent>
        </Card>

        {/* 영상 버전 관리 카드 */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/projects/${resolvedParams.id}/videos`)}>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Video className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">영상 버전 관리</h3>
                <p className="text-sm text-gray-500">영상 파일을 업로드하고 버전을 관리합니다</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              바로가기
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <CardTitle>멤버</CardTitle>
              </div>
              {canManageMembers && (
                <Button size="sm" onClick={() => setIsInviteModalOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  초대
                </Button>
              )}
            </div>
            <CardDescription>
              프로젝트에 참여 중인 멤버 목록입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.project_members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={member.profiles.avatar_url || undefined}
                        alt={member.profiles.name}
                      />
                      <AvatarFallback className="bg-primary-100 text-primary-700">
                        {member.profiles.name?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{member.profiles.name}</p>
                      <p className="text-sm text-gray-500">{member.profiles.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{roleLabels[member.role]}</Badge>
                    {canManageMembers && member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-error-600"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              <CardTitle>프로젝트 정보</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">생성일</dt>
                <dd className="font-medium">
                  {new Date(project.created_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">최근 수정일</dt>
                <dd className="font-medium">
                  {new Date(project.updated_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
              {project.deadline && (
                <div>
                  <dt className="text-sm text-gray-500">마감일</dt>
                  <dd className="font-medium">
                    {new Date(project.deadline).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">나의 역할</dt>
                <dd className="font-medium">{userRole ? roleLabels[userRole] : '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          setIsInviteModalOpen(false);
          fetchProject();
        }}
        projectId={resolvedParams.id}
      />

      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false);
          fetchProject();
        }}
        project={project}
      />
    </div>
  );
}
