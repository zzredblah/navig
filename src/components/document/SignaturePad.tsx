'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Point {
  x: number;
  y: number;
}

interface SignaturePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSign: (signatureData: string) => void;
  loading?: boolean;
}

export function SignaturePad({ open, onOpenChange, onSign, loading }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPoint = useRef<Point | null>(null);

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1F2937';
    }
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        resizeCanvas();
        setHasDrawn(false);
      }, 100);
    }
  }, [open, resizeCanvas]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const drawLine = (from: Point, to: Point) => {
    const ctx = getCanvasContext();
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);

    // bezier curve for smoother lines
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    ctx.quadraticCurveTo(from.x, from.y, midX, midY);
    ctx.stroke();
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    lastPoint.current = getPoint(e);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPoint.current) return;

    const currentPoint = getPoint(e);
    drawLine(lastPoint.current, currentPoint);
    lastPoint.current = currentPoint;
  };

  const handleEnd = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const signatureData = canvas.toDataURL('image/png');
    onSign(signatureData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>전자서명</DialogTitle>
          <DialogDescription>
            아래 영역에 서명해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-48 cursor-crosshair touch-none"
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!hasDrawn}
            >
              <Eraser className="h-4 w-4 mr-1" />
              지우기
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleClear();
                resizeCanvas();
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              초기화
            </Button>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
            본 전자서명은 전자서명법에 따라 법적 효력을 가지며,
            서명 시점의 IP 주소 및 디바이스 정보가 자동으로 기록됩니다.
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasDrawn || loading}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <Save className="h-4 w-4 mr-1" />
            {loading ? '서명 중...' : '서명 완료'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
