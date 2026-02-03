'use client';

import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

export function AudioPanel() {
  const { metadata, setVolume, setMuted, pushHistory } = useEditWorkspaceStore();

  const handleVolumeChange = (values: number[]) => {
    setVolume(values[0]);
  };

  const handleMuteToggle = () => {
    pushHistory();
    setMuted(!metadata.audio.muted);
  };

  const handleReset = () => {
    pushHistory();
    setVolume(100);
    setMuted(false);
  };

  const VolumeIcon = metadata.audio.muted
    ? VolumeX
    : metadata.audio.volume > 50
    ? Volume2
    : Volume1;

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">오디오</h3>
        <p className="text-xs text-gray-500 mb-4">
          영상의 소리를 조정하세요
        </p>
      </div>

      {/* 볼륨 아이콘 */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <VolumeIcon className="h-8 w-8 text-gray-600" />
        </div>
      </div>

      {/* 볼륨 슬라이더 */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs">볼륨</Label>
          <span className="text-xs text-gray-500">
            {metadata.audio.muted ? '음소거' : `${metadata.audio.volume}%`}
          </span>
        </div>
        <Slider
          value={[metadata.audio.volume]}
          min={0}
          max={100}
          step={1}
          onValueChange={handleVolumeChange}
          disabled={metadata.audio.muted}
          className={metadata.audio.muted ? 'opacity-50' : ''}
        />
      </div>

      {/* 음소거 토글 */}
      <div className="flex items-center justify-between">
        <Label htmlFor="mute-toggle" className="text-sm">
          음소거
        </Label>
        <Switch
          id="mute-toggle"
          checked={metadata.audio.muted}
          onCheckedChange={handleMuteToggle}
        />
      </div>

      {/* 볼륨 프리셋 */}
      <div className="space-y-2">
        <Label className="text-xs">빠른 설정</Label>
        <div className="grid grid-cols-4 gap-2">
          {[0, 25, 50, 75, 100].map((vol) => (
            <Button
              key={vol}
              variant="outline"
              size="sm"
              onClick={() => {
                pushHistory();
                setVolume(vol);
                if (vol > 0 && metadata.audio.muted) {
                  setMuted(false);
                }
              }}
              className={
                metadata.audio.volume === vol && !metadata.audio.muted
                  ? 'border-primary-500 bg-primary-50 text-primary-600'
                  : ''
              }
            >
              {vol}%
            </Button>
          ))}
        </div>
      </div>

      {/* 리셋 */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleReset}
        disabled={metadata.audio.volume === 100 && !metadata.audio.muted}
      >
        원래대로 (100%)
      </Button>
    </div>
  );
}
