'use client';

import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SPEED_PRESETS } from '@/types/editing';

export function SpeedPanel() {
  const { metadata, setSpeed, pushHistory } = useEditWorkspaceStore();

  const handlePresetClick = (value: number) => {
    pushHistory();
    setSpeed(value);
  };

  const handleSliderChange = (values: number[]) => {
    setSpeed(values[0]);
  };

  const handleReset = () => {
    pushHistory();
    setSpeed(1);
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">재생 속도</h3>
        <p className="text-xs text-gray-500 mb-4">
          영상의 재생 속도를 조정하세요
        </p>
      </div>

      {/* 현재 속도 */}
      <div className="text-center">
        <div className="text-4xl font-bold text-primary-600">
          {metadata.speed}x
        </div>
        <p className="text-xs text-gray-500 mt-1">현재 속도</p>
      </div>

      {/* 슬라이더 */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>0.25x</span>
          <span>4x</span>
        </div>
        <Slider
          value={[metadata.speed]}
          min={0.25}
          max={4}
          step={0.25}
          onValueChange={handleSliderChange}
          className="w-full"
        />
      </div>

      {/* 프리셋 버튼 */}
      <div className="space-y-2">
        <Label className="text-xs">프리셋</Label>
        <div className="grid grid-cols-4 gap-2">
          {SPEED_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick(preset.value)}
              className={cn(
                'text-xs',
                metadata.speed === preset.value && 'border-primary-500 bg-primary-50 text-primary-600'
              )}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 정보 */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
        {metadata.speed < 1 && (
          <p className="text-blue-600">
            슬로우 모션 효과가 적용됩니다
          </p>
        )}
        {metadata.speed > 1 && (
          <p className="text-orange-600">
            타임랩스 효과가 적용됩니다
          </p>
        )}
        {metadata.speed === 1 && (
          <p className="text-gray-500">
            원래 속도로 재생됩니다
          </p>
        )}
      </div>

      {/* 리셋 */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleReset}
        disabled={metadata.speed === 1}
      >
        원래대로 (1x)
      </Button>
    </div>
  );
}
