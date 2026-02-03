'use client';

import { useState, useEffect } from 'react';
import { Loader2, Video, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { EditProjectWithDetails } from '@/types/editing';

interface VideoVersion {
  id: string;
  version_name: string | null;
  version_number: number;
  original_filename: string;
  thumbnail_url: string | null;
  duration: number | null;
}

interface CreateEditModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: EditProjectWithDetails) => void;
}

export function CreateEditModal({
  projectId,
  isOpen,
  onClose,
  onCreated,
}: CreateEditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<'existing' | 'upload'>('existing');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoVersion[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 기존 영상 목록 로드
  useEffect(() => {
    if (isOpen && sourceType === 'existing') {
      setIsLoadingVideos(true);
      fetch(`/api/projects/${projectId}/videos?status=ready`)
        .then((res) => res.json())
        .then((data) => {
          setVideos(data.data || []);
        })
        .catch((err) => {
          console.error('영상 목록 조회 실패:', err);
        })
        .finally(() => {
          setIsLoadingVideos(false);
        });
    }
  }, [isOpen, sourceType, projectId]);

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setSourceType('existing');
      setSelectedVideoId(null);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!title.trim()) return;

    if (sourceType === 'existing' && !selectedVideoId) {
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/edits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          source_video_id: sourceType === 'existing' ? selectedVideoId : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onCreated(data.data);
      } else {
        const error = await res.json();
        console.error('생성 실패:', error);
      }
    } catch (error) {
      console.error('생성 오류:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>새 편집 프로젝트</DialogTitle>
          <DialogDescription>
            편집할 영상을 선택하거나 새로 업로드하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="편집 프로젝트 제목"
            />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="편집 내용에 대한 설명 (선택)"
              rows={2}
            />
          </div>

          {/* 소스 타입 선택 */}
          <div className="space-y-2">
            <Label>영상 소스</Label>
            <RadioGroup
              value={sourceType}
              onValueChange={(v) => setSourceType(v as 'existing' | 'upload')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="cursor-pointer">
                  기존 영상 선택
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upload" id="upload" />
                <Label htmlFor="upload" className="cursor-pointer">
                  새 영상 업로드
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 기존 영상 선택 */}
          {sourceType === 'existing' && (
            <div className="space-y-2">
              <Label>영상 선택 *</Label>
              {isLoadingVideos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <Video className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    프로젝트에 등록된 영상이 없습니다
                  </p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {videos.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => setSelectedVideoId(video.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                        selectedVideoId === video.id
                          ? 'bg-primary-50 border border-primary-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      )}
                    >
                      <div className="w-16 h-10 bg-gray-100 rounded overflow-hidden shrink-0">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {video.version_name || video.original_filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          v{video.version_number} · {formatDuration(video.duration)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 새 영상 업로드 */}
          {sourceType === 'upload' && (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2">
                영상 업로드는 편집 워크스페이스에서 진행됩니다
              </p>
              <p className="text-xs text-gray-400">
                먼저 편집 프로젝트를 생성한 후, 워크스페이스에서 영상을 업로드하세요
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            취소
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              isCreating ||
              !title.trim() ||
              (sourceType === 'existing' && !selectedVideoId)
            }
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              '생성'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
