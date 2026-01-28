'use client';

import { useState } from 'react';
import { useBoardStore, type BoardTool } from '@/stores/board-store';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MousePointer2,
  Type,
  Square,
  Circle,
  StickyNote,
  Image as ImageIcon,
  Video,
  Frame,
  Smartphone,
  Tablet,
  Monitor,
  FileText,
  Instagram,
  Triangle,
  ArrowRight,
  Star,
  Minus,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoardElement } from '@/types/board';

interface ToolConfig {
  id: BoardTool;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

// 프레임 템플릿
interface FrameTemplate {
  id: string;
  label: string;
  icon: React.ReactNode;
  width: number;
  height: number;
}

const frameTemplates: FrameTemplate[] = [
  { id: 'custom', label: '사용자 정의', icon: <Frame className="h-4 w-4" />, width: 400, height: 300 },
  { id: 'phone', label: 'Phone (375×667)', icon: <Smartphone className="h-4 w-4" />, width: 375, height: 667 },
  { id: 'phone-pro', label: 'Phone Pro (390×844)', icon: <Smartphone className="h-4 w-4" />, width: 390, height: 844 },
  { id: 'tablet', label: 'Tablet (768×1024)', icon: <Tablet className="h-4 w-4" />, width: 768, height: 1024 },
  { id: 'desktop', label: 'Desktop (1440×900)', icon: <Monitor className="h-4 w-4" />, width: 1440, height: 900 },
  { id: 'desktop-hd', label: 'Desktop HD (1920×1080)', icon: <Monitor className="h-4 w-4" />, width: 1920, height: 1080 },
  { id: 'a4', label: 'A4 (595×842)', icon: <FileText className="h-4 w-4" />, width: 595, height: 842 },
  { id: 'instagram-post', label: 'Instagram Post (1080×1080)', icon: <Instagram className="h-4 w-4" />, width: 1080, height: 1080 },
  { id: 'instagram-story', label: 'Instagram Story (1080×1920)', icon: <Instagram className="h-4 w-4" />, width: 1080, height: 1920 },
  { id: 'youtube-thumbnail', label: 'YouTube Thumbnail (1280×720)', icon: <Video className="h-4 w-4" />, width: 1280, height: 720 },
];

// 도형 템플릿
interface ShapeTemplate {
  id: string;
  label: string;
  icon: React.ReactNode;
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'star' | 'line';
}

const shapeTemplates: ShapeTemplate[] = [
  { id: 'rectangle', label: '사각형', icon: <Square className="h-4 w-4" />, shapeType: 'rectangle' },
  { id: 'circle', label: '원', icon: <Circle className="h-4 w-4" />, shapeType: 'circle' },
  { id: 'triangle', label: '삼각형', icon: <Triangle className="h-4 w-4" />, shapeType: 'triangle' },
  { id: 'arrow', label: '화살표', icon: <ArrowRight className="h-4 w-4" />, shapeType: 'arrow' },
  { id: 'star', label: '별', icon: <Star className="h-4 w-4" />, shapeType: 'star' },
  { id: 'line', label: '선', icon: <Minus className="h-4 w-4" />, shapeType: 'line' },
];

const basicTools: ToolConfig[] = [
  {
    id: 'select',
    icon: <MousePointer2 className="h-5 w-5" />,
    label: '선택',
    shortcut: 'V',
  },
  {
    id: 'text',
    icon: <Type className="h-5 w-5" />,
    label: '텍스트',
    shortcut: 'T',
  },
  {
    id: 'sticky',
    icon: <StickyNote className="h-5 w-5" />,
    label: '스티키 노트',
    shortcut: 'N',
  },
  {
    id: 'image',
    icon: <ImageIcon className="h-5 w-5" />,
    label: '이미지',
    shortcut: 'I',
  },
  {
    id: 'video',
    icon: <Video className="h-5 w-5" />,
    label: '영상',
    shortcut: '',
  },
];

interface BoardToolbarProps {
  onAddImage: () => void;
  onAddVideo: () => void;
}

export function BoardToolbar({ onAddImage, onAddVideo }: BoardToolbarProps) {
  const { currentTool, setTool, addElement, select, boardId, elements } = useBoardStore();
  const [selectedShape, setSelectedShape] = useState<string>('rectangle');

  const handleToolClick = (tool: BoardTool) => {
    if (tool === 'image') {
      onAddImage();
    } else if (tool === 'video') {
      onAddVideo();
    } else {
      setTool(tool);
    }
  };

  // 프레임 생성
  const handleCreateFrame = (template: FrameTemplate) => {
    const currentBoardId = boardId || 'temp-board';
    const newElement: BoardElement = {
      id: crypto.randomUUID(),
      board_id: currentBoardId,
      type: 'frame',
      position_x: 100 + Math.random() * 100,
      position_y: 100 + Math.random() * 100,
      width: template.width,
      height: template.height,
      rotation: 0,
      z_index: elements.length,
      locked: false,
      content: {
        children: [],
        frame_name: template.label,
      },
      style: {
        background_color: '#ffffff',
        border_color: '#e5e7eb',
        border_width: 1,
      },
      created_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addElement(newElement);
    select(newElement.id);
    setTool('select');
  };

  // 도형 생성
  const handleCreateShape = (template: ShapeTemplate) => {
    const currentBoardId = boardId || 'temp-board';
    const newElement: BoardElement = {
      id: crypto.randomUUID(),
      board_id: currentBoardId,
      type: 'shape',
      position_x: 100 + Math.random() * 200,
      position_y: 100 + Math.random() * 200,
      width: template.shapeType === 'line' ? 200 : 100,
      height: template.shapeType === 'line' ? 4 : 100,
      rotation: 0,
      z_index: elements.length,
      locked: false,
      content: {
        shape_type: template.shapeType,
      },
      style: {
        background_color: template.shapeType === 'line' ? '#1f2937' : '#e5e7eb',
        border_color: '#9ca3af',
        border_width: 2,
        border_radius: 0,
      },
      created_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addElement(newElement);
    select(newElement.id);
    setTool('select');
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-1 p-2 bg-white border-r border-gray-200">
        {/* 기본 도구 */}
        {basicTools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-10 w-10',
                  currentTool === tool.id && tool.id !== 'image' && tool.id !== 'video'
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                )}
                onClick={() => handleToolClick(tool.id)}
              >
                {tool.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="flex items-center gap-2">
                <span>{tool.label}</span>
                {tool.shortcut && (
                  <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">
                    {tool.shortcut}
                  </kbd>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="w-full h-px bg-gray-200 my-1" />

        {/* 도형 드롭다운 */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-10 w-10 relative',
                    (currentTool === 'rectangle' || currentTool === 'circle')
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Square className="h-5 w-5" />
                  <ChevronDown className="h-3 w-3 absolute bottom-1 right-1" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">도형</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" className="w-48">
            <DropdownMenuLabel>도형 추가</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {shapeTemplates.map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => handleCreateShape(template)}
                className="flex items-center gap-2"
              >
                {template.icon}
                <span>{template.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 프레임 드롭다운 */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-10 w-10 relative',
                    currentTool === 'frame'
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Frame className="h-5 w-5" />
                  <ChevronDown className="h-3 w-3 absolute bottom-1 right-1" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="flex items-center gap-2">
                <span>프레임</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">F</kbd>
              </div>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" className="w-56">
            <DropdownMenuLabel>프레임 템플릿</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {frameTemplates.map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => handleCreateFrame(template)}
                className="flex items-center gap-2"
              >
                {template.icon}
                <span className="flex-1">{template.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
