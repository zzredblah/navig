'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { Image as KonvaImage, Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { BoardElement } from '@/types/board';

interface ImageElementProps {
  element: BoardElement;
  isSelected: boolean;
  onSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd: (id: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (id: string, e: Konva.KonvaEventObject<Event>) => void;
}

export const ImageElement = memo(function ImageElement({
  element,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: ImageElementProps) {
  const groupRef = useRef<Konva.Group>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isVideo = element.type === 'video';

  // 이미지 또는 비디오 썸네일 로드
  useEffect(() => {
    const url = element.content.url || element.content.thumbnail_url;
    if (!url) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    if (isVideo) {
      // 비디오인 경우 첫 프레임을 썸네일로 추출
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        // 첫 프레임으로 이동
        video.currentTime = 0;
      };

      video.onseeked = () => {
        // 캔버스에 썸네일 그리기
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || element.width;
        canvas.height = video.videoHeight || element.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setVideoThumbnail(canvas);
          setIsLoading(false);
        }
      };

      video.onerror = () => {
        setHasError(true);
        setIsLoading(false);
      };

      video.src = url;
      video.load();

      return () => {
        video.onloadeddata = null;
        video.onseeked = null;
        video.onerror = null;
      };
    } else {
      // 이미지인 경우
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImage(img);
        setIsLoading(false);
      };
      img.onerror = () => {
        setHasError(true);
        setIsLoading(false);
      };
      img.src = url;

      return () => {
        img.onload = null;
        img.onerror = null;
      };
    }
  }, [element.content.url, element.content.thumbnail_url, isVideo, element.width, element.height]);

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(element.id, e);
  }, [element.id, onSelect]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(element.id, e);
  }, [element.id, onDragEnd]);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    onTransformEnd(element.id, e);
  }, [element.id, onTransformEnd]);

  const style = element.style;

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.position_x}
      y={element.position_y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      draggable={!element.locked && isSelected}
      onClick={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/* 배경/테두리 */}
      <Rect
        width={element.width}
        height={element.height}
        fill={style.background_color || '#f3f4f6'}
        stroke={isSelected ? '#3b82f6' : style.border_color}
        strokeWidth={isSelected ? 2 : style.border_width || 0}
        cornerRadius={style.border_radius || 0}
        opacity={style.opacity ?? 1}
        shadowEnabled={style.shadow}
        shadowBlur={10}
        shadowOpacity={0.3}
        shadowOffset={{ x: 2, y: 2 }}
      />

      {/* 이미지 */}
      {image && !hasError && !isVideo && (
        <KonvaImage
          image={image}
          width={element.width}
          height={element.height}
          cornerRadius={style.border_radius || 0}
          opacity={style.opacity ?? 1}
        />
      )}

      {/* 비디오 썸네일 */}
      {videoThumbnail && !hasError && isVideo && (
        <KonvaImage
          image={videoThumbnail}
          width={element.width}
          height={element.height}
          cornerRadius={style.border_radius || 0}
          opacity={style.opacity ?? 1}
        />
      )}

      {/* 비디오 재생 아이콘 오버레이 */}
      {isVideo && !isLoading && !hasError && (
        <>
          {/* 반투명 배경 */}
          <Rect
            x={element.width / 2 - 25}
            y={element.height / 2 - 25}
            width={50}
            height={50}
            fill="rgba(0,0,0,0.5)"
            cornerRadius={25}
          />
          {/* 재생 버튼 삼각형 (텍스트로 대체) */}
          <Text
            x={element.width / 2 - 25}
            y={element.height / 2 - 25}
            width={50}
            height={50}
            text="▶"
            fontSize={24}
            fill="white"
            align="center"
            verticalAlign="middle"
          />
        </>
      )}

      {/* 로딩 표시 */}
      {isLoading && (
        <>
          <Rect
            width={element.width}
            height={element.height}
            fill="#e5e7eb"
            cornerRadius={style.border_radius || 0}
          />
          <Text
            width={element.width}
            height={element.height}
            text="로딩 중..."
            fontSize={14}
            fill="#6b7280"
            align="center"
            verticalAlign="middle"
          />
        </>
      )}

      {/* 에러 표시 */}
      {hasError && (
        <>
          <Rect
            width={element.width}
            height={element.height}
            fill="#fee2e2"
            cornerRadius={style.border_radius || 0}
          />
          <Text
            width={element.width}
            height={element.height}
            text={isVideo ? '영상 로드 실패' : '이미지 로드 실패'}
            fontSize={14}
            fill="#dc2626"
            align="center"
            verticalAlign="middle"
          />
        </>
      )}
    </Group>
  );
});
