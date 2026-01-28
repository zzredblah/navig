'use client';

import { useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Maximize,
  Link2,
  Link2Off,
  SplitSquareHorizontal,
  Layers,
  Triangle,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SliderCompare } from './SliderCompare';
import { SideBySideCompare } from './SideBySideCompare';
import { OverlayCompare } from './OverlayCompare';
import { WipeCompare } from './WipeCompare';
import { ChangeMarkerTimeline, ChangeMarkerForm, ChangeMarkerFilter } from '@/components/video/markers';
import type { ChangeMarkerWithCreator, ChangeMarkerType } from '@/types/change-marker';

export type CompareMode = 'slider' | 'side-by-side' | 'overlay' | 'wipe';

interface VideoCompareProps {
  leftVideo: { url: string; label: string };
  rightVideo: { url: string; label: string };
  initialMode?: CompareMode;
  onClose?: () => void;
  // 마커 관련 props
  markers?: ChangeMarkerWithCreator[];
  onAddMarker?: (data: {
    type: ChangeMarkerType;
    start_time: number;
    end_time: number;
    description?: string;
  }) => Promise<void>;
  onDeleteMarker?: (markerId: string) => Promise<void>;
  currentUserId?: string;
}

export function VideoCompare({
  leftVideo,
  rightVideo,
  initialMode = 'slider',
  markers = [],
  onAddMarker,
  onDeleteMarker,
  currentUserId,
}: VideoCompareProps) {
  const [mode, setMode] = useState<CompareMode>(initialMode);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMarkerForm, setShowMarkerForm] = useState(false);
  const [visibleMarkerTypes, setVisibleMarkerTypes] = useState<ChangeMarkerType[]>([
    'visual',
    'audio',
    'text',
    'effect',
    'other',
  ]);

  // 재생 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 재생/정지 토글
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // 시간 이동
  const handleSeek = useCallback((value: number[]) => {
    setCurrentTime(value[0]);
  }, []);

  // 전체화면 토글
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // 마커 필터 토글
  const toggleMarkerType = useCallback((type: ChangeMarkerType) => {
    setVisibleMarkerTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  // 특정 시간으로 이동
  const handleSeekToTime = useCallback((time: number) => {
    setCurrentTime(time);
    setIsPlaying(false);
  }, []);

  // 모드별 아이콘
  const modeIcons: Record<CompareMode, React.ReactNode> = {
    slider: <SplitSquareHorizontal className="h-4 w-4" />,
    'side-by-side': <Layers className="h-4 w-4 rotate-90" />,
    overlay: <Layers className="h-4 w-4" />,
    wipe: <Triangle className="h-4 w-4" />,
  };

  // 공통 props
  const compareProps = {
    leftVideo,
    rightVideo,
    currentTime,
    isPlaying,
    onTimeUpdate: setCurrentTime,
    onDurationChange: setDuration,
    syncEnabled,
  };

  return (
    <div className="flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      {/* 비교 영역 */}
      <div className="relative">
        {mode === 'slider' && <SliderCompare {...compareProps} />}
        {mode === 'side-by-side' && <SideBySideCompare {...compareProps} />}
        {mode === 'overlay' && <OverlayCompare {...compareProps} />}
        {mode === 'wipe' && <WipeCompare {...compareProps} />}
      </div>

      {/* 마커 타임라인 */}
      {markers.length > 0 && (
        <div className="px-4 py-2 bg-gray-700">
          <ChangeMarkerTimeline
            markers={markers}
            duration={duration}
            currentTime={currentTime}
            onSeek={handleSeekToTime}
            onDeleteMarker={onDeleteMarker}
            visibleTypes={visibleMarkerTypes}
            currentUserId={currentUserId}
          />
        </div>
      )}

      {/* 컨트롤 바 */}
      <div className="p-4 bg-gray-800 space-y-3">
        {/* 진행 바 */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          <span className="text-white text-sm w-12">{formatTime(currentTime)}</span>

          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={duration || 100}
            step={0.1}
            className="flex-1"
          />

          <span className="text-white text-sm w-12">{formatTime(duration)}</span>
        </div>

        {/* 모드 및 옵션 */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">모드:</span>
            <Select value={mode} onValueChange={(v) => setMode(v as CompareMode)}>
              <SelectTrigger className="w-32 h-8 bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slider">
                  <div className="flex items-center gap-2">
                    {modeIcons.slider}
                    <span>슬라이더</span>
                  </div>
                </SelectItem>
                <SelectItem value="side-by-side">
                  <div className="flex items-center gap-2">
                    {modeIcons['side-by-side']}
                    <span>나란히</span>
                  </div>
                </SelectItem>
                <SelectItem value="overlay">
                  <div className="flex items-center gap-2">
                    {modeIcons.overlay}
                    <span>겹치기</span>
                  </div>
                </SelectItem>
                <SelectItem value="wipe">
                  <div className="flex items-center gap-2">
                    {modeIcons.wipe}
                    <span>와이프</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={syncEnabled ? 'secondary' : 'ghost'}
              size="sm"
              className={syncEnabled ? '' : 'text-white hover:bg-white/10'}
              onClick={() => setSyncEnabled(!syncEnabled)}
            >
              {syncEnabled ? (
                <>
                  <Link2 className="h-4 w-4 mr-1" />
                  동기화 ON
                </>
              ) : (
                <>
                  <Link2Off className="h-4 w-4 mr-1" />
                  동기화 OFF
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-4 w-4 mr-1" />
              {isFullscreen ? '나가기' : '전체화면'}
            </Button>
          </div>
        </div>

        {/* 마커 필터 및 추가 버튼 */}
        {(markers.length > 0 || onAddMarker) && (
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-700">
            {markers.length > 0 && (
              <ChangeMarkerFilter
                visibleTypes={visibleMarkerTypes}
                onToggle={toggleMarkerType}
              />
            )}
            {onAddMarker && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowMarkerForm(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                마커 추가
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 마커 추가 폼 */}
      {onAddMarker && (
        <ChangeMarkerForm
          isOpen={showMarkerForm}
          onClose={() => setShowMarkerForm(false)}
          onSubmit={onAddMarker}
          initialStartTime={currentTime}
          videoDuration={duration}
        />
      )}
    </div>
  );
}
