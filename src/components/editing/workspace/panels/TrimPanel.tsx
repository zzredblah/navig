'use client';

import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export function TrimPanel() {
  const {
    videoDuration,
    metadata,
    setTrimStart,
    setTrimEnd,
    setCurrentTime,
    pushHistory,
  } = useEditWorkspaceStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const mins = parseInt(parts[0], 10) || 0;
    const secParts = parts[1].split('.');
    const secs = parseInt(secParts[0], 10) || 0;
    const ms = parseInt(secParts[1] || '0', 10) || 0;
    return mins * 60 + secs + ms / 100;
  };

  const handleStartChange = (value: string) => {
    const time = parseTime(value);
    if (!isNaN(time)) {
      setTrimStart(time);
    }
  };

  const handleEndChange = (value: string) => {
    const time = parseTime(value);
    if (!isNaN(time)) {
      setTrimEnd(time);
    }
  };

  const handleSliderChange = (values: number[]) => {
    const [start, end] = values;
    setTrimStart(start);
    setTrimEnd(end);
  };

  const handleGoToStart = () => {
    setCurrentTime(metadata.trim.startTime);
  };

  const handleGoToEnd = () => {
    setCurrentTime(metadata.trim.endTime);
  };

  const handleReset = () => {
    pushHistory();
    setTrimStart(0);
    setTrimEnd(videoDuration);
  };

  const trimmedDuration = metadata.trim.endTime - metadata.trim.startTime;

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">자르기 (트림)</h3>
        <p className="text-xs text-gray-500 mb-4">
          영상의 시작과 끝 부분을 조정하세요
        </p>
      </div>

      {/* 슬라이더 */}
      <div className="space-y-2">
        <Label className="text-xs">범위</Label>
        <Slider
          value={[metadata.trim.startTime, metadata.trim.endTime]}
          min={0}
          max={videoDuration}
          step={0.1}
          onValueChange={handleSliderChange}
          className="w-full"
        />
      </div>

      {/* 시작 시간 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trim-start" className="text-xs">시작 시간</Label>
          <div className="flex gap-2">
            <Input
              id="trim-start"
              value={formatTime(metadata.trim.startTime)}
              onChange={(e) => handleStartChange(e.target.value)}
              className="text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleGoToStart}
              title="시작 위치로 이동"
            >
              이동
            </Button>
          </div>
        </div>

        {/* 끝 시간 */}
        <div className="space-y-2">
          <Label htmlFor="trim-end" className="text-xs">끝 시간</Label>
          <div className="flex gap-2">
            <Input
              id="trim-end"
              value={formatTime(metadata.trim.endTime)}
              onChange={(e) => handleEndChange(e.target.value)}
              className="text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleGoToEnd}
              title="끝 위치로 이동"
            >
              이동
            </Button>
          </div>
        </div>
      </div>

      {/* 정보 */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">원본 길이</span>
          <span className="font-medium">{formatTime(videoDuration)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">편집 후 길이</span>
          <span className="font-medium text-primary-600">
            {formatTime(trimmedDuration)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">제거되는 시간</span>
          <span className="font-medium text-red-500">
            -{formatTime(videoDuration - trimmedDuration)}
          </span>
        </div>
      </div>

      {/* 리셋 */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleReset}
      >
        원래대로
      </Button>
    </div>
  );
}
