'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Sparkles,
  Download,
  Trash2,
  AlertCircle,
  Check,
  Languages,
  FileText,
  Clock,
  RefreshCw,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { VideoSubtitle } from '@/types/subtitle';
import { SUBTITLE_LANGUAGES } from '@/types/subtitle';
import { SubtitleEditor } from './SubtitleEditor';

interface SubtitleGeneratorProps {
  videoVersionId?: string;
  editProjectId?: string;
  videoUrl?: string;
  hlsUrl?: string;
  onSubtitleGenerated?: (subtitle: VideoSubtitle) => void;
  onSubtitleUpdated?: (subtitle: VideoSubtitle) => void;
}

export function SubtitleGenerator({
  videoVersionId,
  editProjectId,
  videoUrl,
  hlsUrl,
  onSubtitleGenerated,
  onSubtitleUpdated,
}: SubtitleGeneratorProps) {
  // videoVersionId 또는 editProjectId 중 하나가 필요
  const sourceId = videoVersionId || editProjectId;
  const sourceType = videoVersionId ? 'video_version' : 'edit_project';
  const [subtitles, setSubtitles] = useState<VideoSubtitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('ko');
  const [selectedFormat, setSelectedFormat] = useState<'srt' | 'vtt' | 'json'>('srt');
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subtitleToDelete, setSubtitleToDelete] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState<VideoSubtitle | null>(null);

  const fetchSubtitles = useCallback(async () => {
    if (!sourceId) return;

    try {
      const queryParam = sourceType === 'video_version'
        ? `video_version_id=${sourceId}`
        : `edit_project_id=${sourceId}`;
      const response = await fetch(`/api/ai/subtitles?${queryParam}`);
      if (response.ok) {
        const { data } = await response.json();
        setSubtitles(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch subtitles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sourceId, sourceType]);

  useEffect(() => {
    setMounted(true);
    if (sourceId) {
      fetchSubtitles();
    }
  }, [sourceId, fetchSubtitles]);

  const handleGenerate = async () => {
    if (!sourceId) return;

    setIsGenerating(true);
    setError(null);

    try {
      const requestBody: {
        video_version_id?: string;
        edit_project_id?: string;
        language: string;
        format: string;
      } = {
        language: selectedLanguage,
        format: selectedFormat,
      };

      if (sourceType === 'video_version') {
        requestBody.video_version_id = sourceId;
      } else {
        requestBody.edit_project_id = sourceId;
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

      setSubtitles((prev) => [result.data, ...prev.filter((s) => s.id !== result.data.id)]);
      onSubtitleGenerated?.(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '자막 생성에 실패했습니다');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (subtitleId: string, format?: string) => {
    window.open(`/api/ai/subtitles/${subtitleId}?download=true${format ? `&format=${format}` : ''}`, '_blank');
  };

  const handleEdit = (subtitle: VideoSubtitle) => {
    setEditingSubtitle(subtitle);
  };

  const handleEditorSave = (updatedSubtitle: VideoSubtitle) => {
    setSubtitles((prev) =>
      prev.map((s) => (s.id === updatedSubtitle.id ? updatedSubtitle : s))
    );
    onSubtitleUpdated?.(updatedSubtitle);
  };

  const handleDelete = async () => {
    if (!subtitleToDelete) return;

    try {
      const response = await fetch(`/api/ai/subtitles/${subtitleToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSubtitles((prev) => prev.filter((s) => s.id !== subtitleToDelete));
      }
    } catch (err) {
      console.error('Failed to delete subtitle:', err);
    } finally {
      setDeleteDialogOpen(false);
      setSubtitleToDelete(null);
    }
  };

  const getLanguageName = (code: string) => {
    const lang = SUBTITLE_LANGUAGES.find((l) => l.code === code);
    return lang?.nativeName || code;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-100 rounded-lg w-1/3" />
        <div className="h-24 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI 자막</h3>
          <p className="text-sm text-gray-500">AI가 영상의 음성을 자동으로 자막으로 변환합니다</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-32">
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

          <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as 'srt' | 'vtt' | 'json')}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="srt">SRT</SelectItem>
              <SelectItem value="vtt">VTT</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                자막 생성
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : subtitles.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Languages className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">아직 생성된 자막이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">
            위에서 언어를 선택하고 자막을 생성해보세요
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {subtitles.map((subtitle) => (
            <div
              key={subtitle.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {getLanguageName(subtitle.language)}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 uppercase">
                      {subtitle.format}
                    </span>
                    {subtitle.status === 'processing' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-700">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        처리 중
                      </span>
                    )}
                    {subtitle.status === 'completed' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700">
                        <Check className="h-3 w-3" />
                        완료
                      </span>
                    )}
                    {subtitle.status === 'failed' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700">
                        <AlertCircle className="h-3 w-3" />
                        실패
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    {subtitle.duration_seconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(subtitle.duration_seconds)}
                      </span>
                    )}
                    {subtitle.word_count && (
                      <span>{subtitle.word_count.toLocaleString()}단어</span>
                    )}
                    {subtitle.confidence_score && (
                      <span>신뢰도 {Math.round(subtitle.confidence_score * 100)}%</span>
                    )}
                    {!subtitle.is_auto_generated && (
                      <span className="text-primary-600">수정됨</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {subtitle.status === 'completed' && (
                  <>
                    {(videoUrl || hlsUrl) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(subtitle)}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        편집
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(subtitle.id)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      다운로드
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSubtitleToDelete(subtitle.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {subtitle.status === 'processing' && (
                  <Button variant="ghost" size="sm" onClick={fetchSubtitles}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>자막 삭제</DialogTitle>
            <DialogDescription>
              이 자막을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subtitle Editor Modal */}
      {editingSubtitle && (videoUrl || hlsUrl) && (
        <SubtitleEditor
          subtitle={editingSubtitle}
          videoUrl={videoUrl || hlsUrl || ''}
          hlsUrl={hlsUrl}
          open={!!editingSubtitle}
          onOpenChange={(open) => {
            if (!open) setEditingSubtitle(null);
          }}
          onSave={handleEditorSave}
        />
      )}
    </div>
  );
}
