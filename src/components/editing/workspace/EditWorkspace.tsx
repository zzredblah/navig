'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { VideoPreview } from './VideoPreview';
import { VideoUploader } from './VideoUploader';
import { Timeline } from './Timeline';
import { ToolPanel } from './panels/ToolPanel';
import { TrimPanel } from './panels/TrimPanel';
import { TextPanel } from './panels/TextPanel';
import { FilterPanel } from './panels/FilterPanel';
import { SpeedPanel } from './panels/SpeedPanel';
import { AudioPanel } from './panels/AudioPanel';
import { WorkspaceToolbar } from './toolbar/WorkspaceToolbar';
import { PlaybackControls } from './toolbar/PlaybackControls';
import { Loader2 } from 'lucide-react';
import type { EditProjectWithDetails } from '@/types/editing';
import type { EditMetadata } from '@/types/editing';

interface EditWorkspaceProps {
  editProject: EditProjectWithDetails;
  projectId: string;
}

export function EditWorkspace({ editProject, projectId }: EditWorkspaceProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  const {
    initialize,
    reset,
    selectedTool,
    isDirty,
    isSaving,
    metadata,
    videoUrl,
    pushHistory,
    markSaved,
    setIsSaving,
    setVideoUrl,
    setVideoDuration,
  } = useEditWorkspaceStore();

  // 워크스페이스 초기화
  useEffect(() => {
    const videoUrl = editProject.source_video?.hls_url ||
      editProject.source_url ||
      null;

    const videoDuration = editProject.source_video?.duration ||
      editProject.original_duration ||
      0;

    initialize({
      editProjectId: editProject.id,
      projectId,
      title: editProject.title,
      videoUrl,
      videoDuration,
      metadata: editProject.edit_metadata as EditMetadata,
    });

    setIsInitialized(true);

    return () => {
      reset();
    };
  }, [editProject, projectId, initialize, reset]);

  // 자동 저장 (30초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty && !isSaving) {
        handleSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isDirty, isSaving]);

  // 키보드 단축키 (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          useEditWorkspaceStore.getState().redo();
        } else {
          useEditWorkspaceStore.getState().undo();
        }
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 저장 핸들러
  const handleSave = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    pushHistory();

    try {
      const res = await fetch(`/api/projects/${projectId}/edits/${editProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edit_metadata: metadata,
        }),
      });

      if (res.ok) {
        markSaved();
      }
    } catch (error) {
      console.error('저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, editProject.id, metadata, isSaving, pushHistory, markSaved, setIsSaving]);

  // 영상 업로드 완료 핸들러
  const handleUploadComplete = useCallback((uploadedUrl: string, duration: number) => {
    setVideoUrl(uploadedUrl);
    setVideoDuration(duration);
    // 페이지 새로고침하여 최신 데이터 로드
    router.refresh();
  }, [setVideoUrl, setVideoDuration, router]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // 도구 패널 렌더링
  const renderToolPanel = () => {
    switch (selectedTool) {
      case 'trim':
        return <TrimPanel />;
      case 'text':
        return <TextPanel />;
      case 'filter':
        return <FilterPanel />;
      case 'speed':
        return <SpeedPanel />;
      case 'audio':
        return <AudioPanel />;
      case 'subtitle':
        return (
          <div className="p-4 text-sm text-gray-500">
            자막 기능은 준비 중입니다
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* 상단 툴바 */}
      <WorkspaceToolbar
        title={editProject.title}
        projectId={projectId}
        editId={editProject.id}
        status={editProject.status}
        onSave={handleSave}
      />

      {/* 메인 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 도구 선택 */}
        <ToolPanel />

        {/* 중앙: 비디오 미리보기 또는 업로드 */}
        <div className="flex-1 flex flex-col bg-gray-900">
          {videoUrl ? (
            <>
              <div className="flex-1 flex items-center justify-center p-4">
                <VideoPreview />
              </div>
              <PlaybackControls />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <VideoUploader
                projectId={projectId}
                editProjectId={editProject.id}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          )}
        </div>

        {/* 우측: 도구 옵션 */}
        <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto">
          {renderToolPanel()}
        </div>
      </div>

      {/* 하단: 타임라인 */}
      <div className="h-32 border-t border-gray-200 bg-gray-50">
        <Timeline />
      </div>
    </div>
  );
}
