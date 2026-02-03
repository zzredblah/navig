'use client';

import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FILTER_PRESETS, type FilterSettings } from '@/types/editing';

export function FilterPanel() {
  const { metadata, setFilter, setFilters, resetFilters, pushHistory } = useEditWorkspaceStore();

  const handleFilterChange = (filter: keyof FilterSettings, value: number) => {
    setFilter(filter, value);
  };

  const handlePresetClick = (filters: FilterSettings) => {
    pushHistory();
    setFilters(filters);
  };

  const handleReset = () => {
    pushHistory();
    resetFilters();
  };

  const filters = metadata.filters;

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">필터</h3>
        <p className="text-xs text-gray-500 mb-4">
          영상에 색상 필터를 적용하세요
        </p>
      </div>

      {/* 프리셋 */}
      <div className="space-y-2">
        <Label className="text-xs">프리셋</Label>
        <div className="grid grid-cols-3 gap-2">
          {FILTER_PRESETS.map((preset) => {
            const isActive =
              filters.brightness === preset.filters.brightness &&
              filters.contrast === preset.filters.contrast &&
              filters.saturation === preset.filters.saturation &&
              filters.grayscale === preset.filters.grayscale;

            return (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(preset.filters)}
                className={cn(
                  'text-xs',
                  isActive && 'border-primary-500 bg-primary-50 text-primary-600'
                )}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* 밝기 */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs">밝기</Label>
          <span className="text-xs text-gray-500">{filters.brightness}%</span>
        </div>
        <Slider
          value={[filters.brightness]}
          min={0}
          max={200}
          step={1}
          onValueChange={(v) => handleFilterChange('brightness', v[0])}
        />
      </div>

      {/* 대비 */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs">대비</Label>
          <span className="text-xs text-gray-500">{filters.contrast}%</span>
        </div>
        <Slider
          value={[filters.contrast]}
          min={0}
          max={200}
          step={1}
          onValueChange={(v) => handleFilterChange('contrast', v[0])}
        />
      </div>

      {/* 채도 */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs">채도</Label>
          <span className="text-xs text-gray-500">{filters.saturation}%</span>
        </div>
        <Slider
          value={[filters.saturation]}
          min={0}
          max={200}
          step={1}
          onValueChange={(v) => handleFilterChange('saturation', v[0])}
        />
      </div>

      {/* 흑백 */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs">흑백</Label>
          <span className="text-xs text-gray-500">{filters.grayscale}%</span>
        </div>
        <Slider
          value={[filters.grayscale]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v) => handleFilterChange('grayscale', v[0])}
        />
      </div>

      {/* 안내 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-xs text-yellow-700">
          필터는 미리보기 전용입니다. 실제 영상에는 적용되지 않습니다.
          (향후 서버 인코딩 시 지원 예정)
        </p>
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
