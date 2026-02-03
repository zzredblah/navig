'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { SubtitleSegment, SubtitleOverlayStyle } from '@/types/subtitle';

interface SubtitleOverlayProps {
  segments: SubtitleSegment[];
  currentTime: number;
  visible: boolean;
  style?: Partial<SubtitleOverlayStyle>;
  className?: string;
  onClick?: (segment: SubtitleSegment) => void;
}

const defaultStyle: SubtitleOverlayStyle = {
  fontSize: 'medium',
  position: 'bottom',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  textColor: '#ffffff',
};

const fontSizeMap = {
  small: 'text-sm',
  medium: 'text-base md:text-lg',
  large: 'text-lg md:text-xl',
};

export function SubtitleOverlay({
  segments,
  currentTime,
  visible,
  style: customStyle,
  className,
  onClick,
}: SubtitleOverlayProps) {
  const style = useMemo(
    () => ({ ...defaultStyle, ...customStyle }),
    [customStyle]
  );

  // Find the current segment based on playback time
  const currentSegment = useMemo(() => {
    if (!visible || segments.length === 0) return null;

    return segments.find(
      (segment) =>
        currentTime >= segment.start_time && currentTime < segment.end_time
    );
  }, [segments, currentTime, visible]);

  if (!visible || !currentSegment) {
    return null;
  }

  const positionClass =
    style.position === 'top'
      ? 'top-4'
      : 'bottom-20'; // Leave space for video controls

  return (
    <div
      className={cn(
        'absolute left-0 right-0 flex justify-center px-4 pointer-events-none z-10',
        positionClass,
        className
      )}
    >
      <div
        className={cn(
          'px-4 py-2 rounded-lg max-w-[90%] text-center transition-opacity duration-200',
          fontSizeMap[style.fontSize],
          onClick && 'pointer-events-auto cursor-pointer hover:opacity-80'
        )}
        style={{
          backgroundColor: style.backgroundColor,
          color: style.textColor,
        }}
        onClick={() => onClick?.(currentSegment)}
      >
        <span className="leading-relaxed whitespace-pre-wrap">
          {currentSegment.text}
        </span>
      </div>
    </div>
  );
}
