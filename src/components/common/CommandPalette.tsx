'use client';

/**
 * Command Palette (Cmd+K) 글로벌 검색
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import {
  Search,
  FolderOpen,
  Video,
  Settings,
  LayoutDashboard,
  FileText,
  Users,
  Keyboard,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  category: 'navigation' | 'project' | 'actions';
}

export function CommandPalette({
  open,
  onOpenChange,
  onShowShortcuts,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // 프로젝트 목록 로드
  useEffect(() => {
    if (open && projects.length === 0) {
      setIsLoadingProjects(true);
      fetch('/api/projects?limit=10')
        .then((res) => res.json())
        .then((data) => {
          setProjects(data.data || []);
        })
        .catch(console.error)
        .finally(() => setIsLoadingProjects(false));
    }
  }, [open, projects.length]);

  // 명령 목록
  const commands: CommandItem[] = useMemo(() => {
    const navigationCommands: CommandItem[] = [
      {
        id: 'dashboard',
        title: '대시보드',
        description: '대시보드로 이동',
        icon: <LayoutDashboard className="h-4 w-4" />,
        action: () => router.push('/dashboard'),
        keywords: ['home', '홈', '메인'],
        category: 'navigation',
      },
      {
        id: 'projects',
        title: '프로젝트 목록',
        description: '전체 프로젝트 보기',
        icon: <FolderOpen className="h-4 w-4" />,
        action: () => router.push('/projects'),
        keywords: ['list', '목록'],
        category: 'navigation',
      },
      {
        id: 'videos',
        title: '전체 영상',
        description: '모든 영상 보기',
        icon: <Video className="h-4 w-4" />,
        action: () => router.push('/videos'),
        keywords: ['video', '영상', '미디어'],
        category: 'navigation',
      },
      {
        id: 'documents',
        title: '문서',
        description: '문서 관리',
        icon: <FileText className="h-4 w-4" />,
        action: () => router.push('/documents'),
        keywords: ['doc', '문서', 'file'],
        category: 'navigation',
      },
      {
        id: 'team',
        title: '팀',
        description: '팀원 관리',
        icon: <Users className="h-4 w-4" />,
        action: () => router.push('/team'),
        keywords: ['member', '멤버', '팀원'],
        category: 'navigation',
      },
      {
        id: 'settings',
        title: '설정',
        description: '계정 및 앱 설정',
        icon: <Settings className="h-4 w-4" />,
        action: () => router.push('/settings'),
        keywords: ['config', '환경설정', '계정'],
        category: 'navigation',
      },
    ];

    const actionCommands: CommandItem[] = [
      {
        id: 'shortcuts',
        title: '키보드 단축키',
        description: '단축키 목록 보기',
        icon: <Keyboard className="h-4 w-4" />,
        action: () => {
          onOpenChange(false);
          onShowShortcuts?.();
        },
        keywords: ['keyboard', 'hotkey', '키보드'],
        category: 'actions',
      },
    ];

    const projectCommands: CommandItem[] = projects.map((project) => ({
      id: `project-${project.id}`,
      title: project.title,
      description: '프로젝트로 이동',
      icon: <FolderOpen className="h-4 w-4" />,
      action: () => router.push(`/projects/${project.id}`),
      keywords: [],
      category: 'project',
    }));

    return [...navigationCommands, ...actionCommands, ...projectCommands];
  }, [projects, router, onOpenChange, onShowShortcuts]);

  // 검색 필터
  const filteredCommands = useMemo(() => {
    if (!query) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter((cmd) => {
      const matchTitle = cmd.title.toLowerCase().includes(lowerQuery);
      const matchDescription = cmd.description?.toLowerCase().includes(lowerQuery);
      const matchKeywords = cmd.keywords?.some((kw) =>
        kw.toLowerCase().includes(lowerQuery)
      );
      return matchTitle || matchDescription || matchKeywords;
    });
  }, [commands, query]);

  // 키보드 네비게이션
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onOpenChange(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [filteredCommands, selectedIndex, onOpenChange]
  );

  // 쿼리 변경 시 선택 인덱스 초기화
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // 카테고리별 그룹화
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      project: [],
      actions: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // 전체 인덱스 계산 헬퍼
  const getGlobalIndex = (category: string, localIndex: number) => {
    let offset = 0;
    const categoryOrder = ['navigation', 'project', 'actions'];
    for (const cat of categoryOrder) {
      if (cat === category) break;
      offset += groupedCommands[cat].length;
    }
    return offset + localIndex;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" hideCloseButton>
        {/* 접근성을 위한 숨김 타이틀 */}
        <VisuallyHidden.Root>
          <DialogTitle>글로벌 검색</DialogTitle>
        </VisuallyHidden.Root>
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="검색하거나 명령 입력..."
            className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder:text-gray-400"
            autoFocus
          />
          <button
            onClick={() => onOpenChange(false)}
            className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition-colors"
          >
            Esc
          </button>
        </div>

        {/* 명령 목록 */}
        <div className="max-h-80 overflow-y-auto py-2">
          {isLoadingProjects && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {filteredCommands.length === 0 && !isLoadingProjects && (
            <div className="py-8 text-center text-gray-500 text-sm">
              검색 결과가 없습니다
            </div>
          )}

          {/* 네비게이션 */}
          {groupedCommands.navigation.length > 0 && (
            <div className="px-2">
              <p className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase">
                네비게이션
              </p>
              {groupedCommands.navigation.map((cmd, idx) => (
                <CommandItemRow
                  key={cmd.id}
                  command={cmd}
                  isSelected={selectedIndex === getGlobalIndex('navigation', idx)}
                  onClick={() => {
                    cmd.action();
                    onOpenChange(false);
                  }}
                  onMouseEnter={() =>
                    setSelectedIndex(getGlobalIndex('navigation', idx))
                  }
                />
              ))}
            </div>
          )}

          {/* 프로젝트 */}
          {groupedCommands.project.length > 0 && (
            <div className="px-2 mt-2">
              <p className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase">
                프로젝트
              </p>
              {groupedCommands.project.map((cmd, idx) => (
                <CommandItemRow
                  key={cmd.id}
                  command={cmd}
                  isSelected={selectedIndex === getGlobalIndex('project', idx)}
                  onClick={() => {
                    cmd.action();
                    onOpenChange(false);
                  }}
                  onMouseEnter={() =>
                    setSelectedIndex(getGlobalIndex('project', idx))
                  }
                />
              ))}
            </div>
          )}

          {/* 액션 */}
          {groupedCommands.actions.length > 0 && (
            <div className="px-2 mt-2">
              <p className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase">
                액션
              </p>
              {groupedCommands.actions.map((cmd, idx) => (
                <CommandItemRow
                  key={cmd.id}
                  command={cmd}
                  isSelected={selectedIndex === getGlobalIndex('actions', idx)}
                  onClick={() => {
                    cmd.action();
                    onOpenChange(false);
                  }}
                  onMouseEnter={() =>
                    setSelectedIndex(getGlobalIndex('actions', idx))
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* 하단 힌트 */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-white border border-gray-200 rounded">↑</kbd>
              <kbd className="px-1 bg-white border border-gray-200 rounded">↓</kbd>
              <span>이동</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 bg-white border border-gray-200 rounded">Enter</kbd>
              <span>선택</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 bg-white border border-gray-200 rounded">⌘</kbd>
            <kbd className="px-1 bg-white border border-gray-200 rounded">K</kbd>
            <span>열기</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 개별 명령 아이템 행
function CommandItemRow({
  command,
  isSelected,
  onClick,
  onMouseEnter,
}: {
  command: CommandItem;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors',
        isSelected
          ? 'bg-primary-50 text-primary-900'
          : 'text-gray-700 hover:bg-gray-100'
      )}
    >
      <span
        className={cn(
          'shrink-0',
          isSelected ? 'text-primary-600' : 'text-gray-400'
        )}
      >
        {command.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{command.title}</div>
        {command.description && (
          <div className="text-xs text-gray-500 truncate">
            {command.description}
          </div>
        )}
      </div>
      {isSelected && (
        <ArrowRight className="h-4 w-4 text-primary-500 shrink-0" />
      )}
    </button>
  );
}
