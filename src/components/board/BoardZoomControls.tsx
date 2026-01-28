'use client';

import { useBoardStore } from '@/stores/board-store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Minus,
  Plus,
  Maximize,
  Undo2,
  Redo2,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
} from 'lucide-react';

export function BoardZoomControls() {
  const {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetView,
    undo,
    redo,
    canUndo,
    canRedo,
    selectedIds,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    distributeHorizontal,
    distributeVertical,
  } = useBoardStore();

  const handleSliderChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const hasMultipleSelected = selectedIds.length >= 2;
  const hasThreeOrMore = selectedIds.length >= 3;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {/* 실행 취소/다시 실행 */}
        <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg shadow-lg border border-gray-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={undo}
                disabled={!canUndo()}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>실행 취소 (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={redo}
                disabled={!canRedo()}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>다시 실행 (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
        </div>

        {/* 정렬 도구 (다중 선택 시에만 표시) */}
        {hasMultipleSelected && (
          <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg shadow-lg border border-gray-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => alignLeft(selectedIds)}
                >
                  <AlignHorizontalJustifyStart className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>왼쪽 정렬</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => alignCenter(selectedIds)}
                >
                  <AlignHorizontalJustifyCenter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>가로 중앙 정렬</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => alignRight(selectedIds)}
                >
                  <AlignHorizontalJustifyEnd className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>오른쪽 정렬</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-gray-200 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => alignTop(selectedIds)}
                >
                  <AlignVerticalJustifyStart className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>위쪽 정렬</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => alignMiddle(selectedIds)}
                >
                  <AlignVerticalJustifyCenter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>세로 중앙 정렬</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => alignBottom(selectedIds)}
                >
                  <AlignVerticalJustifyEnd className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>아래쪽 정렬</TooltipContent>
            </Tooltip>

            {hasThreeOrMore && (
              <>
                <div className="w-px h-4 bg-gray-200 mx-1" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => distributeHorizontal(selectedIds)}
                    >
                      <AlignHorizontalSpaceAround className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>가로 균등 분배</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => distributeVertical(selectedIds)}
                    >
                      <AlignVerticalSpaceAround className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>세로 균등 분배</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        )}

        {/* 줌 컨트롤 */}
        <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-lg border border-gray-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut}>
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>축소 (Ctrl+-)</TooltipContent>
          </Tooltip>

          <div className="w-24">
            <Slider
              value={[zoom]}
              onValueChange={handleSliderChange}
              min={0.1}
              max={5}
              step={0.1}
              className="cursor-pointer"
            />
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>확대 (Ctrl++)</TooltipContent>
          </Tooltip>

          <span className="text-sm font-medium text-gray-600 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <div className="w-px h-4 bg-gray-200" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetView}>
                <Maximize className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>뷰 초기화 (Ctrl+0)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
