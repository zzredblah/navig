'use client';

import { useBoardStore } from '@/stores/board-store';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
} from 'lucide-react';

export function AlignmentTools() {
  const {
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

  const hasMultipleSelected = selectedIds.length >= 2;
  const hasThreeOrMore = selectedIds.length >= 3;

  if (selectedIds.length < 2) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 shadow-sm p-1">
        {/* 수평 정렬 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => alignLeft(selectedIds)}
              disabled={!hasMultipleSelected}
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
              disabled={!hasMultipleSelected}
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
              disabled={!hasMultipleSelected}
            >
              <AlignHorizontalJustifyEnd className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>오른쪽 정렬</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* 수직 정렬 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => alignTop(selectedIds)}
              disabled={!hasMultipleSelected}
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
              disabled={!hasMultipleSelected}
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
              disabled={!hasMultipleSelected}
            >
              <AlignVerticalJustifyEnd className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>아래쪽 정렬</TooltipContent>
        </Tooltip>

        {hasThreeOrMore && (
          <>
            <div className="w-px h-4 bg-gray-200 mx-1" />

            {/* 분배 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => distributeHorizontal(selectedIds)}
                  disabled={!hasThreeOrMore}
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
                  disabled={!hasThreeOrMore}
                >
                  <AlignVerticalSpaceAround className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>세로 균등 분배</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
