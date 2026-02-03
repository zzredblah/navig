'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Save,
  Upload,
  Undo2,
  Redo2,
  Loader2,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RegisterModal } from '../../modals/RegisterModal';
import type { EditProjectStatus } from '@/types/editing';

interface WorkspaceToolbarProps {
  title: string;
  projectId: string;
  editId: string;
  status: EditProjectStatus;
  onSave: () => Promise<void>;
}

export function WorkspaceToolbar({
  title,
  projectId,
  editId,
  status,
  onSave,
}: WorkspaceToolbarProps) {
  const router = useRouter();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const {
    isDirty,
    isSaving,
    lastSavedAt,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useEditWorkspaceStore();

  const handleSave = async () => {
    await onSave();
  };

  const handleRegisterSuccess = (videoVersionId: string) => {
    setIsRegisterModalOpen(false);
    router.push(`/projects/${projectId}/videos/${videoVersionId}`);
  };

  const formatLastSaved = () => {
    if (!lastSavedAt) return null;
    const diff = Date.now() - lastSavedAt.getTime();
    if (diff < 60000) return '방금';
    const mins = Math.floor(diff / 60000);
    return `${mins}분 전`;
  };

  return (
    <>
      <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
        {/* 좌측: 뒤로가기 + 제목 */}
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/projects/${projectId}/edits`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {status === 'draft' ? (
                <>
                  <Clock className="h-3 w-3" />
                  <span>작업 중</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>등록됨</span>
                </>
              )}
              {lastSavedAt && (
                <>
                  <span>·</span>
                  <span>저장: {formatLastSaved()}</span>
                </>
              )}
              {isDirty && (
                <>
                  <span>·</span>
                  <span className="text-yellow-600">저장되지 않은 변경</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 액션 버튼 */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center border-r border-gray-200 pr-2 mr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => undo()}
              disabled={!canUndo()}
              title="실행 취소 (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => redo()}
              disabled={!canRedo()}
              title="다시 실행 (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          {/* 저장 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty || status !== 'draft'}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                저장
              </>
            )}
          </Button>

          {/* 등록 */}
          {status === 'draft' && (
            <Button
              size="sm"
              onClick={() => setIsRegisterModalOpen(true)}
              disabled={isSaving}
            >
              <Upload className="h-4 w-4 mr-2" />
              등록하기
            </Button>
          )}

          {/* 등록된 영상 보기 */}
          {status !== 'draft' && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/projects/${projectId}/videos`}>
                등록된 영상 보기
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* 등록 모달 */}
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        projectId={projectId}
        editId={editId}
        onSuccess={handleRegisterSuccess}
      />
    </>
  );
}
