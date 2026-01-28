'use client';

import { useBoardStore, useSortedElements } from '@/stores/board-store';
import type { BoardElement } from '@/types/board';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Type,
  Square,
  Circle,
  StickyNote,
  Image as ImageIcon,
  Video,
  Frame,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Triangle,
  Star,
  Minus,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const getElementIcon = (type: string, shapeType?: string) => {
  if (type === 'shape' && shapeType) {
    switch (shapeType) {
      case 'circle':
        return <Circle className="h-4 w-4" />;
      case 'triangle':
        return <Triangle className="h-4 w-4" />;
      case 'star':
        return <Star className="h-4 w-4" />;
      case 'line':
        return <Minus className="h-4 w-4" />;
      case 'arrow':
        return <ArrowRight className="h-4 w-4" />;
      default:
        return <Square className="h-4 w-4" />;
    }
  }

  switch (type) {
    case 'text':
      return <Type className="h-4 w-4" />;
    case 'shape':
      return <Square className="h-4 w-4" />;
    case 'sticky':
      return <StickyNote className="h-4 w-4" />;
    case 'image':
      return <ImageIcon className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'frame':
      return <Frame className="h-4 w-4" />;
    default:
      return <Layers className="h-4 w-4" />;
  }
};

const getElementName = (element: BoardElement) => {
  switch (element.type) {
    case 'text':
      return element.content.text?.slice(0, 20) || '텍스트';
    case 'sticky':
      return element.content.text?.slice(0, 20) || '스티키 노트';
    case 'frame':
      return element.content.frame_name || '프레임';
    case 'image':
      return '이미지';
    case 'video':
      return '영상';
    case 'shape':
      const shapeType = element.content.shape_type;
      const shapeNames: Record<string, string> = {
        rectangle: '사각형',
        circle: '원',
        triangle: '삼각형',
        arrow: '화살표',
        star: '별',
        line: '선',
      };
      return shapeType ? shapeNames[shapeType] || '도형' : '도형';
    default:
      return '요소';
  }
};

export function LayersPanel() {
  const elements = useSortedElements();
  const {
    selectedIds,
    select,
    deleteElements,
    duplicateElements,
    updateElement,
    bringForward,
    sendBackward,
  } = useBoardStore();

  // 레이어 순서대로 (z_index 높은 것이 위에)
  const sortedElements = [...elements].sort((a, b) => b.z_index - a.z_index);

  if (elements.length === 0) {
    return (
      <div className="p-4 text-center">
        <Layers className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">레이어가 없습니다</p>
        <p className="text-xs text-gray-400 mt-1">
          캔버스에 요소를 추가해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">레이어</span>
        <span className="text-xs text-gray-400">{elements.length}개</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedElements.map((element) => {
            const isSelected = selectedIds.includes(element.id);
            const shapeType = element.content.shape_type as string | undefined;

            return (
              <div
                key={element.id}
                className={cn(
                  'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-primary-100 text-primary-700'
                    : 'hover:bg-gray-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  select(element.id, e.shiftKey || e.metaKey || e.ctrlKey);
                }}
              >
                {/* 아이콘 */}
                <span className="text-gray-500 shrink-0">
                  {getElementIcon(element.type, shapeType)}
                </span>

                {/* 이름 */}
                <span className="flex-1 text-sm truncate">
                  {getElementName(element)}
                </span>

                {/* 잠금 표시 */}
                {element.locked && (
                  <Lock className="h-3 w-3 text-gray-400 shrink-0" />
                )}

                {/* 액션 버튼 (호버 시 표시) */}
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateElement(element.id, { locked: !element.locked });
                    }}
                  >
                    {element.locked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      bringForward([element.id]);
                    }}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendBackward([element.id]);
                    }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateElements([element.id]);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteElements([element.id]);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
