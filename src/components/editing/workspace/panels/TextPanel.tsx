'use client';

import { useState } from 'react';
import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TextOverlay } from '@/types/editing';

const DEFAULT_OVERLAY: Omit<TextOverlay, 'id'> = {
  text: '텍스트를 입력하세요',
  startTime: 0,
  endTime: 5,
  position: { x: 50, y: 50 },
  style: {
    fontSize: 24,
    color: '#ffffff',
    backgroundColor: undefined,
    fontWeight: 'normal',
  },
};

const PRESET_COLORS = [
  '#ffffff',
  '#000000',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#ff00ff',
  '#00ffff',
];

export function TextPanel() {
  const {
    metadata,
    currentTime,
    videoDuration,
    selectedOverlayId,
    selectionRange,
    setSelectedOverlayId,
    addTextOverlay,
    updateTextOverlay,
    removeTextOverlay,
    pushHistory,
    clearSelectionRange,
  } = useEditWorkspaceStore();

  const selectedOverlay = metadata.textOverlays.find(
    (o) => o.id === selectedOverlayId
  );

  const handleAddOverlay = () => {
    pushHistory();

    let startTime: number;
    let endTime: number;

    // 타임라인에서 범위가 선택되어 있으면 해당 범위 사용
    if (selectionRange && selectionRange.endTime > selectionRange.startTime) {
      startTime = selectionRange.startTime;
      endTime = selectionRange.endTime;
      clearSelectionRange(); // 사용 후 선택 해제
    } else {
      // 선택 범위 없으면 현재 시간부터 5초
      startTime = Math.max(0, currentTime);
      endTime = Math.min(videoDuration, startTime + 5);
    }

    addTextOverlay({
      ...DEFAULT_OVERLAY,
      startTime,
      endTime,
    });
  };

  const handleRemoveOverlay = (id: string) => {
    pushHistory();
    removeTextOverlay(id);
  };

  const handleUpdateOverlay = (updates: Partial<TextOverlay>) => {
    if (!selectedOverlayId) return;
    updateTextOverlay(selectedOverlayId, updates);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">텍스트</h3>
        <p className="text-xs text-gray-500 mb-4">
          영상에 텍스트 오버레이를 추가하세요
        </p>
      </div>

      {/* 추가 버튼 */}
      <Button onClick={handleAddOverlay} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        텍스트 추가
      </Button>

      {/* 선택 범위 안내 */}
      {selectionRange && selectionRange.endTime > selectionRange.startTime && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          선택된 구간 ({formatTime(selectionRange.startTime)} - {formatTime(selectionRange.endTime)})에 텍스트가 추가됩니다
        </div>
      )}

      {/* 오버레이 목록 */}
      {metadata.textOverlays.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">텍스트 목록</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {metadata.textOverlays.map((overlay) => (
              <div
                key={overlay.id}
                onClick={() => setSelectedOverlayId(overlay.id)}
                className={cn(
                  'flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors',
                  selectedOverlayId === overlay.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <Type className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{overlay.text}</p>
                  <p className="text-xs text-gray-500">
                    {formatTime(overlay.startTime)} - {formatTime(overlay.endTime)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveOverlay(overlay.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 선택된 오버레이 편집 */}
      {selectedOverlay && (
        <div className="space-y-4 border-t pt-4">
          <Label className="text-xs font-medium">텍스트 편집</Label>

          {/* 텍스트 입력 */}
          <div className="space-y-2">
            <Label htmlFor="overlay-text" className="text-xs">
              내용
            </Label>
            <Textarea
              id="overlay-text"
              value={selectedOverlay.text}
              onChange={(e) => handleUpdateOverlay({ text: e.target.value })}
              rows={2}
              className="text-sm"
            />
          </div>

          {/* 시간 범위 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">시작</Label>
              <Input
                type="number"
                value={selectedOverlay.startTime}
                onChange={(e) =>
                  handleUpdateOverlay({ startTime: parseFloat(e.target.value) || 0 })
                }
                min={0}
                max={selectedOverlay.endTime}
                step={0.1}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">끝</Label>
              <Input
                type="number"
                value={selectedOverlay.endTime}
                onChange={(e) =>
                  handleUpdateOverlay({ endTime: parseFloat(e.target.value) || 0 })
                }
                min={selectedOverlay.startTime}
                max={videoDuration}
                step={0.1}
                className="text-sm"
              />
            </div>
          </div>

          {/* 위치 */}
          <div className="space-y-2">
            <Label className="text-xs">위치</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-xs text-gray-500">X: {selectedOverlay.position.x}%</span>
                <Slider
                  value={[selectedOverlay.position.x]}
                  min={0}
                  max={100}
                  onValueChange={(v) =>
                    handleUpdateOverlay({
                      position: { ...selectedOverlay.position, x: v[0] },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-500">Y: {selectedOverlay.position.y}%</span>
                <Slider
                  value={[selectedOverlay.position.y]}
                  min={0}
                  max={100}
                  onValueChange={(v) =>
                    handleUpdateOverlay({
                      position: { ...selectedOverlay.position, y: v[0] },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* 글자 크기 */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">글자 크기</Label>
              <span className="text-xs text-gray-500">{selectedOverlay.style.fontSize}px</span>
            </div>
            <Slider
              value={[selectedOverlay.style.fontSize]}
              min={12}
              max={72}
              onValueChange={(v) =>
                handleUpdateOverlay({
                  style: { ...selectedOverlay.style, fontSize: v[0] },
                })
              }
            />
          </div>

          {/* 글자 색상 */}
          <div className="space-y-2">
            <Label className="text-xs" id="color-picker-label">글자 색상</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="color-picker-label">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={selectedOverlay.style.color === color}
                  aria-label={`색상 ${color}`}
                  onClick={() =>
                    handleUpdateOverlay({
                      style: { ...selectedOverlay.style, color },
                    })
                  }
                  className={cn(
                    'w-6 h-6 rounded border-2 transition-transform',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                    selectedOverlay.style.color === color
                      ? 'border-primary-500 scale-110'
                      : 'border-gray-200'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
              <Input
                type="color"
                value={selectedOverlay.style.color}
                onChange={(e) =>
                  handleUpdateOverlay({
                    style: { ...selectedOverlay.style, color: e.target.value },
                  })
                }
                className="w-6 h-6 p-0 border-0"
                aria-label="사용자 지정 색상 선택"
              />
            </div>
          </div>
        </div>
      )}

      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          텍스트 오버레이는 미리보기에서 확인할 수 있습니다.
          영상 위 드래그로 위치를 조정할 수도 있습니다.
        </p>
      </div>
    </div>
  );
}
