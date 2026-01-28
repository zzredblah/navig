'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Download, Image, FileJson, Loader2 } from 'lucide-react';
import type Konva from 'konva';

interface ExportButtonProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function ExportButton({ stageRef }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportAsPNG = async () => {
    const stage = stageRef.current;
    if (!stage) return;

    setIsExporting(true);
    try {
      // 현재 스케일과 위치 저장
      const oldScale = { x: stage.scaleX(), y: stage.scaleY() };
      const oldPosition = { x: stage.x(), y: stage.y() };

      // 스케일 1, 위치 0으로 리셋
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });

      // PNG로 내보내기
      const dataUrl = stage.toDataURL({
        pixelRatio: 2, // 고해상도
        mimeType: 'image/png',
      });

      // 다운로드
      const link = document.createElement('a');
      link.download = `board-export-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 원래 스케일과 위치로 복원
      stage.scale(oldScale);
      stage.position(oldPosition);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsJSON = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const json = stage.toJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `board-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">내보내기</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>캔버스 내보내기</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={exportAsPNG}>
            <Image className="h-4 w-4 mr-2" />
            PNG로 내보내기
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportAsJSON}>
            <FileJson className="h-4 w-4 mr-2" />
            JSON으로 내보내기
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
