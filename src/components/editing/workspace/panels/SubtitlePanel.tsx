'use client';

import { useState, useEffect, useRef } from 'react';
import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import {
  Sparkles,
  Loader2,
  FileVideo,
  Play,
  Trash2,
  AlertCircle,
  Check,
  RefreshCw,
  Download,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { SubtitleSegment, VideoSubtitle } from '@/types/subtitle';
import { SUBTITLE_LANGUAGES } from '@/types/subtitle';
import type { TextOverlay } from '@/types/editing';

interface SubtitlePanelProps {
  editProjectId: string;
  sourceVideoId: string | null;
  videoUrl: string | null;
  hlsUrl: string | null;
}

type ViewMode = 'empty' | 'generating' | 'editing';

export function SubtitlePanel({
  editProjectId,
  sourceVideoId,
  videoUrl,
  hlsUrl,
}: SubtitlePanelProps) {
  const {
    currentTime,
    setCurrentTime,
    setSubtitleId,
    metadata,
    addTextOverlayWithId,
    removeTextOverlay,
    removeTextOverlaysByPrefix,
    videoDuration,
    pushHistory,
    setSubtitleSegments,
    subtitleSegments: storeSegments,
  } = useEditWorkspaceStore();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('empty');
  const [subtitle, setSubtitle] = useState<VideoSubtitle | null>(null);
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  // Generation state
  const [selectedLanguage, setSelectedLanguage] = useState('ko');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const segmentListRef = useRef<HTMLDivElement>(null);

  // 초기 로드 - 기존 자막 확인
  useEffect(() => {
    if (editProjectId) {
      fetchExistingSubtitle();
    }
  }, [editProjectId]);

  // metadata.subtitleId 변경 시 자막 다시 로드
  useEffect(() => {
    if (metadata.subtitleId && !subtitle) {
      fetchSubtitleById(metadata.subtitleId);
    }
  }, [metadata.subtitleId]);

  // 타임라인에서 자막 시간이 변경되면 로컬 상태 동기화
  useEffect(() => {
    if (storeSegments.length > 0 && segments.length > 0) {
      // 시간이 변경된 세그먼트만 업데이트
      const updatedSegments = segments.map(seg => {
        const storeSeg = storeSegments.find(s => s.id === seg.id);
        if (storeSeg && (storeSeg.start_time !== seg.start_time || storeSeg.end_time !== seg.end_time)) {
          return { ...seg, start_time: storeSeg.start_time, end_time: storeSeg.end_time };
        }
        return seg;
      });

      // 실제로 변경이 있을 때만 업데이트
      const hasChanges = updatedSegments.some((seg, i) =>
        seg.start_time !== segments[i].start_time || seg.end_time !== segments[i].end_time
      );

      if (hasChanges) {
        setSegments(updatedSegments);
      }
    }
  }, [storeSegments]);

  const fetchExistingSubtitle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai/subtitles?edit_project_id=${editProjectId}`);
      if (response.ok) {
        const { data } = await response.json();
        if (data && data.length > 0) {
          const latestSubtitle = data[0];
          setSubtitle(latestSubtitle);
          setSubtitleId(latestSubtitle.id);
          await fetchSegments(latestSubtitle.id);
          setViewMode('editing');
        } else {
          setViewMode('empty');
        }
      }
    } catch (err) {
      console.error('Failed to fetch subtitle:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubtitleById = async (subtitleId: string) => {
    try {
      const response = await fetch(`/api/ai/subtitles/${subtitleId}`);
      if (response.ok) {
        const { data } = await response.json();
        setSubtitle(data);
        await fetchSegments(subtitleId);
        setViewMode('editing');
      }
    } catch (err) {
      console.error('Failed to fetch subtitle:', err);
    }
  };

  const fetchSegments = async (subtitleId: string) => {
    try {
      const response = await fetch(`/api/ai/subtitles/${subtitleId}/segments`);
      if (response.ok) {
        const { data } = await response.json();
        const segmentData = data || [];
        setSegments(segmentData);
        // 타임라인 표시용으로 store에도 저장
        setSubtitleSegments(segmentData);
      }
    } catch (err) {
      console.error('Failed to fetch segments:', err);
    }
  };

  // 자막 생성
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setViewMode('generating');

    try {
      const requestBody: Record<string, string> = {
        language: selectedLanguage,
        format: 'srt',
      };

      if (sourceVideoId) {
        requestBody.video_version_id = sourceVideoId;
      } else {
        requestBody.edit_project_id = editProjectId;
      }

      const response = await fetch('/api/ai/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '자막 생성에 실패했습니다');
      }

      setSubtitle(result.data);
      setSubtitleId(result.data.id);
      await fetchSegments(result.data.id);
      setViewMode('editing');
      toast.success('자막이 생성되었습니다');
    } catch (err) {
      setError(err instanceof Error ? err.message : '자막 생성에 실패했습니다');
      setViewMode('empty');
    } finally {
      setIsGenerating(false);
    }
  };

  // 세그먼트 클릭 - 해당 시간으로 이동
  const handleSegmentClick = (segment: SubtitleSegment) => {
    setSelectedSegmentId(segment.id);
    setCurrentTime(segment.start_time);
  };

  // 세그먼트 더블클릭 - 편집 모드
  const handleSegmentDoubleClick = (segment: SubtitleSegment) => {
    setEditingSegmentId(segment.id);
    setEditText(segment.text);
    setEditStartTime(formatTimeForInput(segment.start_time));
    setEditEndTime(formatTimeForInput(segment.end_time));
  };

  // 시간 입력용 포맷 (mm:ss.cc)
  const formatTimeForInput = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // 입력 문자열을 초 단위로 파싱
  const parseTimeInput = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const mins = parseInt(parts[0], 10) || 0;
    const secParts = parts[1].split('.');
    const secs = parseInt(secParts[0], 10) || 0;
    const ms = parseInt(secParts[1] || '0', 10) || 0;
    return mins * 60 + secs + ms / 100;
  };

  // 세그먼트 저장 (텍스트 + 시간)
  const handleSaveSegment = async (segmentId: string) => {
    if (!subtitle) return;

    const newStartTime = parseTimeInput(editStartTime);
    const newEndTime = parseTimeInput(editEndTime);

    // 유효성 검사
    if (newStartTime >= newEndTime) {
      toast.error('시작 시간은 종료 시간보다 작아야 합니다');
      return;
    }
    if (newStartTime < 0 || newEndTime > videoDuration) {
      toast.error('시간이 영상 범위를 벗어났습니다');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/ai/subtitles/${subtitle.id}/segments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: [{
            id: segmentId,
            text: editText,
            start_time: newStartTime,
            end_time: newEndTime,
          }],
        }),
      });

      if (!response.ok) throw new Error('저장 실패');

      // 로컬 상태 업데이트
      const updatedSegments = segments.map(s =>
        s.id === segmentId
          ? { ...s, text: editText, start_time: newStartTime, end_time: newEndTime }
          : s
      );
      setSegments(updatedSegments);
      setSubtitleSegments(updatedSegments); // 타임라인 동기화
      setEditingSegmentId(null);
      toast.success('저장되었습니다');
    } catch (err) {
      toast.error('저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  // 세그먼트 삭제
  const handleDeleteSegment = async (segmentId: string) => {
    if (!subtitle) return;

    try {
      const response = await fetch(
        `/api/ai/subtitles/${subtitle.id}/segments/${segmentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('삭제 실패');

      // 로컬 상태 업데이트
      const newSegments = segments.filter(s => s.id !== segmentId);
      setSegments(newSegments);
      // 타임라인 동기화
      setSubtitleSegments(newSegments);

      // 영상에 적용된 자막 오버레이도 제거
      removeTextOverlay(`subtitle-${segmentId}`);

      toast.success('삭제되었습니다');
    } catch (err) {
      toast.error('삭제에 실패했습니다');
    }
  };

  // 자막 다운로드
  const handleDownload = () => {
    if (subtitle) {
      window.open(`/api/ai/subtitles/${subtitle.id}?download=true`, '_blank');
    }
  };

  // 자막 재생성
  const handleRegenerate = async () => {
    if (subtitle) {
      // 기존 자막 삭제
      await fetch(`/api/ai/subtitles/${subtitle.id}`, { method: 'DELETE' });
      setSubtitle(null);
      setSegments([]);
      setSubtitleId(null);
      setSubtitleSegments([]); // 타임라인에서도 제거
    }
    handleGenerate();
  };

  // 시간 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // 현재 활성 세그먼트 찾기
  const activeSegment = segments.find(
    s => currentTime >= s.start_time && currentTime <= s.end_time
  );

  // 자막을 텍스트 오버레이로 변환 (영상에 적용)
  const handleApplyToVideo = () => {
    if (segments.length === 0) {
      toast.error('적용할 자막이 없습니다');
      return;
    }

    pushHistory();

    // 기존 자막 오버레이 한 번에 삭제 (subtitle- 접두사로 식별)
    removeTextOverlaysByPrefix('subtitle-');

    // 각 세그먼트를 텍스트 오버레이로 추가 (subtitle- 접두사 사용)
    let addedCount = 0;
    for (const segment of segments) {
      const overlay: Omit<TextOverlay, 'id'> = {
        text: segment.text,
        startTime: segment.start_time,
        endTime: segment.end_time,
        position: { x: 50, y: 85 }, // 하단 중앙
        style: {
          fontSize: 24,
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.7)',
          fontWeight: 'normal',
        },
      };
      addTextOverlayWithId(`subtitle-${segment.id}`, overlay);
      addedCount++;
    }

    toast.success(`${addedCount}개의 자막이 영상에 적용되었습니다`);
  };

  // 적용된 자막 제거
  const handleRemoveFromVideo = () => {
    if (appliedSubtitleCount === 0) {
      toast.error('적용된 자막이 없습니다');
      return;
    }

    pushHistory();

    // 한 번에 모든 subtitle- 접두사 오버레이 제거
    const removedCount = removeTextOverlaysByPrefix('subtitle-');

    toast.success(`${removedCount}개의 자막이 제거되었습니다`);
  };

  // 적용된 자막 개수
  const appliedSubtitleCount = metadata.textOverlays.filter(
    o => o.id.startsWith('subtitle-')
  ).length;

  // 영상 URL 없는 경우
  if (!videoUrl && !hlsUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <FileVideo className="h-6 w-6 text-gray-400" />
        </div>
        <h4 className="font-medium text-gray-900 mb-2">영상 업로드 필요</h4>
        <p className="text-sm text-gray-500">
          자막을 생성하려면 먼저 영상을 업로드해주세요.
        </p>
      </div>
    );
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // 자막 생성 중
  if (viewMode === 'generating') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
        <h4 className="font-medium text-gray-900 mb-2">AI가 자막을 생성하고 있습니다</h4>
        <p className="text-sm text-gray-500">
          영상 길이에 따라 시간이 걸릴 수 있습니다...
        </p>
      </div>
    );
  }

  // 자막 없음 - 생성 UI
  if (viewMode === 'empty') {
    return (
      <div className="h-full flex flex-col">
        {/* 헤더 */}
        <div className="p-3 border-b border-gray-100 shrink-0">
          <h3 className="font-medium text-gray-900 text-sm">AI 자막 생성</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            음성을 자동으로 텍스트로 변환합니다
          </p>
        </div>

        {/* 본문 - 상단 정렬 */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* 아이콘 + 설명 */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-6 w-6 text-primary-500" />
            </div>
            <p className="text-sm text-gray-600">
              AI가 영상의 음성을 분석하여<br />
              자동으로 자막을 생성합니다
            </p>
          </div>

          {/* 언어 선택 */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                언어 선택
              </label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBTITLE_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-primary-600 hover:bg-primary-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              자막 생성하기
            </Button>
          </div>

          {/* 안내 */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              Whisper AI를 사용하여 정확한 자막을 생성합니다.
              영상 길이에 따라 시간이 소요될 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 자막 편집 모드
  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900 text-sm">자막 편집</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDownload}
              title="다운로드"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRegenerate}
              title="다시 생성"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          {segments.length}개 세그먼트 | 더블클릭으로 편집
        </p>
        {/* 영상에 자막 적용/제거 버튼 */}
        <div className="flex gap-2">
          <Button
            onClick={handleApplyToVideo}
            disabled={segments.length === 0}
            size="sm"
            className="flex-1 bg-primary-600 hover:bg-primary-700"
          >
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            자막 적용
          </Button>
          <Button
            onClick={handleRemoveFromVideo}
            disabled={appliedSubtitleCount === 0}
            size="sm"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            제거 ({appliedSubtitleCount})
          </Button>
        </div>
      </div>

      {/* 세그먼트 목록 */}
      <div
        ref={segmentListRef}
        className="flex-1 overflow-y-auto"
      >
        {segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">세그먼트가 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {segments.map((segment, index) => {
              const isActive = activeSegment?.id === segment.id;
              const isSelected = selectedSegmentId === segment.id;
              const isEditing = editingSegmentId === segment.id;

              return (
                <div
                  key={segment.id}
                  className={cn(
                    "group p-3 cursor-pointer transition-colors",
                    isActive && "bg-primary-50",
                    isSelected && !isActive && "bg-gray-50",
                    !isActive && !isSelected && "hover:bg-gray-50"
                  )}
                  onClick={() => handleSegmentClick(segment)}
                  onDoubleClick={() => handleSegmentDoubleClick(segment)}
                >
                  {/* 시간 표시 */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-gray-400">
                        #{index + 1}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSegmentClick(segment);
                          // Play from this segment
                          const store = useEditWorkspaceStore.getState();
                          store.setIsPlaying(true);
                        }}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-red-500 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSegment(segment.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* 텍스트 및 시간 편집 */}
                  {isEditing ? (
                    <div className="space-y-3">
                      {/* 시간 편집 */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 mb-0.5 block">시작</label>
                          <input
                            type="text"
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className="w-full px-2 py-1 text-xs font-mono border border-gray-200 rounded bg-white text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            placeholder="0:00.00"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <span className="text-gray-400 mt-4">-</span>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 mb-0.5 block">종료</label>
                          <input
                            type="text"
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            className="w-full px-2 py-1 text-xs font-mono border border-gray-200 rounded bg-white text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            placeholder="0:00.00"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      {/* 텍스트 편집 */}
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="text-sm min-h-[60px] resize-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingSegmentId(null);
                          }
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleSaveSegment(segment.id);
                          }
                        }}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSegmentId(null);
                          }}
                        >
                          취소
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveSegment(segment.id);
                          }}
                          disabled={isSaving}
                          className="bg-primary-600 hover:bg-primary-700"
                        >
                          {isSaving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          <span className="ml-1">저장</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className={cn(
                      "text-sm leading-relaxed",
                      isActive ? "text-primary-900" : "text-gray-700"
                    )}>
                      {segment.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 현재 자막 미리보기 */}
      {activeSegment && (
        <div className="p-3 border-t border-gray-200 bg-gray-900 shrink-0">
          <p className="text-sm text-white text-center">
            {activeSegment.text}
          </p>
        </div>
      )}
    </div>
  );
}
