'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  X,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Settings,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Hls from 'hls.js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { SubtitleOverlay } from './SubtitleOverlay';
import { SubtitleTimeline } from './SubtitleTimeline';
import { SubtitleSegmentList } from './SubtitleSegmentList';
import { SubtitleQualityCheck, checkSubtitleQuality } from './SubtitleQualityCheck';
import { cn } from '@/lib/utils';
import type { SubtitleSegment, VideoSubtitle, QualityIssue, SegmentUpdateRequest } from '@/types/subtitle';
import { sanitizeStreamUrl } from '@/lib/cloudflare/stream';

interface SubtitleEditorProps {
  subtitle: VideoSubtitle;
  videoUrl: string;
  hlsUrl?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (subtitle: VideoSubtitle) => void;
}

export function SubtitleEditor({
  subtitle,
  videoUrl,
  hlsUrl,
  open,
  onOpenChange,
  onSave,
}: SubtitleEditorProps) {
  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Editor state
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [editedSegments, setEditedSegments] = useState<Map<string, Partial<SubtitleSegment>>>(new Map());
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [qualityPanelOpen, setQualityPanelOpen] = useState(true);

  // Derived state
  const isDirty = editedSegments.size > 0;
  const qualityIssues = useMemo(() => checkSubtitleQuality(segments), [segments]);

  // Fetch segments when modal opens
  useEffect(() => {
    if (open && subtitle.id) {
      fetchSegments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subtitle.id]);

  // Initialize HLS player
  useEffect(() => {
    if (!open || !videoRef.current) return;

    const video = videoRef.current;
    const effectiveHlsUrl = hlsUrl || (videoUrl.includes('.m3u8') ? videoUrl : null);
    const cleanHlsSrc = effectiveHlsUrl ? sanitizeStreamUrl(effectiveHlsUrl) : null;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (cleanHlsSrc && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(cleanHlsSrc);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (cleanHlsSrc && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = cleanHlsSrc;
    } else {
      video.src = videoUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [open, videoUrl, hlsUrl]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      setSegments([]);
      setEditedSegments(new Map());
      setSelectedSegmentId(null);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [open]);

  const fetchSegments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai/subtitles/${subtitle.id}/segments`);
      if (!response.ok) throw new Error('Failed to fetch segments');
      const { data } = await response.json();
      setSegments(data || []);
    } catch (error) {
      console.error('Failed to fetch segments:', error);
      toast.error('세그먼트를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply local edits to segments for display
  const displaySegments = useMemo(() => {
    return segments.map((segment) => {
      const edits = editedSegments.get(segment.id);
      if (edits) {
        return { ...segment, ...edits };
      }
      return segment;
    });
  }, [segments, editedSegments]);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      // Wait for any pending play() to complete before pausing
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch {
          // Ignore - already failed
        }
        playPromiseRef.current = null;
      }
      video.pause();
    } else {
      try {
        playPromiseRef.current = video.play();
        await playPromiseRef.current;
      } catch (e) {
        // AbortError is expected when pause() is called during play()
        if (e instanceof DOMException && e.name === 'AbortError') {
          return;
        }
        console.error('[SubtitleEditor] Play failed:', e);
      } finally {
        playPromiseRef.current = null;
      }
    }
  }, [isPlaying]);

  // Segment editing handlers
  const handleTextChange = useCallback((segmentId: string, text: string) => {
    setEditedSegments((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(segmentId) || {};
      newMap.set(segmentId, { ...existing, text });
      return newMap;
    });

    // Also update the local segments for immediate display
    setSegments((prev) =>
      prev.map((s) => (s.id === segmentId ? { ...s, text } : s))
    );
  }, []);

  const handleTimeChange = useCallback(
    (segmentId: string, startTime: number, endTime: number) => {
      setEditedSegments((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(segmentId) || {};
        newMap.set(segmentId, { ...existing, start_time: startTime, end_time: endTime });
        return newMap;
      });

      // Update local segments
      setSegments((prev) =>
        prev.map((s) =>
          s.id === segmentId ? { ...s, start_time: startTime, end_time: endTime } : s
        )
      );
    },
    []
  );

  const handlePlaySegment = useCallback(async (segment: SubtitleSegment) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = segment.start_time;
    setSelectedSegmentId(segment.id);

    try {
      playPromiseRef.current = video.play();
      await playPromiseRef.current;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }
      console.error('[SubtitleEditor] Play segment failed:', e);
    } finally {
      playPromiseRef.current = null;
    }
  }, []);

  const handleDeleteSegment = useCallback(async (segmentId: string) => {
    try {
      const response = await fetch(
        `/api/ai/subtitles/${subtitle.id}/segments/${segmentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete segment');

      setSegments((prev) => prev.filter((s) => s.id !== segmentId));
      setEditedSegments((prev) => {
        const newMap = new Map(prev);
        newMap.delete(segmentId);
        return newMap;
      });

      toast.success('세그먼트가 삭제되었습니다');
    } catch (error) {
      console.error('Failed to delete segment:', error);
      toast.error('세그먼트 삭제에 실패했습니다');
    }
  }, [subtitle.id]);

  const handleSplitSegment = useCallback(
    async (segmentId: string, splitTime: number) => {
      try {
        const response = await fetch(
          `/api/ai/subtitles/${subtitle.id}/segments/${segmentId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'split', splitTime }),
          }
        );

        if (!response.ok) throw new Error('Failed to split segment');

        // Refresh segments
        await fetchSegments();
        toast.success('세그먼트가 분할되었습니다');
      } catch (error) {
        console.error('Failed to split segment:', error);
        toast.error('세그먼트 분할에 실패했습니다');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subtitle.id]
  );

  const handleMergeSegments = useCallback(
    async (segmentId: string, nextId: string) => {
      try {
        const response = await fetch(
          `/api/ai/subtitles/${subtitle.id}/segments/${segmentId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'merge', targetSegmentId: nextId }),
          }
        );

        if (!response.ok) throw new Error('Failed to merge segments');

        // Refresh segments
        await fetchSegments();
        toast.success('세그먼트가 병합되었습니다');
      } catch (error) {
        console.error('Failed to merge segments:', error);
        toast.error('세그먼트 병합에 실패했습니다');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subtitle.id]
  );

  const handleSelectSegment = useCallback((segmentId: string) => {
    setSelectedSegmentId(segmentId);
    const segment = segments.find((s) => s.id === segmentId);
    if (segment && videoRef.current) {
      videoRef.current.currentTime = segment.start_time;
    }
  }, [segments]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!isDirty) return;

    setIsSaving(true);
    try {
      const updates: SegmentUpdateRequest[] = Array.from(editedSegments.entries()).map(
        ([id, changes]) => ({
          id,
          ...changes,
        })
      );

      const response = await fetch(`/api/ai/subtitles/${subtitle.id}/segments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: updates }),
      });

      if (!response.ok) throw new Error('Failed to save changes');

      const { data, content } = await response.json();

      // Update local state
      setSegments(data);
      setEditedSegments(new Map());

      // Notify parent
      onSave?.({
        ...subtitle,
        content,
        is_auto_generated: false,
      });

      toast.success('변경사항이 저장되었습니다');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, editedSegments, subtitle, onSave]);

  // Reset changes
  const handleReset = useCallback(() => {
    setEditedSegments(new Map());
    fetchSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Download subtitle
  const handleDownload = useCallback(() => {
    window.open(`/api/ai/subtitles/${subtitle.id}?download=true`, '_blank');
  }, [subtitle.id]);

  // Handle issue click from quality panel
  const handleIssueClick = useCallback((segmentId: string) => {
    handleSelectSegment(segmentId);
    setQualityPanelOpen(false);
  }, [handleSelectSegment]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSave();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, togglePlay, handleSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              자막 편집기
              {isDirty && (
                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">
                  수정됨
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                title="다운로드"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubtitles(!showSubtitles)}
                title={showSubtitles ? '자막 숨기기' : '자막 보이기'}
              >
                {showSubtitles ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              {isDirty && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  title="변경사항 초기화"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-2">저장</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Video + Timeline */}
          <div className="w-1/2 flex flex-col border-r border-gray-200">
            {/* Video Player */}
            <div className="relative bg-black aspect-video flex-shrink-0">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              />
              <SubtitleOverlay
                segments={displaySegments}
                currentTime={currentTime}
                visible={showSubtitles}
              />
            </div>

            {/* Timeline */}
            <div className="p-4 border-t border-gray-200">
              <SubtitleTimeline
                segments={displaySegments}
                duration={duration}
                currentTime={currentTime}
                selectedSegmentId={selectedSegmentId}
                onSeek={handleSeek}
                onSelectSegment={handleSelectSegment}
                onSegmentTimeChange={handleTimeChange}
              />
            </div>

            {/* Quality Check Panel */}
            <Collapsible
              open={qualityPanelOpen}
              onOpenChange={setQualityPanelOpen}
              className="border-t border-gray-200"
            >
              <CollapsibleTrigger asChild>
                <button className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2">
                    {qualityIssues.length === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      품질 검사
                    </span>
                    {qualityIssues.length > 0 && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        {qualityIssues.length}
                      </span>
                    )}
                  </div>
                  {qualityPanelOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="max-h-48 overflow-y-auto p-4">
                  <SubtitleQualityCheck
                    segments={displaySegments}
                    onIssueClick={handleIssueClick}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Right Panel: Segment List */}
          <div className="w-1/2 flex flex-col overflow-hidden bg-gray-50">
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  세그먼트 ({displaySegments.length})
                </h3>
                <span className="text-xs text-gray-500">
                  더블클릭으로 편집
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <SubtitleSegmentList
                segments={displaySegments}
                currentTime={currentTime}
                selectedSegmentId={selectedSegmentId}
                qualityIssues={qualityIssues}
                onSelectSegment={handleSelectSegment}
                onTextChange={handleTextChange}
                onTimeChange={handleTimeChange}
                onPlaySegment={handlePlaySegment}
                onDeleteSegment={handleDeleteSegment}
                onSplitSegment={handleSplitSegment}
                onMergeSegments={handleMergeSegments}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
