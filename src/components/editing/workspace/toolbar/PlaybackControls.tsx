'use client';

import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';

export function PlaybackControls() {
  const {
    videoDuration,
    currentTime,
    isPlaying,
    metadata,
    setCurrentTime,
    setIsPlaying,
    setMuted,
  } = useEditWorkspaceStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    const newTime = Math.max(metadata.trim.startTime, currentTime - 5);
    setCurrentTime(newTime);
  };

  const handleSkipForward = () => {
    const newTime = Math.min(metadata.trim.endTime, currentTime + 5);
    setCurrentTime(newTime);
  };

  const handleSeek = (values: number[]) => {
    setCurrentTime(values[0]);
    if (isPlaying) {
      setIsPlaying(false);
    }
  };

  const handleMuteToggle = () => {
    setMuted(!metadata.audio.muted);
  };

  const trimmedDuration = metadata.trim.endTime - metadata.trim.startTime;
  const currentInTrim = currentTime - metadata.trim.startTime;

  return (
    <div className="h-16 bg-gray-800 border-t border-gray-700 px-4 flex items-center gap-4">
      {/* 재생 컨트롤 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkipBack}
          className="text-white hover:bg-gray-700"
          title="5초 뒤로"
        >
          <SkipBack className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlayPause}
          className="text-white hover:bg-gray-700 w-10 h-10"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkipForward}
          className="text-white hover:bg-gray-700"
          title="5초 앞으로"
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>

      {/* 시간 표시 */}
      <div className="text-white text-sm font-mono w-24">
        {formatTime(currentInTrim)} / {formatTime(trimmedDuration)}
      </div>

      {/* 시크바 */}
      <div className="flex-1">
        <Slider
          value={[currentTime]}
          min={metadata.trim.startTime}
          max={metadata.trim.endTime}
          step={0.1}
          onValueChange={handleSeek}
          className="w-full"
        />
      </div>

      {/* 볼륨 */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMuteToggle}
          className="text-white hover:bg-gray-700"
        >
          {metadata.audio.muted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </Button>
        <div className="w-20">
          <Slider
            value={[metadata.audio.muted ? 0 : metadata.audio.volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => {
              useEditWorkspaceStore.getState().setVolume(v[0]);
              if (v[0] > 0 && metadata.audio.muted) {
                setMuted(false);
              }
            }}
          />
        </div>
      </div>

      {/* 속도 표시 */}
      <div className="text-white text-sm">
        {metadata.speed}x
      </div>
    </div>
  );
}
