'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  HardDrive,
  Users,
  ChevronDown,
  ChevronUp,
  Video,
  ExternalLink,
  Loader2,
  Crown,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ProjectDetail {
  id: string;
  title: string;
  created_at: string;
  status: string;
  role: 'owner' | 'member';
}

interface StorageItem {
  id: string;
  file_name: string;
  file_size_mb: number;
  created_at: string;
  project_id: string;
  project_title: string;
}

interface MemberDetail {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  joined: boolean;
}

interface ProjectMembers {
  project_id: string;
  project_title: string;
  members: MemberDetail[];
}

interface UsageDetailsData {
  projects: {
    count: number;
    items: ProjectDetail[];
  };
  storage: {
    total_gb: number;
    total_mb: number;
    items: StorageItem[];
  };
  members: {
    count: number;
    by_project: ProjectMembers[];
  };
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count: number | string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, count, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600">
            {icon}
          </div>
          <span className="font-medium text-gray-900">{title}</span>
          <Badge variant="secondary">{count}</Badge>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-200 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

export function UsageDetailsCard() {
  const [data, setData] = useState<UsageDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const response = await fetch('/api/subscriptions/usage-details');
        if (response.ok) {
          const json = await response.json();
          setData(json.data);
        }
      } catch (error) {
        console.error('사용량 상세 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetails();
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-center text-gray-500">사용량 정보를 불러올 수 없습니다</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">상세 사용량</h3>
      <p className="text-sm text-gray-500 mb-6">
        각 항목을 클릭하면 어디에 리소스가 사용되고 있는지 확인할 수 있습니다.
      </p>

      <div className="space-y-4">
        {/* 프로젝트 섹션 */}
        <CollapsibleSection
          title="프로젝트"
          icon={<FolderOpen className="h-4 w-4" />}
          count={`${data.projects.count}개`}
          defaultOpen
        >
          {data.projects.items.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              프로젝트가 없습니다
            </p>
          ) : (
            <div className="space-y-2">
              {data.projects.items.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      project.role === 'owner' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                    )}>
                      {project.role === 'owner' ? (
                        <Crown className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {project.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {project.role === 'owner' ? '소유자' : '멤버'} · {formatDate(project.created_at)}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* 스토리지 섹션 */}
        <CollapsibleSection
          title="스토리지"
          icon={<HardDrive className="h-4 w-4" />}
          count={formatFileSize(data.storage.total_mb)}
        >
          {data.storage.items.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              업로드된 영상이 없습니다
            </p>
          ) : (
            <div className="space-y-2">
              {data.storage.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Video className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {item.file_name || '영상 파일'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.project_title && (
                          <Link
                            href={`/projects/${item.project_id}`}
                            className="hover:text-primary-600 transition-colors"
                          >
                            {item.project_title}
                          </Link>
                        )}
                        {item.project_title && ' · '}
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {formatFileSize(item.file_size_mb)}
                  </Badge>
                </div>
              ))}

              {data.storage.items.length >= 20 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  상위 20개 파일만 표시됩니다
                </p>
              )}
            </div>
          )}
        </CollapsibleSection>

        {/* 멤버 섹션 */}
        <CollapsibleSection
          title="초대한 멤버"
          icon={<Users className="h-4 w-4" />}
          count={`${data.members.count}명`}
        >
          {data.members.by_project.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              초대한 멤버가 없습니다
            </p>
          ) : (
            <div className="space-y-4">
              {data.members.by_project.map((project) => (
                <div key={project.project_id}>
                  <div className="flex items-center gap-2 mb-2">
                    <Link
                      href={`/projects/${project.project_id}/members`}
                      className="text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors"
                    >
                      {project.project_title}
                    </Link>
                    <Badge variant="secondary" className="text-xs">
                      {project.members.length}명
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {project.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url || undefined} alt={member.name} />
                          <AvatarFallback className="text-xs">
                            {member.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {member.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {member.role === 'editor' ? '편집자' :
                             member.role === 'viewer' ? '뷰어' : member.role}
                          </Badge>
                          {!member.joined && (
                            <Badge variant="secondary" className="text-xs text-orange-600">
                              대기 중
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
