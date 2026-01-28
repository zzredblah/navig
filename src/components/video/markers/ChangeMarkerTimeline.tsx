'use client';

import { useState, useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Play, Trash2 } from 'lucide-react';
import {
  type ChangeMarkerWithCreator,
  MARKER_TYPE_COLORS,
  MARKER_TYPE_LABELS,
  formatMarkerTime,
  getMarkerPosition,
  getMarkerDuration,
} from '@/types/change-marker';

interface ChangeMarkerTimelineProps {
  markers: ChangeMarkerWithCreator[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onDeleteMarker?: (markerId: string) => Promise<void>;
  visibleTypes?: string[];
  currentUserId?: string;
}

export function ChangeMarkerTimeline({
  markers,
  duration,
  currentTime,
  onSeek,
  onDeleteMarker,
  visibleTypes,
  currentUserId,
}: ChangeMarkerTimelineProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 필터링된 마커
  const filteredMarkers = visibleTypes
    ? markers.filter((m) => visibleTypes.includes(m.type))
    : markers;

  // 마커 삭제
  const handleDelete = useCallback(
    async (markerId: string) => {
      if (!onDeleteMarker) return;

      setDeletingId(markerId);
      try {
        await onDeleteMarker(markerId);
      } finally {
        setDeletingId(null);
      }
    },
    [onDeleteMarker]
  );

  if (filteredMarkers.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full h-6">
      {/* 마커들 */}
      {filteredMarkers.map((marker) => {
        const { left, width } = getMarkerPosition(marker, duration);
        const color = MARKER_TYPE_COLORS[marker.type];
        const canDelete =
          onDeleteMarker &&
          (marker.created_by === currentUserId || true); // 관리자 권한은 서버에서 확인

        return (
          <Popover key={marker.id}>
            <PopoverTrigger asChild>
              <button
                className="absolute top-0 h-full rounded-sm hover:opacity-80 transition-opacity cursor-pointer"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 0.5)}%`,
                  backgroundColor: color,
                  opacity: 0.7,
                }}
                title={`${MARKER_TYPE_LABELS[marker.type]}: ${marker.description || '설명 없음'}`}
              />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" side="top">
              <div className="space-y-2">
                {/* 유형 뱃지 */}
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded text-white"
                    style={{ backgroundColor: color }}
                  >
                    {MARKER_TYPE_LABELS[marker.type]}
                  </span>
                </div>

                {/* 시간 범위 */}
                <div className="text-sm text-gray-500">
                  {formatMarkerTime(marker.start_time)} ~ {formatMarkerTime(marker.end_time)}
                  <span className="ml-2 text-gray-400">
                    ({getMarkerDuration(marker).toFixed(1)}초)
                  </span>
                </div>

                {/* 설명 */}
                {marker.description && (
                  <p className="text-sm text-gray-700">{marker.description}</p>
                )}

                {/* 작성자 */}
                <p className="text-xs text-gray-400">
                  작성: {marker.creator?.name || '알 수 없음'}
                </p>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onSeek(marker.start_time)}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    이동
                  </Button>
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(marker.id)}
                      disabled={deletingId === marker.id}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      })}

      {/* 현재 재생 위치 */}
      {duration > 0 && (
        <div
          className="absolute top-0 w-0.5 h-full bg-red-500 pointer-events-none z-10"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      )}
    </div>
  );
}
