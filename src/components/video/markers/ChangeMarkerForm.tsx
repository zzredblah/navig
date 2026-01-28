'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import {
  type ChangeMarkerType,
  MARKER_TYPE_COLORS,
  MARKER_TYPE_LABELS,
  formatMarkerTime,
} from '@/types/change-marker';

interface ChangeMarkerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: ChangeMarkerType;
    start_time: number;
    end_time: number;
    description?: string;
  }) => Promise<void>;
  initialStartTime?: number;
  initialEndTime?: number;
  videoDuration: number;
}

const markerTypes: ChangeMarkerType[] = ['visual', 'audio', 'text', 'effect', 'other'];

export function ChangeMarkerForm({
  isOpen,
  onClose,
  onSubmit,
  initialStartTime = 0,
  initialEndTime,
  videoDuration,
}: ChangeMarkerFormProps) {
  const [type, setType] = useState<ChangeMarkerType>('visual');
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime ?? initialStartTime + 5);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 초기값 설정
  useEffect(() => {
    if (isOpen) {
      setStartTime(initialStartTime);
      setEndTime(initialEndTime ?? Math.min(initialStartTime + 5, videoDuration));
      setDescription('');
      setType('visual');
    }
  }, [isOpen, initialStartTime, initialEndTime, videoDuration]);

  // 시간 입력 변환 (mm:ss 형식 지원)
  const parseTime = (value: string): number => {
    if (value.includes(':')) {
      const [mins, secs] = value.split(':').map(Number);
      return (mins || 0) * 60 + (secs || 0);
    }
    return parseFloat(value) || 0;
  };

  const handleSubmit = async () => {
    if (endTime < startTime) {
      alert('종료 시간은 시작 시간보다 커야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        start_time: startTime,
        end_time: endTime,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('마커 생성 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>변경 구간 마커 추가</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 유형 선택 */}
          <div className="space-y-2">
            <Label>유형</Label>
            <Select value={type} onValueChange={(v) => setType(v as ChangeMarkerType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {markerTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: MARKER_TYPE_COLORS[t] }}
                      />
                      {MARKER_TYPE_LABELS[t]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 시간 범위 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>시작 시간</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={formatMarkerTime(startTime)}
                  onChange={(e) => setStartTime(parseTime(e.target.value))}
                  placeholder="0:00"
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">
                  ({startTime.toFixed(1)}s)
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>종료 시간</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={formatMarkerTime(endTime)}
                  onChange={(e) => setEndTime(parseTime(e.target.value))}
                  placeholder="0:00"
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">
                  ({endTime.toFixed(1)}s)
                </span>
              </div>
            </div>
          </div>

          {/* 길이 표시 */}
          <p className="text-sm text-gray-500">
            구간 길이: {(endTime - startTime).toFixed(1)}초
          </p>

          {/* 설명 */}
          <div className="space-y-2">
            <Label>설명 (선택)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="변경 내용을 설명해주세요..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
