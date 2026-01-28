'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Users,
  Bell,
  Trash2,
  Settings,
  HelpCircle,
  X,
  Video,
  LayoutGrid,
  ChevronDown,
  LogOut,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SidebarConfig } from '@/types/database';
import { useProjectContextStore } from '@/stores/project-context-store';
import { useEffect, useState } from 'react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  sidebarConfig?: SidebarConfig | null;
}

// 메뉴 아이템 정의 (프로젝트 선택 여부에 따라 href가 달라짐)
interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string; // 프로젝트 미선택 시 href
  projectHref?: string; // 프로젝트 선택 시 href 템플릿 ({id} 포함)
  alwaysGlobal?: boolean; // 항상 글로벌 경로 사용 (대시보드, 알림)
  projectOnly?: boolean; // 프로젝트 선택 시에만 표시 (레퍼런스 보드)
}

const menuItems: MenuItem[] = [
  {
    title: '대시보드',
    href: '/dashboard',
    icon: LayoutDashboard,
    alwaysGlobal: true,
  },
  {
    title: '프로젝트',
    href: '/projects',
    projectHref: '/projects/{id}',
    icon: FolderOpen,
  },
  {
    title: '문서',
    href: '/documents',
    projectHref: '/projects/{id}/documents',
    icon: FileText,
  },
  {
    title: '영상',
    href: '/videos',
    projectHref: '/projects/{id}/videos',
    icon: Video,
  },
  {
    title: '레퍼런스 보드',
    href: '/boards',
    projectHref: '/projects/{id}/boards',
    icon: LayoutGrid,
  },
  {
    title: '팀 멤버',
    href: '/team',
    projectHref: '/projects/{id}/members',
    icon: Users,
  },
  {
    title: '알림',
    href: '/notifications',
    icon: Bell,
    alwaysGlobal: true,
  },
];

const bottomMenuItems = [
  {
    title: '휴지통',
    href: '/documents/trash',
    icon: Trash2,
  },
  {
    title: '설정',
    href: '/settings',
    icon: Settings,
  },
  {
    title: '도움말',
    href: '/help',
    icon: HelpCircle,
  },
];

// Items that cannot be hidden
const ALWAYS_VISIBLE = ['/dashboard', '/settings'];

interface SimpleProject {
  id: string;
  title: string;
}

