'use client';

import type { TextOverlay } from '@/types/editing';

interface TextOverlayRendererProps {
  overlays: TextOverlay[];
  currentTime: number;
}

export function TextOverlayRenderer({
  overlays,
  currentTime,
}: TextOverlayRendererProps) {
  // 현재 시간에 표시해야 할 오버레이 필터링
  const visibleOverlays = overlays.filter(
    (overlay) => currentTime >= overlay.startTime && currentTime <= overlay.endTime
  );

  if (visibleOverlays.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {visibleOverlays.map((overlay) => (
        <div
          key={overlay.id}
          className="absolute whitespace-pre-wrap"
          style={{
            left: `${overlay.position.x}%`,
            top: `${overlay.position.y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${overlay.style.fontSize}px`,
            color: overlay.style.color,
            backgroundColor: overlay.style.backgroundColor || 'transparent',
            fontWeight: overlay.style.fontWeight || 'normal',
            fontFamily: overlay.style.fontFamily || 'inherit',
            padding: overlay.style.backgroundColor ? '4px 8px' : '0',
            borderRadius: overlay.style.backgroundColor ? '4px' : '0',
            textShadow: !overlay.style.backgroundColor
              ? '0 1px 2px rgba(0,0,0,0.8)'
              : 'none',
          }}
        >
          {overlay.text}
        </div>
      ))}
    </div>
  );
}
