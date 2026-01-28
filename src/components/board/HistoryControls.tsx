'use client';

import { useBoardStore } from '@/stores/board-store';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Undo2, Redo2 } from 'lucide-react';

export function HistoryControls() {
  const { undo, redo, canUndo, canRedo } = useBoardStore();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 shadow-sm p-1">
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
          <TooltipContent>
            <span>실행 취소 (Ctrl+Z)</span>
          </TooltipContent>
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
          <TooltipContent>
            <span>다시 실행 (Ctrl+Shift+Z)</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