export function Sidebar({ isOpen, onClose, sidebarConfig }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const hiddenItems = sidebarConfig?.hidden || [];

  const { selectedProject, setSelectedProject, clearSelectedProject } = useProjectContextStore();
  const [recentProjects, setRecentProjects] = useState<SimpleProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // 최근 프로젝트 목록 로드 및 선택된 프로젝트 유효성 검사
  useEffect(() => {
    async function fetchRecentProjects() {
      setIsLoadingProjects(true);
      try {
        const response = await fetch('/api/projects?limit=5&sort=updated_at');
        if (!response.ok) {
          // 인증 실패 등 - 프로젝트 목록 비우기
          setRecentProjects([]);
          if (selectedProject) {
            clearSelectedProject();
          }
          return;
        }

        const data = await response.json();
        const projects = data.data?.map((p: { id: string; title: string }) => ({
          id: p.id,
          title: p.title,
        })) || [];
        setRecentProjects(projects);

        // 선택된 프로젝트가 사용자의 프로젝트 목록에 없으면 클리어
        // (다른 계정으로 로그인했거나 초대 수락 전인 경우)
        if (selectedProject) {
          const hasAccess = projects.some((p: SimpleProject) => p.id === selectedProject.id);
          if (!hasAccess) {
            // 프로젝트 API로 직접 확인 (전체 목록에는 없지만 접근 가능할 수 있음)
            try {
              const projectRes = await fetch(`/api/projects/${selectedProject.id}`);
              if (!projectRes.ok) {
                // 접근 권한 없음 - 선택 해제
                clearSelectedProject();
              }
            } catch {
              clearSelectedProject();
            }
          }
        }
      } catch (error) {
        console.error('프로젝트 목록 조회 실패:', error);
        // 에러 발생 시 선택된 프로젝트 클리어
        if (selectedProject) {
          clearSelectedProject();
        }
      } finally {
        setIsLoadingProjects(false);
      }
    }

    fetchRecentProjects();
  }, [selectedProject, clearSelectedProject]);

  // URL에서 프로젝트 ID 감지하여 자동 선택 (다른 프로젝트 진입 시)
  // 대시보드나 다른 페이지로 이동해도 프로젝트 유지 (명시적 나가기만 해제)
  useEffect(() => {
    const match = pathname.match(/\/projects\/([^/]+)/);
    if (match && match[1] && match[1] !== 'new') {
      const projectId = match[1];
      // 다른 프로젝트 상세 페이지 진입 시 해당 프로젝트로 자동 전환
      if (!selectedProject || selectedProject.id !== projectId) {
        // 최근 프로젝트 목록에서 찾기
        const found = recentProjects.find((p) => p.id === projectId);
        if (found) {
          setSelectedProject(found);
        } else {
          // API로 프로젝트 정보 가져오기
          fetch(`/api/projects/${projectId}`)
            .then((res) => {
              if (!res.ok) return null;
              return res.json();
            })
            .then((data) => {
              if (data?.data?.project) {
                setSelectedProject({
                  id: data.data.project.id,
                  title: data.data.project.title,
                });
              }
            })
            .catch(() => {
              // 접근 권한 없음 - 무시
            });
        }
      }
    }
    // 프로젝트 자동 해제 로직 제거 - 명시적으로 "프로젝트 나가기"를 눌렀을 때만 해제
  }, [pathname, recentProjects, selectedProject, setSelectedProject]);

  const filteredMenuItems = menuItems.filter(
    (item) => ALWAYS_VISIBLE.includes(item.href) || !hiddenItems.includes(item.href)
  );
  const filteredBottomMenuItems = bottomMenuItems.filter(
    (item) => ALWAYS_VISIBLE.includes(item.href) || !hiddenItems.includes(item.href)
  );

  // 프로젝트 선택 핸들러
  const handleSelectProject = (project: SimpleProject) => {
    setSelectedProject(project);
    router.push(`/projects/${project.id}`);
    onClose?.();
  };

  // 프로젝트 나가기 핸들러
  const handleExitProject = () => {
    clearSelectedProject();
    router.push('/dashboard');
    onClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/images/logo-light.png"
                alt="NAVIG"
                width={120}
                height={40}
                className="h-8 w-auto object-contain"
                priority
                unoptimized
              />
            </Link>
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* 프로젝트 선택기 */}
          <div className="px-3 py-3 border-b border-gray-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      selectedProject ? "bg-primary-100" : "bg-gray-200"
                    )}>
                      <FolderOpen className={cn(
                        "h-4 w-4",
                        selectedProject ? "text-primary-600" : "text-gray-500"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">
                        {selectedProject ? '선택된 프로젝트' : '프로젝트 선택'}
                      </p>
                      <p className={cn(
                        "text-sm font-medium truncate",
                        selectedProject ? "text-gray-900" : "text-gray-500"
                      )}>
                        {selectedProject?.title || '프로젝트를 선택하세요'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {isLoadingProjects ? (
                  <div className="px-3 py-2 text-sm text-gray-500">로딩 중...</div>
                ) : recentProjects.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">프로젝트가 없습니다</div>
                ) : (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                      최근 프로젝트
                    </div>
                    {recentProjects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => handleSelectProject(project)}
                        className="cursor-pointer"
                      >
                        <FolderOpen className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="truncate flex-1">{project.title}</span>
                        {selectedProject?.id === project.id && (
                          <Check className="h-4 w-4 text-primary-600 ml-2" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { router.push('/projects'); onClose?.(); }}>
                  <FolderOpen className="h-4 w-4 mr-2 text-gray-500" />
                  모든 프로젝트 보기
                </DropdownMenuItem>
                {selectedProject && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleExitProject}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      프로젝트 나가기
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              // 프로젝트 선택 시에만 표시되는 항목 필터링
              if (item.projectOnly && !selectedProject) {
                return null;
              }

              // href 결정: 프로젝트 선택 시 projectHref 사용 (alwaysGlobal이 아닌 경우)
              let href = item.href;
              if (selectedProject && item.projectHref && !item.alwaysGlobal) {
                href = item.projectHref.replace('{id}', selectedProject.id);
              }

              // 프로젝트 선택 시 "프로젝트" 타이틀을 "프로젝트 홈"으로 변경
              let title = item.title;
              const isProjectHome = selectedProject && item.title === '프로젝트';
              if (isProjectHome) {
                title = '프로젝트 홈';
              }

              // Active 상태 결정
              // 프로젝트 홈은 정확히 /projects/{id}일 때만 active (하위 경로 제외)
              let isActive = false;
              if (isProjectHome) {
                isActive = pathname === href;
              } else {
                isActive = pathname === href || pathname.startsWith(`${href}/`);
              }

              return (
                <Link
                  key={item.title}
                  href={href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {title}
                </Link>
              );
            })}
          </nav>

          {/* Bottom navigation */}
          <div className="p-4 border-t border-gray-200 space-y-1">
            {filteredBottomMenuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
