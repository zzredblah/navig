'use client';

/**
 * 영상 프레임 위 드로잉 캔버스
 *
 * 기능:
 * - 자유 그리기 (펜)
 * - 도형 (사각형, 원, 화살표)
 * - 텍스트 추가
 * - 색상/굵기 선택
 * - 실행 취소/다시 실행
 * - 캔버스 내용을 이미지로 저장
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pencil,
  Square,
  Circle,
  ArrowRight,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DrawingTool = 'pen' | 'rectangle' | 'circle' | 'arrow' | 'text';

interface Point {
  x: number;
  y: number;
}

interface DrawingAction {
  tool: DrawingTool;
  color: string;
  lineWidth: number;
  textSize?: number; // 텍스트 크기
  points?: Point[];
  startPoint?: Point;
  endPoint?: Point;
  text?: string;
}

interface DrawingCanvasProps {
  width: number;
  height: number;
  videoElement?: HTMLVideoElement | null;
  onSave?: (imageData: string) => void;
  onCancel?: () => void;
  className?: string;
}

const COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#FFFFFF', // white
  '#000000', // black
];

const LINE_WIDTHS = [2, 4, 6, 8];
const TEXT_SIZES = [16, 24, 32, 48]; // 텍스트 전용 크기

export function DrawingCanvas({
  width,
  height,
  videoElement,
  onSave,
  onCancel,
  className,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<DrawingTool>('pen');
  const [color, setColor] = useState('#EF4444');
  const [lineWidth, setLineWidth] = useState(4);
  const [textSize, setTextSize] = useState(32); // 텍스트 크기 (기본 32px)
  const [isDrawing, setIsDrawing] = useState(false);
  const [actions, setActions] = useState<DrawingAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingAction[]>([]);
  const [currentAction, setCurrentAction] = useState<DrawingAction | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);

  // 캔버스 컨텍스트 가져오기
  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  // 캔버스 다시 그리기
  const redrawCanvas = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    // 캔버스 초기화
    ctx.clearRect(0, 0, width, height);

    // 모든 액션 다시 그리기
    actions.forEach((action) => {
      drawAction(ctx, action);
    });

    // 현재 그리는 중인 액션
    if (currentAction) {
      drawAction(ctx, currentAction);
    }
  }, [actions, currentAction, width, height, getContext]);

  // 액션 그리기
  const drawAction = (ctx: CanvasRenderingContext2D, action: DrawingAction) => {
    ctx.strokeStyle = action.color;
    ctx.fillStyle = action.color;
    ctx.lineWidth = action.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (action.tool) {
      case 'pen':
        if (action.points && action.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(action.points[0].x, action.points[0].y);
          action.points.forEach((point) => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        }
        break;

      case 'rectangle':
        if (action.startPoint && action.endPoint) {
          const w = action.endPoint.x - action.startPoint.x;
          const h = action.endPoint.y - action.startPoint.y;
          ctx.strokeRect(action.startPoint.x, action.startPoint.y, w, h);
        }
        break;

      case 'circle':
        if (action.startPoint && action.endPoint) {
          const radiusX = Math.abs(action.endPoint.x - action.startPoint.x) / 2;
          const radiusY = Math.abs(action.endPoint.y - action.startPoint.y) / 2;
          const centerX = action.startPoint.x + (action.endPoint.x - action.startPoint.x) / 2;
          const centerY = action.startPoint.y + (action.endPoint.y - action.startPoint.y) / 2;
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case 'arrow':
        if (action.startPoint && action.endPoint) {
          const headLength = 15;
          const dx = action.endPoint.x - action.startPoint.x;
          const dy = action.endPoint.y - action.startPoint.y;
          const angle = Math.atan2(dy, dx);

          ctx.beginPath();
          ctx.moveTo(action.startPoint.x, action.startPoint.y);
          ctx.lineTo(action.endPoint.x, action.endPoint.y);
          ctx.lineTo(
            action.endPoint.x - headLength * Math.cos(angle - Math.PI / 6),
            action.endPoint.y - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(action.endPoint.x, action.endPoint.y);
          ctx.lineTo(
            action.endPoint.x - headLength * Math.cos(angle + Math.PI / 6),
            action.endPoint.y - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        break;

      case 'text':
        if (action.startPoint && action.text) {
          const fontSize = action.textSize || 32;
          ctx.font = `bold ${fontSize}px sans-serif`;
          // 텍스트 배경 (가독성 향상)
          ctx.strokeStyle = action.color === '#000000' ? '#FFFFFF' : '#000000';
          ctx.lineWidth = fontSize / 8;
          ctx.strokeText(action.text, action.startPoint.x, action.startPoint.y);
          ctx.fillText(action.text, action.startPoint.x, action.startPoint.y);
        }
        break;
    }
  };

  // 캔버스 업데이트
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // 마우스 위치 계산
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // 그리기 시작
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (tool === 'text') {
      setTextPosition(pos);
      return;
    }

    setIsDrawing(true);
    setRedoStack([]);

    const newAction: DrawingAction = {
      tool,
      color,
      lineWidth,
      startPoint: pos,
      points: tool === 'pen' ? [pos] : undefined,
    };

    setCurrentAction(newAction);
  };

  // 그리기 중
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAction) return;

    const pos = getMousePos(e);

    if (tool === 'pen') {
      setCurrentAction({
        ...currentAction,
        points: [...(currentAction.points || []), pos],
      });
    } else {
      setCurrentAction({
        ...currentAction,
        endPoint: pos,
      });
    }
  };

  // 그리기 완료
  const handleMouseUp = () => {
    if (!isDrawing || !currentAction) return;

    setIsDrawing(false);
    setActions((prev) => [...prev, currentAction]);
    setCurrentAction(null);
  };

  // 텍스트 추가
  const handleTextSubmit = () => {
    if (!textPosition || !textInput.trim()) return;

    const textAction: DrawingAction = {
      tool: 'text',
      color,
      lineWidth,
      textSize,
      startPoint: textPosition,
      text: textInput,
    };

    setActions((prev) => [...prev, textAction]);
    setRedoStack([]);
    setTextInput('');
    setTextPosition(null);
  };

  // 실행 취소
  const handleUndo = () => {
    if (actions.length === 0) return;
    const lastAction = actions[actions.length - 1];
    setActions((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, lastAction]);
  };

  // 다시 실행
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const lastRedo = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setActions((prev) => [...prev, lastRedo]);
  };

  // 전체 지우기
  const handleClear = () => {
    setActions([]);
    setRedoStack([]);
    setCurrentAction(null);
    setTextPosition(null);
  };

  // 이미지로 저장 (영상 프레임 + 그림 합성)
  const handleSave = () => {
    const drawingCanvas = canvasRef.current;
    if (!drawingCanvas || !onSave) return;

    // 합성용 캔버스 생성
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    const ctx = compositeCanvas.getContext('2d');

    if (!ctx) {
      // fallback: 그림만 저장
      onSave(drawingCanvas.toDataURL('image/png'));
      return;
    }

    // 1. 영상 프레임을 배경으로 그리기
    let videoFrameCaptured = false;
    if (videoElement) {
      try {
        // 영상 비율에 맞게 중앙 정렬
        const videoRatio = videoElement.videoWidth / videoElement.videoHeight;
        const canvasRatio = width / height;

        let drawWidth = width;
        let drawHeight = height;
        let offsetX = 0;
        let offsetY = 0;

        if (videoRatio > canvasRatio) {
          // 영상이 더 넓음 - 높이 맞춤
          drawHeight = height;
          drawWidth = height * videoRatio;
          offsetX = (width - drawWidth) / 2;
        } else {
          // 영상이 더 높음 - 너비 맞춤
          drawWidth = width;
          drawHeight = width / videoRatio;
          offsetY = (height - drawHeight) / 2;
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight);
        videoFrameCaptured = true;
      } catch (e) {
        console.error('영상 프레임 캡처 실패:', e);
      }
    }

    // 영상 캡처 실패 시 어두운 배경
    if (!videoFrameCaptured) {
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. 그림 오버레이
    ctx.drawImage(drawingCanvas, 0, 0);

    // 3. 합성된 이미지 저장
    try {
      const imageData = compositeCanvas.toDataURL('image/png');
      onSave(imageData);
    } catch (e) {
      // CORS 오류 발생 시 그림만 저장
      console.warn('합성 이미지 저장 실패, 그림만 저장:', e);
      onSave(drawingCanvas.toDataURL('image/png'));
    }
  };

  const tools: { id: DrawingTool; icon: typeof Pencil; label: string }[] = [
    { id: 'pen', icon: Pencil, label: '펜' },
    { id: 'rectangle', icon: Square, label: '사각형' },
    { id: 'circle', icon: Circle, label: '원' },
    { id: 'arrow', icon: ArrowRight, label: '화살표' },
    { id: 'text', icon: Type, label: '텍스트' },
  ];

  return (
    <div className={cn('relative', className)}>
      {/* 툴바 */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        {/* 도구 선택 */}
        <div className="flex gap-1">
          {tools.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant={tool === id ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                tool === id && 'bg-primary-600 hover:bg-primary-700'
              )}
              onClick={() => setTool(id)}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        {/* 색상 선택 */}
        <div className="flex gap-1 flex-wrap max-w-[144px]">
          {COLORS.map((c) => (
            <button
              key={c}
              className={cn(
                'h-5 w-5 rounded-full border-2 transition-transform',
                color === c ? 'border-gray-800 scale-110' : 'border-gray-300',
                c === '#FFFFFF' && 'border-gray-400'
              )}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        {/* 굵기 선택 (펜/도형용) */}
        {tool !== 'text' && (
          <div className="flex gap-1 items-center">
            {LINE_WIDTHS.map((w) => (
              <button
                key={w}
                className={cn(
                  'h-6 w-6 rounded flex items-center justify-center',
                  lineWidth === w ? 'bg-gray-200' : 'hover:bg-gray-100'
                )}
                onClick={() => setLineWidth(w)}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: w + 2, height: w + 2, backgroundColor: color }}
                />
              </button>
            ))}
          </div>
        )}

        {/* 텍스트 크기 선택 */}
        {tool === 'text' && (
          <div className="flex gap-1 items-center">
            {TEXT_SIZES.map((size) => (
              <button
                key={size}
                className={cn(
                  'h-7 px-2 rounded text-xs font-medium',
                  textSize === size ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 text-gray-600'
                )}
                onClick={() => setTextSize(size)}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {/* 실행 취소/다시 실행 */}
        <div className="flex gap-1 border-t border-gray-200 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleUndo}
            disabled={actions.length === 0}
            title="실행 취소"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="다시 실행"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
            onClick={handleClear}
            disabled={actions.length === 0}
            title="전체 지우기"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 저장/취소 버튼 */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            취소
          </Button>
        )}
        {onSave && (
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-primary-600 hover:bg-primary-700"
            disabled={actions.length === 0}
          >
            <Check className="h-4 w-4 mr-1" />
            저장
          </Button>
        )}
      </div>

      {/* 캔버스 */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* 텍스트 입력 (드래그로 위치 조정 가능) */}
      {textPosition && (
        <div
          className="absolute z-20 cursor-move"
          style={{
            left: textPosition.x,
            top: textPosition.y,
            transform: 'translate(-10px, -50%)',
          }}
          draggable={false}
          onMouseDown={(e) => {
            // 입력창 드래그 시작
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            e.preventDefault();
            const startX = e.clientX;
            const startY = e.clientY;
            const startPos = { ...textPosition };

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;

              const deltaX = (moveEvent.clientX - startX) * scaleX;
              const deltaY = (moveEvent.clientY - startY) * scaleY;

              setTextPosition({
                x: Math.max(0, Math.min(width, startPos.x + deltaX)),
                y: Math.max(0, Math.min(height, startPos.y + deltaY)),
              });
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          {/* 위치 표시 마커 */}
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary-500 rounded-full border-2 border-white shadow" />

          <div className="ml-4 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2 border border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-500 cursor-move select-none">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>
              </svg>
              드래그하여 위치 조정
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                placeholder="텍스트 입력..."
                className="px-3 py-1.5 text-sm bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-gray-400 min-w-[150px]"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTextPosition(null);
                  setTextInput('');
                }}
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
